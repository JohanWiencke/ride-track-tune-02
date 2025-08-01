import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Receipt analysis function called');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return new Response(JSON.stringify({ 
        error: 'Server configuration error' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
      console.error('Missing required parameters');
      return new Response(JSON.stringify({ 
        error: 'Missing receiptId or imageBase64' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Starting receipt analysis for receiptId:', receiptId);

    // Call OCR.Space API
    const formData = new FormData();
    formData.append('base64Image', `data:image/jpeg;base64,${imageBase64}`);
    formData.append('apikey', 'K81966610288957');
    formData.append('language', 'eng');

    const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData
    });

    if (!ocrResponse.ok) {
      const errorText = await ocrResponse.text();
      console.error('OCR.Space API error:', errorText);
      return new Response(JSON.stringify({ 
        error: `OCR API error: ${ocrResponse.status}` 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const ocrData = await ocrResponse.json();
    
    if (!ocrData.ParsedResults || ocrData.ParsedResults.length === 0) {
      console.error('No text detected from OCR');
      return new Response(JSON.stringify({ 
        error: 'No text detected in image' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const extractedText = ocrData.ParsedResults[0].ParsedText || '';
    console.log('Extracted text length:', extractedText.length);
    
    if (!extractedText) {
      return new Response(JSON.stringify({ 
        error: 'No text could be extracted from the image' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Simple bike parts detection
    const bikeKeywords = ['chain', 'tire', 'brake', 'wheel', 'pedal', 'gear', 'spoke', 'handlebar', 'saddle', 'cassette', 'derailleur'];
    const foundParts = [];
    
    const lines = extractedText.split('\n');
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      const hasBikePart = bikeKeywords.some(keyword => lowerLine.includes(keyword));
      
      if (hasBikePart) {
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
        error: 'Database update failed' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Add found parts to inventory if any
    if (foundParts.length > 0) {
      const { data: receipt } = await supabase
        .from('receipts')
        .select('user_id')
        .eq('id', receiptId)
        .single();

      if (receipt) {
        const { data: defaultType } = await supabase
          .from('component_types')
          .select('id')
          .eq('name', 'Other')
          .maybeSingle();

        if (defaultType) {
          const inventoryItems = foundParts.map(part => ({
            user_id: receipt.user_id,
            component_type_id: defaultType.id,
            quantity: part.quantity,
            purchase_price: part.price,
            notes: `Auto-added from receipt: ${part.name}`
          }));

          await supabase
            .from('parts_inventory')
            .insert(inventoryItems);
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