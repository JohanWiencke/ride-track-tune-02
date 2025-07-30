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

    const requestBody = await req.json();
    const { bikeId, skipRateLimit, batchComplete, totalEstimatedValue, totalBikesValued } = requestBody;

    // Rate limiting disabled per user request
    console.log('Rate limiting disabled - proceeding with valuation');
    
    // Get bike details including purchase date and mileage
    const { data: bike, error: bikeError } = await supabase
      .from('bikes')
      .select('*, total_distance, purchase_date')
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
    
    let baseEstimatedValue = filteredPrices.reduce((sum, price) => sum + price, 0) / filteredPrices.length;
    
    // Apply depreciation based on age and mileage
    let ageDepreciation = 1.0;
    let mileageDepreciation = 1.0;
    
    // Calculate age-based depreciation if purchase date is available
    if (bike.purchase_date) {
      const purchaseDate = new Date(bike.purchase_date);
      const now = new Date();
      const ageInYears = (now.getTime() - purchaseDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      
      // Bikes depreciate approximately 15-20% per year for first 3 years, then slower
      if (ageInYears <= 3) {
        ageDepreciation = Math.max(0.3, 1 - (ageInYears * 0.18)); // 18% per year, minimum 30% of original
      } else {
        ageDepreciation = Math.max(0.2, 0.46 - ((ageInYears - 3) * 0.08)); // 8% per year after 3 years, minimum 20%
      }
      
      console.log(`Age depreciation: ${ageInYears.toFixed(1)} years, factor: ${ageDepreciation.toFixed(2)}`);
    }
    
    // Calculate mileage-based depreciation if total distance is available
    if (bike.total_distance && bike.total_distance > 0) {
      const distanceInKm = bike.total_distance;
      
      // High-mileage bikes depreciate more (above 15,000km per year is high usage)
      const expectedAnnualKm = 8000; // Average cycling distance per year
      const ageInYears = bike.purchase_date ? 
        (new Date().getTime() - new Date(bike.purchase_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000) : 
        3; // Default to 3 years if no purchase date
      
      const expectedDistance = expectedAnnualKm * Math.max(1, ageInYears);
      const mileageRatio = distanceInKm / expectedDistance;
      
      if (mileageRatio > 1.5) {
        mileageDepreciation = Math.max(0.7, 1 - ((mileageRatio - 1) * 0.2)); // High mileage penalty
      } else if (mileageRatio < 0.5) {
        mileageDepreciation = Math.min(1.1, 1 + ((0.5 - mileageRatio) * 0.1)); // Low mileage bonus
      }
      
      console.log(`Mileage: ${distanceInKm}km, expected: ${expectedDistance.toFixed(0)}km, factor: ${mileageDepreciation.toFixed(2)}`);
    }
    
    const estimatedValue = baseEstimatedValue * ageDepreciation * mileageDepreciation;
    
    console.log(`Base value: €${baseEstimatedValue.toFixed(0)}, Age factor: ${ageDepreciation.toFixed(2)}, Mileage factor: ${mileageDepreciation.toFixed(2)}, Final: €${estimatedValue.toFixed(0)}`);
    console.log(`Found ${prices.length} prices, filtered to ${filteredPrices.length}`);

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

    // If this is a batch valuation completion, save to history
    if (batchComplete) {
      const { error: historyError } = await supabase
        .from('valuation_history')
        .insert({
          user_id: user.id,
          total_estimated_value: totalEstimatedValue,
          total_bikes_valued: totalBikesValued
        });

      if (historyError) {
        console.error('Error saving valuation history:', historyError);
      }
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