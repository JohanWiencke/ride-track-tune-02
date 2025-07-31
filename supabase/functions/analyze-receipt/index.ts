
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const googleApiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Bike parts keywords in multiple languages
const bikePartsKeywords = {
  en: ['chain', 'cassette', 'derailleur', 'brake', 'wheel', 'tire', 'handlebar', 'stem', 'saddle', 'pedal', 'crankset', 'chainring', 'shifter', 'cable', 'housing', 'tube', 'rim', 'spoke', 'hub', 'bearing', 'bottom bracket', 'headset', 'fork', 'frame', 'groupset', 'disc brake', 'rim brake', 'brake pad', 'rotor'],
  de: ['kette', 'kassette', 'schaltwerk', 'bremse', 'rad', 'reifen', 'lenker', 'vorbau', 'sattel', 'pedal', 'kurbel', 'kettenblatt', 'schalthebel', 'kabel', 'hülle', 'schlauch', 'felge', 'speiche', 'nabe', 'lager', 'tretlager', 'steuersatz', 'gabel', 'rahmen', 'schaltgruppe', 'scheibenbremse', 'felgenbremse', 'bremsbelag', 'bremsscheibe'],
  fr: ['chaîne', 'cassette', 'dérailleur', 'frein', 'roue', 'pneu', 'guidon', 'potence', 'selle', 'pédale', 'pédalier', 'plateau', 'manette', 'câble', 'gaine', 'chambre', 'jante', 'rayon', 'moyeu', 'roulement', 'boîtier', 'jeu de direction', 'fourche', 'cadre', 'groupe', 'frein à disque', 'frein sur jante', 'plaquette', 'disque'],
  it: ['catena', 'cassetta', 'deragliatore', 'freno', 'ruota', 'pneumatico', 'manubrio', 'attacco', 'sella', 'pedale', 'guarnitura', 'corona', 'leva', 'cavo', 'guaina', 'camera', 'cerchione', 'raggio', 'mozzo', 'cuscinetto', 'movimento centrale', 'serie sterzo', 'forcella', 'telaio', 'gruppo', 'freno a disco', 'freno a pattino', 'pasticca', 'disco']
};

function detectLanguage(text: string): string {
  const languages = ['de', 'fr', 'it', 'en'];
  const scores: { [key: string]: number } = {};
  
  for (const lang of languages) {
    scores[lang] = 0;
    const keywords = bikePartsKeywords[lang as keyof typeof bikePartsKeywords];
    for (const keyword of keywords) {
      if (text.toLowerCase().includes(keyword.toLowerCase())) {
        scores[lang]++;
      }
    }
  }
  
  const detectedLang = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
  return scores[detectedLang] > 0 ? detectedLang : 'en';
}

function extractBikeParts(text: string, language: string) {
  const lines = text.split('\n');
  const parts: Array<{name: string, price: number, quantity: number}> = [];
  const keywords = bikePartsKeywords[language as keyof typeof bikePartsKeywords];
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // Check if line contains bike part keywords
    const containsBikePart = keywords.some(keyword => 
      lowerLine.includes(keyword.toLowerCase())
    );
    
    if (containsBikePart) {
      // Extract price using regex
      const priceMatch = line.match(/(\d+[.,]\d{2}|\d+)/g);
      const quantityMatch = line.match(/(\d+)\s*x\s*|qty\s*:?\s*(\d+)|quantity\s*:?\s*(\d+)/i);
      
      if (priceMatch) {
        const price = parseFloat(priceMatch[priceMatch.length - 1].replace(',', '.'));
        const quantity = quantityMatch ? parseInt(quantityMatch[1] || quantityMatch[2] || quantityMatch[3]) : 1;
        
        // Clean up the part name
        let partName = line.replace(/(\d+[.,]\d{2}|\d+)/g, '').replace(/[€$£]/g, '').trim();
        partName = partName.replace(/^\d+\s*x?\s*/i, '').trim();
        
        if (partName && price > 0) {
          parts.push({
            name: partName,
            price: price,
            quantity: quantity
          });
        }
      }
    }
  }
  
  return parts;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { receiptId, imageBase64 } = await req.json();

    console.log('Starting receipt analysis for receiptId:', receiptId);

    if (!googleApiKey) {
      throw new Error('Google Cloud Vision API key not configured');
    }

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
      throw new Error(`Vision API error: ${visionResponse.status} - ${errorText}`);
    }

    const visionData = await visionResponse.json();
    
    if (!visionData.responses || !visionData.responses[0]) {
      throw new Error('No text detected in image');
    }

    const extractedText = visionData.responses[0].textAnnotations?.[0]?.description || '';
    console.log('Extracted text length:', extractedText.length);
    
    if (!extractedText) {
      throw new Error('No text could be extracted from the image');
    }

    // Detect language and extract bike parts
    const detectedLanguage = detectLanguage(extractedText);
    const extractedParts = extractBikeParts(extractedText, detectedLanguage);

    console.log('Detected language:', detectedLanguage);
    console.log('Extracted parts:', extractedParts.length);

    // Update receipt with analysis results
    const { error: updateError } = await supabase
      .from('receipts')
      .update({
        analysis_result: { text: extractedText },
        extracted_items: extractedParts,
        processing_status: 'completed',
        language_detected: detectedLanguage,
        analysis_status: 'completed'
      })
      .eq('id', receiptId);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw updateError;
    }

    // Add extracted parts to inventory if any found
    if (extractedParts.length > 0) {
      // Get receipt to find user_id
      const { data: receipt, error: receiptError } = await supabase
        .from('receipts')
        .select('user_id')
        .eq('id', receiptId)
        .single();

      if (receiptError) {
        console.error('Error fetching receipt:', receiptError);
        throw receiptError;
      }

      // Get default component type for unknown parts
      const { data: defaultType } = await supabase
        .from('component_types')
        .select('id')
        .eq('name', 'Other')
        .single();

      if (defaultType && extractedParts.length > 0) {
        // Add parts to inventory
        const inventoryItems = extractedParts.map(part => ({
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
          // Don't throw here, analysis was successful even if inventory update failed
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      extractedParts,
      detectedLanguage,
      extractedText: extractedText.substring(0, 500) + '...' // Truncate for response
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Receipt analysis error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
