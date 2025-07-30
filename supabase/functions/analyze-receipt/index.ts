
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

    // For now, we'll simulate receipt analysis
    // In a real implementation, you would use an OCR service like Google Vision API, AWS Textract, or Azure Form Recognizer
    console.log('Simulating receipt analysis for:', imageUrl);

    // Simulate analysis delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock analysis result - in reality this would come from OCR analysis
    const mockAnalysisResult = [
      {
        name: "Chain KMC X11",
        quantity: 1,
        unit_price: 25.99,
        total_price: 25.99,
        category: "drivetrain"
      },
      {
        name: "Brake Pads Shimano",
        quantity: 2,
        unit_price: 15.50,
        total_price: 31.00,
        category: "brakes"
      }
    ];

    const totalAmount = mockAnalysisResult.reduce((sum, item) => sum + item.total_price, 0);
    const storeName = "Bike Components Store"; // This would be extracted from OCR
    const purchaseDate = new Date().toISOString().split('T')[0]; // This would be extracted from OCR

    // Update receipt with analysis results
    const { error: updateError } = await supabase
      .from('receipts')
      .update({
        analysis_status: 'completed',
        analysis_result: mockAnalysisResult,
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

    // Add items to inventory
    const inventoryItems = [];
    
    for (const item of mockAnalysisResult) {
      // Try to match component type (simplified matching)
      let componentTypeId = null;
      
      for (const type of componentTypes || []) {
        if (item.name.toLowerCase().includes(type.name.toLowerCase()) ||
            type.name.toLowerCase().includes(item.category.toLowerCase())) {
          componentTypeId = type.id;
          break;
        }
      }

      // If no match found, use a default component type or skip
      if (!componentTypeId && componentTypes && componentTypes.length > 0) {
        // Use the first component type as fallback
        componentTypeId = componentTypes[0].id;
      }

      if (componentTypeId) {
        inventoryItems.push({
          user_id: receipt.user_id,
          component_type_id: componentTypeId,
          quantity: item.quantity,
          purchase_price: item.unit_price,
          receipt_id: receiptId,
          notes: `Auto-added from receipt: ${item.name}`
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
        storeName: storeName
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Receipt analysis error:', error);
    
    // Try to update receipt status to failed
    if (req.json && (await req.json()).receiptId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase
        .from('receipts')
        .update({ 
          analysis_status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', (await req.json()).receiptId);
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
