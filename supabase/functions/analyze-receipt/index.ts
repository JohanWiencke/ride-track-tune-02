
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { receiptId, imageUrl } = await req.json();
    
    if (!receiptId || !imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing receiptId or imageUrl' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ocrApiKey = Deno.env.get('OCR_SPACE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Analyzing receipt:', receiptId);

    // Get receipt data
    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', receiptId)
      .single();

    if (receiptError || !receipt) {
      console.error('Receipt not found:', receiptError);
      return new Response(
        JSON.stringify({ error: 'Receipt not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Performing OCR analysis for:', imageUrl);

    // Perform OCR analysis using OCR.space API
    const ocrFormData = new FormData();
    ocrFormData.append('apikey', ocrApiKey);
    ocrFormData.append('url', imageUrl);
    ocrFormData.append('language', 'ger,fre,eng'); // Support German, French, English
    ocrFormData.append('detectOrientation', 'true');
    ocrFormData.append('scale', 'true');
    ocrFormData.append('OCREngine', '2'); // Use OCR Engine 2 for better accuracy

    const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: ocrFormData,
    });

    const ocrResult = await ocrResponse.json();

    if (!ocrResult.IsErroredOnProcessing && ocrResult.ParsedResults && ocrResult.ParsedResults.length > 0) {
      const extractedText = ocrResult.ParsedResults[0].ParsedText;
      console.log('OCR extracted text:', extractedText);

      // Parse the extracted text to identify items, prices, and store info
      const analysisResults = parseReceiptText(extractedText);
      
      // Calculate total amount
      const totalAmount = analysisResults.items.reduce((sum, item) => sum + item.total_price, 0);

      // Update receipt with analysis results
      const { error: updateError } = await supabase
        .from('receipts')
        .update({
          analysis_status: 'completed',
          analysis_result: analysisResults.items,
          total_amount: totalAmount || analysisResults.totalFromText,
          store_name: analysisResults.storeName,
          purchase_date: analysisResults.date || new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', receiptId);

      if (updateError) {
        console.error('Failed to update receipt:', updateError);
        throw updateError;
      }

      // Get component types to match against
      const { data: componentTypes, error: typesError } = await supabase
        .from('component_types')
        .select('*');

      if (typesError) {
        console.error('Failed to get component types:', typesError);
        throw typesError;
      }

      // Add items to inventory
      const inventoryItems = [];
      
      for (const item of analysisResults.items) {
        let componentTypeId = null;
        
        const itemNameLower = item.name.toLowerCase();
        const itemCategoryLower = item.category.toLowerCase();
        
        // Enhanced matching logic for various bike shop items
        for (const type of componentTypes || []) {
          const typeNameLower = type.name.toLowerCase();
          
          // Direct category matches
          if (typeNameLower.includes(itemCategoryLower) || 
              itemCategoryLower.includes(typeNameLower)) {
            componentTypeId = type.id;
            break;
          }
          
          // Specific item matching (multilingual)
          if (
            // Chain related
            (itemNameLower.includes('chain') || itemNameLower.includes('kette') || itemNameLower.includes('chaîne')) && 
            (typeNameLower.includes('chain') || typeNameLower.includes('kette')) ||
            
            // Brake related
            (itemNameLower.includes('brake') || itemNameLower.includes('bremse') || itemNameLower.includes('frein')) &&
            (typeNameLower.includes('brake') || typeNameLower.includes('bremse')) ||
            
            // Tire/tube related
            (itemNameLower.includes('tire') || itemNameLower.includes('tube') || itemNameLower.includes('reifen') || 
             itemNameLower.includes('schlauch') || itemNameLower.includes('pneu') || itemNameLower.includes('chambre')) &&
            (typeNameLower.includes('tire') || typeNameLower.includes('tube')) ||
            
            // Pedal related
            (itemNameLower.includes('pedal') || itemNameLower.includes('pédale')) &&
            (typeNameLower.includes('pedal')) ||
            
            // General component matching
            itemNameLower.includes(typeNameLower) || typeNameLower.includes(itemNameLower.split(' ')[0])
          ) {
            componentTypeId = type.id;
            break;
          }
        }

        // Fallback matching strategy
        if (!componentTypeId && componentTypes && componentTypes.length > 0) {
          // Skip shipping costs
          if (itemCategoryLower === 'shipping' || itemNameLower.includes('versand') || 
              itemNameLower.includes('shipping') || itemNameLower.includes('livraison')) {
            continue;
          }
          
          // Look for generic/accessories category
          const genericType = componentTypes.find(type => 
            type.name.toLowerCase().includes('accessories') ||
            type.name.toLowerCase().includes('parts') ||
            type.name.toLowerCase().includes('misc') ||
            type.name.toLowerCase().includes('general')
          );
          
          if (genericType) {
            componentTypeId = genericType.id;
          } else {
            // Use first available component type as fallback
            componentTypeId = componentTypes[0].id;
          }
        }

        if (componentTypeId) {
          inventoryItems.push({
            user_id: receipt.user_id,
            component_type_id: componentTypeId,
            quantity: item.quantity,
            purchase_price: item.unit_price,
            receipt_id: receiptId,
            notes: `Auto-added from receipt: ${item.name} (${item.category})`
          });
        }
      }

      // Insert inventory items
      if (inventoryItems.length > 0) {
        const { error: inventoryError } = await supabase
          .from('parts_inventory')
          .insert(inventoryItems);

        if (inventoryError) {
          console.error('Failed to add inventory items:', inventoryError);
          // Don't throw error, as the receipt was analyzed successfully
        } else {
          console.log(`Added ${inventoryItems.length} items to inventory`);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          itemsAdded: inventoryItems.length,
          totalAmount: totalAmount || analysisResults.totalFromText,
          storeName: analysisResults.storeName,
          itemsFound: analysisResults.items.length,
          ocrText: extractedText.substring(0, 200) + '...' // First 200 chars for debugging
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } else {
      console.error('OCR failed:', ocrResult);
      throw new Error('OCR analysis failed: ' + (ocrResult.ErrorMessage || 'Unknown error'));
    }

  } catch (error) {
    console.error('Receipt analysis error:', error);
    
    // Try to update receipt status to failed
    try {
      const requestBody = await req.clone().json();
      if (requestBody.receiptId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        await supabase
          .from('receipts')
          .update({ 
            analysis_status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', requestBody.receiptId);
      }
    } catch (updateError) {
      console.error('Failed to update receipt status:', updateError);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function parseReceiptText(text: string) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const items = [];
  let storeName = '';
  let totalFromText = 0;
  let date = '';

  // Common bike shop patterns (multilingual)
  const bikeShopKeywords = [
    'bike', 'rad', 'vélo', 'cycle', 'fahrrad', 'bicycle',
    'chain', 'kette', 'chaîne', 'tire', 'reifen', 'pneu',
    'brake', 'bremse', 'frein', 'pedal', 'pédale',
    'tube', 'schlauch', 'chambre', 'saddle', 'sattel', 'selle'
  ];

  // Price patterns (supports €, $, and various formats)
  const pricePattern = /([€$£]?\s*\d+[.,]\d{2}|\d+[.,]\d{2}\s*[€$£])/g;
  const quantityPattern = /(\d+)\s*x\s*/i;

  // Try to find store name (usually in first few lines)
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    if (line.length > 3 && !pricePattern.test(line) && 
        (line.includes('GmbH') || line.includes('Ltd') || line.includes('Inc') || 
         bikeShopKeywords.some(keyword => line.toLowerCase().includes(keyword)))) {
      storeName = line;
      break;
    }
  }

  // Try to find date
  const datePattern = /(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/;
  for (const line of lines) {
    const dateMatch = line.match(datePattern);
    if (dateMatch) {
      date = dateMatch[1];
      // Convert to ISO format
      const parts = date.split(/[./-]/);
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        let year = parts[2];
        if (year.length === 2) {
          year = '20' + year;
        }
        date = `${year}-${month}-${day}`;
      }
      break;
    }
  }

  // Parse items and prices
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip header lines, totals, tax lines
    if (line.toLowerCase().includes('total') || 
        line.toLowerCase().includes('summe') || 
        line.toLowerCase().includes('mwst') ||
        line.toLowerCase().includes('tax') ||
        line.toLowerCase().includes('tva') ||
        line.toLowerCase().includes('subtotal') ||
        line.length < 3) {
      
      // Try to extract total amount
      if (line.toLowerCase().includes('total') || line.toLowerCase().includes('summe')) {
        const totalMatch = line.match(pricePattern);
        if (totalMatch) {
          const totalStr = totalMatch[totalMatch.length - 1].replace(/[€$£,]/g, '').replace(',', '.');
          totalFromText = parseFloat(totalStr) || 0;
        }
      }
      continue;
    }

    // Look for bike-related items
    const lowerLine = line.toLowerCase();
    const isBikeRelated = bikeShopKeywords.some(keyword => lowerLine.includes(keyword));
    
    if (isBikeRelated || pricePattern.test(line)) {
      const prices = line.match(pricePattern);
      if (prices && prices.length > 0) {
        // Extract quantity
        const quantityMatch = line.match(quantityPattern);
        const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;
        
        // Extract price (last price found is usually the total)
        const priceStr = prices[prices.length - 1].replace(/[€$£,]/g, '').replace(',', '.');
        const totalPrice = parseFloat(priceStr) || 0;
        const unitPrice = quantity > 0 ? totalPrice / quantity : totalPrice;

        // Extract item name (remove price and quantity info)
        let itemName = line.replace(pricePattern, '').replace(quantityPattern, '').trim();
        if (itemName.length < 3) {
          itemName = 'Bike Part'; // Fallback name
        }

        // Determine category based on keywords
        let category = 'accessories';
        if (lowerLine.includes('chain') || lowerLine.includes('kette') || lowerLine.includes('chaîne')) {
          category = 'drivetrain';
        } else if (lowerLine.includes('brake') || lowerLine.includes('bremse') || lowerLine.includes('frein')) {
          category = 'brakes';
        } else if (lowerLine.includes('tire') || lowerLine.includes('reifen') || lowerLine.includes('pneu')) {
          category = 'tires';
        } else if (lowerLine.includes('tube') || lowerLine.includes('schlauch') || lowerLine.includes('chambre')) {
          category = 'tubes';
        } else if (lowerLine.includes('pedal') || lowerLine.includes('pédale')) {
          category = 'pedals';
        } else if (lowerLine.includes('light') || lowerLine.includes('licht') || lowerLine.includes('éclairage')) {
          category = 'lighting';
        }

        items.push({
          name: itemName,
          quantity: quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
          category: category
        });
      }
    }
  }

  // If no items found, try to extract any line with prices as potential items
  if (items.length === 0) {
    for (const line of lines) {
      const prices = line.match(pricePattern);
      if (prices && line.length > 5 && 
          !line.toLowerCase().includes('total') && 
          !line.toLowerCase().includes('summe') &&
          !line.toLowerCase().includes('tax')) {
        
        const priceStr = prices[prices.length - 1].replace(/[€$£,]/g, '').replace(',', '.');
        const price = parseFloat(priceStr) || 0;
        
        let itemName = line.replace(pricePattern, '').trim();
        if (itemName.length < 2) {
          itemName = 'Item';
        }

        items.push({
          name: itemName,
          quantity: 1,
          unit_price: price,
          total_price: price,
          category: 'accessories'
        });
      }
    }
  }

  return {
    items: items,
    storeName: storeName || 'Bike Shop',
    date: date,
    totalFromText: totalFromText
  };
}
