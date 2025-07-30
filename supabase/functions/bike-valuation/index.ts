import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const serpApiKey = Deno.env.get('SERPAPI_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const { bikeId } = await req.json();
    
    // Get bike details
    const { data: bike, error: bikeError } = await supabase
      .from('bikes')
      .select('*')
      .eq('id', bikeId)
      .eq('user_id', user.id)
      .single();

    if (bikeError || !bike) {
      throw new Error('Bike not found');
    }

    console.log(`Valuating bike: ${bike.brand} ${bike.model} ${bike.year}`);

    // Search for similar bikes using SerpAPI
    const searchQuery = `${bike.brand} ${bike.model} ${bike.year} bike used price`.trim();
    
    const serpApiUrl = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(searchQuery)}&api_key=${serpApiKey}&num=10`;
    
    console.log(`Searching with query: ${searchQuery}`);
    
    const serpResponse = await fetch(serpApiUrl);
    const serpData = await serpResponse.json();
    
    console.log('SerpAPI response:', serpData);

    if (!serpData.shopping_results || serpData.shopping_results.length === 0) {
      // Try a broader search without year
      const broaderQuery = `${bike.brand} ${bike.model} bike used`.trim();
      const broaderUrl = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(broaderQuery)}&api_key=${serpApiKey}&num=10`;
      
      console.log(`Trying broader search: ${broaderQuery}`);
      
      const broaderResponse = await fetch(broaderUrl);
      const broaderData = await broaderResponse.json();
      
      if (!broaderData.shopping_results || broaderData.shopping_results.length === 0) {
        throw new Error('No market data found for this bike');
      }
      
      serpData.shopping_results = broaderData.shopping_results;
    }

    // Extract prices and calculate average
    const prices: number[] = [];
    const sources: string[] = [];
    
    serpData.shopping_results.forEach((result: any) => {
      if (result.price) {
        // Extract numeric value from price string
        const priceMatch = result.price.match(/[\d,]+\.?\d*/);
        if (priceMatch) {
          const price = parseFloat(priceMatch[0].replace(/,/g, ''));
          if (price > 100 && price < 50000) { // Reasonable bike price range
            prices.push(price);
            sources.push(result.source || 'Unknown');
          }
        }
      }
    });

    if (prices.length === 0) {
      throw new Error('No valid prices found in market data');
    }

    // Calculate average price, removing outliers
    prices.sort((a, b) => a - b);
    const q1Index = Math.floor(prices.length * 0.25);
    const q3Index = Math.floor(prices.length * 0.75);
    const filteredPrices = prices.slice(q1Index, q3Index + 1);
    
    const estimatedValue = filteredPrices.reduce((sum, price) => sum + price, 0) / filteredPrices.length;
    
    console.log(`Found ${prices.length} prices, filtered to ${filteredPrices.length}, estimated value: ${estimatedValue}`);

    // Update bike with estimated value
    const { error: updateError } = await supabase
      .from('bikes')
      .update({
        estimated_value: Math.round(estimatedValue),
        last_valuation_date: new Date().toISOString(),
        valuation_source: `Market analysis (${filteredPrices.length} listings)`
      })
      .eq('id', bikeId)
      .eq('user_id', user.id);

    if (updateError) {
      throw new Error(`Failed to update bike valuation: ${updateError.message}`);
    }

    return new Response(JSON.stringify({
      success: true,
      estimatedValue: Math.round(estimatedValue),
      pricesFound: prices.length,
      pricesUsed: filteredPrices.length,
      sources: [...new Set(sources)].slice(0, 3), // Top 3 unique sources
      lastValuationDate: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in bike-valuation function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});