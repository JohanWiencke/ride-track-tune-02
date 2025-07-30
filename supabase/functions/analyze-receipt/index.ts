
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

    console.log('Simulating multilingual receipt analysis for:', imageUrl);

    // Simulate analysis delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Enhanced realistic multilingual analysis results - covers wider range of bike shop items
    const mockAnalysisResults = [
      // Bike accessories & components (English)
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
      {
        name: "Road Bike Pedals",
        quantity: 1,
        unit_price: 89.99,
        total_price: 89.99,
        category: "pedals"
      },
      {
        name: "Bike Computer Mount",
        quantity: 1,
        unit_price: 24.50,
        total_price: 24.50,
        category: "accessories"
      },
      {
        name: "Carbon Fiber Bottle Cage",
        quantity: 2,
        unit_price: 35.00,
        total_price: 70.00,
        category: "accessories"
      },
      
      // German items (realistic bike shop items)
      {
        name: "Fahrradschlauch 28\"",
        quantity: 2,
        unit_price: 6.99,
        total_price: 13.98,
        category: "tubes"
      },
      {
        name: "Dachgepäckträger für Fahrrad",
        quantity: 1,
        unit_price: 239.99,
        total_price: 239.99,
        category: "carriers"
      },
      {
        name: "Shimano Schaltwerk",
        quantity: 1,
        unit_price: 156.00,
        total_price: 156.00,
        category: "drivetrain"
      },
      {
        name: "Bremsbeläge Disc",
        quantity: 1,
        unit_price: 19.90,
        total_price: 19.90,
        category: "brakes"
      },
      {
        name: "Versandkosten",
        quantity: 1,
        unit_price: 4.99,
        total_price: 4.99,
        category: "shipping"
      },
      
      // French items
      {
        name: "Éclairage LED avant",
        quantity: 1,
        unit_price: 45.99,
        total_price: 45.99,
        category: "lighting"
      },
      {
        name: "Pédales automatiques",
        quantity: 1,
        unit_price: 125.00,
        total_price: 125.00,
        category: "pedals"
      },
      {
        name: "Casque de vélo",
        quantity: 1,
        unit_price: 89.90,
        total_price: 89.90,
        category: "safety"
      },
      {
        name: "Chambre à air",
        quantity: 3,
        unit_price: 5.50,
        total_price: 16.50,
        category: "tubes"
      },
      {
        name: "Porte-bidon carbone",
        quantity: 1,
        unit_price: 28.00,
        total_price: 28.00,
        category: "accessories"
      },
      
      // Mixed language items (common in European bike shops)
      {
        name: "Thule TopRide Dachträger",
        quantity: 1,
        unit_price: 239.99,
        total_price: 239.99,
        category: "carriers"
      },
      {
        name: "LOOK Kéo Classic Pedale",
        quantity: 1,
        unit_price: 62.99,
        total_price: 62.99,
        category: "pedals"
      },
      {
        name: "Garmin Edge Mount / Support",
        quantity: 1,
        unit_price: 19.99,
        total_price: 19.99,
        category: "accessories"
      }
    ];

    // Randomly select 2-5 items to simulate realistic receipt content
    const numItems = Math.floor(Math.random() * 4) + 2; // 2-5 items
    const selectedItems = mockAnalysisResults
      .sort(() => 0.5 - Math.random())
      .slice(0, numItems);

    const totalAmount = selectedItems.reduce((sum, item) => sum + item.total_price, 0);
    
    // More realistic store names from actual European bike retailers
    const storeNames = [
      "Bike24 GmbH", // German
      "Chain Reaction Cycles", // English
      "Wiggle Sport", // English
      "Rose Bikes", // German
      "Probikeshop", // French
      "Alltricks", // French
      "Fahrrad XXL", // German
      "Decathlon Cycle", // Multi-language
      "Canyon Bicycles", // German
      "Vélo Vert Shop", // French
      "Bikeinn Store", // Multi-language
      "Bike Components Store" // English
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

    // Enhanced inventory matching with broader category support
    const inventoryItems = [];
    
    for (const item of selectedItems) {
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
        totalAmount: totalAmount,
        storeName: storeName,
        itemsFound: selectedItems.length,
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
