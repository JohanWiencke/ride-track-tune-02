
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const googleApiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY');

    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasGoogleKey: !!googleApiKey
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return new Response(JSON.stringify({ 
        error: 'Server configuration error: Missing Supabase credentials' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!googleApiKey) {
      console.error('Missing Google Cloud Vision API key');
      return new Response(JSON.stringify({ 
        error: 'Server configuration error: Missing Google Cloud Vision API key' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Invalid request body' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { receiptId, imageBase64 } = requestBody;

    if (!receiptId || !imageBase64) {
      console.error('Missing required parameters:', { hasReceiptId: !!receiptId, hasImageBase64: !!imageBase64 });
      return new Response(JSON.stringify({ 
        error: 'Missing receiptId or imageBase64' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Starting receipt analysis for receiptId:', receiptId);

    // Call Google Cloud Vision API
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            image: {
              content: imageBase64
            },
            features: [{
              type: 'TEXT_DETECTION'
            }]
          }]
        })
      }
    );

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error('Vision API error:', errorText);
      return new Response(JSON.stringify({ 
        error: `Vision API error: ${visionResponse.status} - ${errorText}` 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const visionData = await visionResponse.json();
    
    if (!visionData.responses || !visionData.responses[0]) {
      console.error('No response from Vision API');
      return new Response(JSON.stringify({ 
        error: 'No text detected in image' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const extractedText = visionData.responses[0].textAnnotations?.[0]?.description || '';
    console.log('Extracted text length:', extractedText.length);
    
    if (!extractedText) {
      console.log('No text could be extracted from the image');
      return new Response(JSON.stringify({ 
        error: 'No text could be extracted from the image' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Simple bike parts detection (basic keywords)
    const bikeKeywords = ['chain', 'tire', 'brake', 'wheel', 'pedal', 'gear', 'spoke', 'handlebar', 'saddle'];
    const foundParts = [];
    
    const lines = extractedText.split('\n');
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      const hasBikePart = bikeKeywords.some(keyword => lowerLine.includes(keyword));
      
      if (hasBikePart) {
        // Extract price from line
        const priceMatch = line.match(/(\d+[.,]\d{2}|\d+)/g);
        if (priceMatch) {
          const price = parseFloat(priceMatch[priceMatch.length - 1].replace(',', '.'));
          const partName = line.replace(/(\d+[.,]\d{2}|\d+)/g, '').replace(/[€$£]/g, '').trim();
          
          if (partName && price > 0) {
            foundParts.push({
              name: partName,
              price: price,
              quantity: 1
            });
          }
        }
      }
    }

    console.log('Found parts:', foundParts);

    // Update receipt with analysis results
    const { error: updateError } = await supabase
      .from('receipts')
      .update({
        analysis_result: { text: extractedText },
        extracted_items: foundParts,
        processing_status: 'completed',
        analysis_status: 'completed'
      })
      .eq('id', receiptId);

    if (updateError) {
      console.error('Database update error:', updateError);
      return new Response(JSON.stringify({ 
        error: `Database update failed: ${updateError.message}` 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Add found parts to inventory if any
    if (foundParts.length > 0) {
      // Get receipt to find user_id
      const { data: receipt, error: receiptError } = await supabase
        .from('receipts')
        .select('user_id')
        .eq('id', receiptId)
        .single();

      if (receiptError) {
        console.error('Error fetching receipt:', receiptError);
        // Don't fail here, analysis was successful
      } else {
        // Get default component type
        const { data: defaultType } = await supabase
          .from('component_types')
          .select('id')
          .eq('name', 'Other')
          .single();

        if (defaultType) {
          const inventoryItems = foundParts.map(part => ({
            user_id: receipt.user_id,
            component_type_id: defaultType.id,
            quantity: part.quantity,
            purchase_price: part.price,
            notes: `Auto-added from receipt: ${part.name}`
          }));

          const { error: inventoryError } = await supabase
            .from('parts_inventory')
            .insert(inventoryItems);

          if (inventoryError) {
            console.error('Error adding to inventory:', inventoryError);
            // Don't fail here, analysis was successful
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      extractedParts: foundParts,
      extractedText: extractedText.substring(0, 500) + (extractedText.length > 500 ? '...' : '')
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Receipt analysis error:', error);
    return new Response(JSON.stringify({ 
      error: `Unexpected error: ${error.message}` 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
