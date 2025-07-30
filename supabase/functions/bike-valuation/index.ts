
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
    const { bikeId, batchComplete, totalEstimatedValue, totalBikesValued } = requestBody;

    // Check rate limiting - 2 times per week (every 3.5 days)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 3.5);

    const { data: recentValuations, error: rateLimitError } = await supabase
      .from('valuation_history')
      .select('created_at')
      .eq('user_id', user.id)
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
    }

    if (recentValuations && recentValuations.length > 0) {
      const lastValuation = new Date(recentValuations[0].created_at);
      const now = new Date();
      const hoursSinceLastValuation = (now.getTime() - lastValuation.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastValuation < 84) { // Less than 84 hours (3.5 days)
        throw new Error('Rate limit exceeded. You can only valuate your garage twice per week.');
      }
    }

    // Get bike details including purchase date, mileage, and component details
    const { data: bike, error: bikeError } = await supabase
      .from('bikes')
      .select('*, total_distance, purchase_date, component_details')
      .eq('id', bikeId)
      .eq('user_id', user.id)
      .single();

    if (bikeError || !bike) {
      throw new Error('Bike not found');
    }

    console.log(`Valuating bike: ${bike.brand} ${bike.model} ${bike.year}`);
    console.log(`Component details: ${bike.component_details || 'None specified'}`);
    console.log(`Mileage: ${bike.total_distance || 0}km, Purchase date: ${bike.purchase_date || 'Not specified'}`);

    // Build search query targeting specific bike marketplaces
    let searchQuery = `${bike.brand || ''} ${bike.model || ''} ${bike.year || ''} bike used price site:kleinanzeigen.de OR site:ebay.de OR site:buycycle.com OR site:bikeflip.de`.trim();
    if (bike.component_details) {
      searchQuery += ` ${bike.component_details}`;
    }
    
    // Use regular Google search instead of Google Shopping
    const serpApiUrl = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(searchQuery)}&api_key=${serpApiKey}&num=20`;
    
    console.log(`Searching with query: ${searchQuery}`);
    
    const serpResponse = await fetch(serpApiUrl);
    const serpData = await serpResponse.json();
    
    console.log('SerpAPI response:', serpData);

    if (!serpData.organic_results || serpData.organic_results.length === 0) {
      // Try a broader search with bike marketplaces
      const broaderQuery = `${bike.brand} ${bike.model} bike used site:kleinanzeigen.de OR site:ebay.de OR site:buycycle.com OR site:bikeflip.de`.trim();
      const broaderUrl = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(broaderQuery)}&api_key=${serpApiKey}&num=20`;
      
      console.log(`Trying broader search: ${broaderQuery}`);
      
      const broaderResponse = await fetch(broaderUrl);
      const broaderData = await broaderResponse.json();
      
      if (!broaderData.organic_results || broaderData.organic_results.length === 0) {
        // Final fallback without site restrictions
        const fallbackQuery = `${bike.brand} ${bike.model} bike used price`.trim();
        const fallbackUrl = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(fallbackQuery)}&api_key=${serpApiKey}&num=15`;
        
        console.log(`Trying fallback search: ${fallbackQuery}`);
        
        const fallbackResponse = await fetch(fallbackUrl);
        const fallbackData = await fallbackResponse.json();
        
        if (!fallbackData.organic_results || fallbackData.organic_results.length === 0) {
          throw new Error('No market data found for this bike');
        }
        
        serpData.organic_results = fallbackData.organic_results;
      } else {
        serpData.organic_results = broaderData.organic_results;
      }
    }

    // Extract prices from organic search results
    const prices: number[] = [];
    const sources: string[] = [];
    
    serpData.organic_results.forEach((result: any) => {
      // Look for prices in the title, snippet, or displayed URL
      const textToSearch = `${result.title || ''} ${result.snippet || ''} ${result.displayed_link || ''}`;
      
      // Common price patterns in German and English
      const pricePatterns = [
        /€\s?(\d{1,3}(?:[\.,]\d{3})*(?:[\.,]\d{2})?)/g,
        /(\d{1,3}(?:[\.,]\d{3})*(?:[\.,]\d{2})?)\s?€/g,
        /(\d{1,3}(?:[\.,]\d{3})*(?:[\.,]\d{2})?)\s?EUR/g,
        /Preis:\s?€?\s?(\d{1,3}(?:[\.,]\d{3})*(?:[\.,]\d{2})?)/g,
        /Price:\s?€?\s?(\d{1,3}(?:[\.,]\d{3})*(?:[\.,]\d{2})?)/g
      ];
      
      pricePatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(textToSearch)) !== null) {
          const priceStr = match[1];
          // Convert German number format to standard format
          const price = parseFloat(priceStr.replace(/\./g, '').replace(',', '.'));
          
          if (price > 100 && price < 50000) { // Reasonable bike price range
            prices.push(price);
            sources.push(result.source || result.displayed_link || 'Unknown');
          }
        }
      });
    });

    if (prices.length === 0) {
      throw new Error('No valid prices found in market data');
    }

    console.log(`Found ${prices.length} prices: ${prices.join(', ')}`);

    // Calculate average price, removing outliers
    prices.sort((a, b) => a - b);
    const q1Index = Math.floor(prices.length * 0.25);
    const q3Index = Math.floor(prices.length * 0.75);
    const filteredPrices = prices.slice(q1Index, q3Index + 1);
    
    let baseEstimatedValue = filteredPrices.reduce((sum, price) => sum + price, 0) / filteredPrices.length;
    
    // Apply depreciation based on age, mileage, and component quality
    let ageDepreciation = 1.0;
    let mileageDepreciation = 1.0;
    let componentAdjustment = 1.0;
    
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
    
    // Calculate component quality adjustment
    if (bike.component_details) {
      const details = bike.component_details.toLowerCase();
      const premiumKeywords = ['ultegra', 'dura-ace', 'sram red', 'di2', 'electronic', 'carbon', 'lightweight', 'pro', 'race', 'premium'];
      const budgetKeywords = ['tourney', 'altus', 'acera', 'basic', 'entry', 'budget', 'steel', 'heavy'];
      
      const premiumCount = premiumKeywords.reduce((count, keyword) => details.includes(keyword) ? count + 1 : count, 0);
      const budgetCount = budgetKeywords.reduce((count, keyword) => details.includes(keyword) ? count + 1 : count, 0);
      
      if (premiumCount > budgetCount) {
        componentAdjustment = Math.min(1.3, 1 + (premiumCount * 0.1)); // Up to 30% bonus for premium components
      } else if (budgetCount > premiumCount) {
        componentAdjustment = Math.max(0.8, 1 - (budgetCount * 0.05)); // Up to 20% penalty for budget components
      }
      
      console.log(`Component adjustment: Premium keywords: ${premiumCount}, Budget keywords: ${budgetCount}, factor: ${componentAdjustment.toFixed(2)}`);
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
    
    let estimatedValue = baseEstimatedValue * ageDepreciation * mileageDepreciation * componentAdjustment;
    
    // Cap the estimated value at the purchase price (bikes can't be worth more than what you paid)
    if (bike.price && estimatedValue > bike.price) {
      estimatedValue = bike.price;
      console.log(`Capped estimated value at purchase price: €${bike.price}`);
    }
    
    console.log(`Base value: €${baseEstimatedValue.toFixed(0)}, Age: ${ageDepreciation.toFixed(2)}, Mileage: ${mileageDepreciation.toFixed(2)}, Components: ${componentAdjustment.toFixed(2)}, Final: €${estimatedValue.toFixed(0)}`);
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
