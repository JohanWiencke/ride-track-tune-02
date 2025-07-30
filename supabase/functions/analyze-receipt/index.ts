
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

    // For now, we'll simulate multilingual receipt analysis
    // In a real implementation, you would use an OCR service like Google Vision API, AWS Textract, or Azure Form Recognizer
    console.log('Simulating multilingual receipt analysis for:', imageUrl);

    // Simulate analysis delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock multilingual analysis result - simulates OCR that can understand German, French, and English
    // This would be replaced with actual OCR results in a real implementation
    const mockAnalysisResults = [
      // English items
      {
        name: "Bike Chain Lubricant",
        quantity: 1,
        unit_price: 12.99,
        total_price: 12.99,
        category: "maintenance"
      },
      {
        name: "Tire Repair Kit",
        quantity: 2,
        unit_price: 8.50,
        total_price: 17.00,
        category: "accessories"
      },
      // German items
      {
        name: "Fahrradschlauch 28\"",
        quantity: 1,
        unit_price: 6.99,
        total_price: 6.99,
        category: "tubes"
      },
      // French items
      {
        name: "Éclairage LED avant",
        quantity: 1,
        unit_price: 24.99,
        total_price: 24.99,
        category: "lighting"
      },
      // Mixed language items
      {
        name: "Casque de vélo / Bike Helmet",
        quantity: 1,
        unit_price: 45.00,
        total_price: 45.00,
        category: "safety"
      }
    ];

    // Randomly select 2-4 items to simulate realistic receipt content
    const numItems = Math.floor(Math.random() * 3) + 2; // 2-4 items
    const selectedItems = mockAnalysisResults
      .sort(() => 0.5 - Math.random())
      .slice(0, numItems);

    const totalAmount = selectedItems.reduce((sum, item) => sum + item.total_price, 0);
    
    // Mock store names in different languages
    const storeNames = [
      "Bike Components Store", // English
      "Fahrradladen München", // German
      "Vélo Shop Paris", // French
      "Cycle Center", // English
      "Fahrrad Werkstatt", // German
      "Magasin de Vélos" // French
    ];
    const storeName = storeNames[Math.floor(Math.random() * storeNames.length)];
    const purchaseDate = new Date().toISOString().split('T')[0];

    // Update receipt with analysis results
    const { error: updateError } = await supabase
      .from('receipts')
      .update({
        analysis_status: 'completed',
        analysis_result: selectedItems,
        total_amount: totalAmount,
        store_name: storeName,
        purchase_date: purchaseDate,
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

    // Add items to inventory with improved matching logic
    const inventoryItems = [];
    
    for (const item of selectedItems) {
      // Try to match component type with multilingual support
      let componentTypeId = null;
      
      // Enhanced matching that considers multiple languages and broader item types
      const itemNameLower = item.name.toLowerCase();
      const itemCategoryLower = item.category.toLowerCase();
      
      for (const type of componentTypes || []) {
        const typeNameLower = type.name.toLowerCase();
        
        // Check for direct matches in any language
        if (itemNameLower.includes(typeNameLower) || 
            typeNameLower.includes(itemCategoryLower) ||
            // German matches
            (itemNameLower.includes('kette') && typeNameLower.includes('chain')) ||
            (itemNameLower.includes('bremse') && typeNameLower.includes('brake')) ||
            (itemNameLower.includes('reifen') && typeNameLower.includes('tire')) ||
            (itemNameLower.includes('schlauch') && typeNameLower.includes('tube')) ||
            // French matches
            (itemNameLower.includes('chaîne') && typeNameLower.includes('chain')) ||
            (itemNameLower.includes('frein') && typeNameLower.includes('brake')) ||
            (itemNameLower.includes('pneu') && typeNameLower.includes('tire')) ||
            (itemNameLower.includes('chambre') && typeNameLower.includes('tube')) ||
            // Generic category matches
            itemCategoryLower === typeNameLower) {
          componentTypeId = type.id;
          break;
        }
      }

      // If no specific match found, try to find a general category or use the first available type
      if (!componentTypeId && componentTypes && componentTypes.length > 0) {
        // Look for generic matches
        const generalType = componentTypes.find(type => 
          type.name.toLowerCase().includes('accessories') ||
          type.name.toLowerCase().includes('parts') ||
          type.name.toLowerCase().includes('misc')
        );
        
        if (generalType) {
          componentTypeId = generalType.id;
        } else {
          // Use the first component type as fallback
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
        totalAmount: totalAmount,
        storeName: storeName,
        language: 'multilingual'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

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
