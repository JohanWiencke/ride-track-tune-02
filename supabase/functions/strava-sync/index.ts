import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🚀 Strava sync function called');
  console.log('📝 Request method:', req.method);
  console.log('📝 Request URL:', req.url);
  console.log('📝 Request headers:', Object.fromEntries(req.headers.entries()));
  
  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS request - returning CORS headers');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔧 Getting environment variables...');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    console.log('🔧 SUPABASE_URL exists:', !!supabaseUrl);
    console.log('🔧 SUPABASE_ANON_KEY exists:', !!supabaseAnonKey);

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Missing Supabase configuration');
      return new Response(JSON.stringify({ 
        error: 'Server configuration error' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🔐 Checking authorization header...');
    const authHeader = req.headers.get('Authorization');
    console.log('🔐 Auth header exists:', !!authHeader);
    console.log('🔐 Auth header format:', authHeader ? `${authHeader.substring(0, 20)}...` : 'none');
    
    if (!authHeader) {
      console.error('❌ Missing Authorization header');
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🔧 Creating Supabase client...');
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get the user
    console.log('👤 Getting user from token...');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    console.log('👤 Auth error:', authError);
    console.log('👤 User ID:', user?.id);
    console.log('👤 User email:', user?.email);

    if (authError || !user) {
      console.error('❌ Auth error details:', {
        error: authError,
        message: authError?.message,
        status: authError?.status,
        name: authError?.name
      });
      return new Response(JSON.stringify({ 
        error: 'Unauthorized',
        details: authError?.message || 'No user found'
      }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log('✅ Syncing data for user:', user.id);

    // Get user's Strava tokens
    console.log('🔍 Fetching user profile with Strava tokens...');
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('strava_access_token, strava_refresh_token')
      .eq('user_id', user.id)
      .maybeSingle();

    console.log('🔍 Profile error:', profileError);
    console.log('🔍 Profile found:', !!profile);
    console.log('🔍 Strava token exists:', !!profile?.strava_access_token);

    if (profileError) {
      console.error('❌ Profile fetch error:', profileError);
      return new Response(JSON.stringify({ 
        error: 'Profile fetch failed',
        details: profileError.message 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    if (!profile?.strava_access_token) {
      console.error('❌ No Strava token found for user');
      return new Response(JSON.stringify({ error: 'Strava not connected' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Sync bikes and activities
    console.log('🚴 Starting bike sync...');
    await syncBikesFromStrava(supabaseClient, user.id, profile.strava_access_token);
    
    console.log('🏃 Starting activity processing...');
    await processActivities(supabaseClient, user.id, profile.strava_access_token);

    console.log('✅ Strava sync completed successfully');
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Sync completed successfully' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Error in strava-sync function:', error);
    console.error('💥 Error type:', typeof error);
    console.error('💥 Error constructor:', error?.constructor?.name);
    console.error('💥 Error message:', error?.message);
    console.error('💥 Error stack:', error?.stack);
    
    return new Response(JSON.stringify({ 
      error: `Internal server error: ${error?.message || 'Unknown error'}`,
      details: error?.stack || 'No stack trace available'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function syncBikesFromStrava(supabaseClient: any, userId: string, accessToken: string) {
  console.log('Syncing bikes from Strava...');
  
  try {
    const athleteResponse = await fetch('https://www.strava.com/api/v3/athlete', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!athleteResponse.ok) {
      const errorText = await athleteResponse.text();
      console.error('Strava API error:', athleteResponse.status, errorText);
      throw new Error(`Failed to fetch athlete profile: ${athleteResponse.status}`);
    }

    const athlete = await athleteResponse.json();
    const allBikes = athlete.bikes || [];

    if (allBikes.length === 0) {
      console.log('No bikes found in Strava profile');
      return;
    }

    const { data: existingBikes } = await supabaseClient
      .from('bikes')
      .select('id, name, brand, model, total_distance')
      .eq('user_id', userId);

    for (const stravaBike of allBikes) {
      const totalDistanceKm = Math.round((stravaBike.distance || 0) / 1000);
      
      let matchingBike = null;
      if (existingBikes) {
        matchingBike = existingBikes.find(bike => 
          bike.name.toLowerCase().trim() === (stravaBike.name || '').toLowerCase().trim()
        );
      }

      if (matchingBike) {
        await supabaseClient
          .from('bikes')
          .update({ 
            total_distance: totalDistanceKm,
            updated_at: new Date().toISOString()
          })
          .eq('id', matchingBike.id);
      } else {
        let bikeType = 'road';
        const bikeName = (stravaBike.name || '').toLowerCase();
        
        if (bikeName.includes('mountain') || bikeName.includes('mtb')) {
          bikeType = 'mountain';
        } else if (bikeName.includes('gravel')) {
          bikeType = 'gravel';
        }

        await supabaseClient
          .from('bikes')
          .insert({
            user_id: userId,
            name: stravaBike.name || 'Strava Bike',
            brand: stravaBike.brand_name || null,
            model: stravaBike.model_name || null,
            bike_type: bikeType,
            total_distance: totalDistanceKm,
          });
      }
    }
  } catch (error) {
    console.error('Error syncing bikes:', error);
    throw error;
  }
}

async function processActivities(supabaseClient: any, userId: string, accessToken: string) {
  console.log('Processing Strava activities...');
  
  try {
    const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
    
    const activitiesResponse = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${thirtyDaysAgo}&per_page=50`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    );

    if (!activitiesResponse.ok) {
      const errorText = await activitiesResponse.text();
      console.error('Strava activities API error:', activitiesResponse.status, errorText);
      throw new Error(`Failed to fetch activities: ${activitiesResponse.status}`);
    }

    const activities = await activitiesResponse.json();
    console.log('Fetched activities:', activities.length);

    const { data: processedActivities } = await supabaseClient
      .from('strava_activities')
      .select('activity_id')
      .eq('user_id', userId);

    const processedActivityIds = new Set(processedActivities?.map(a => a.activity_id) || []);

    const { data: userBikes } = await supabaseClient
      .from('bikes')
      .select('id, name, brand, model, total_distance')
      .eq('user_id', userId);

    for (const activity of activities) {
      if (processedActivityIds.has(activity.id) || activity.type !== 'Ride') {
        continue;
      }

      const distanceKm = Math.round((activity.distance || 0) / 1000);
      if (distanceKm === 0) continue;

      let bikeId = null;
      if (userBikes && userBikes.length === 1) {
        bikeId = userBikes[0].id;
      }

      await supabaseClient
        .from('strava_activities')
        .insert({
          user_id: userId,
          activity_id: activity.id,
          bike_id: bikeId,
          distance: distanceKm,
          activity_type: activity.type,
          name: activity.name,
          start_date: activity.start_date,
        });

      if (bikeId) {
        const currentBike = userBikes.find(b => b.id === bikeId);
        if (currentBike) {
          const newTotalDistance = (currentBike.total_distance || 0) + distanceKm;
          
          await supabaseClient
            .from('bikes')
            .update({ total_distance: newTotalDistance })
            .eq('id', bikeId);
          
          currentBike.total_distance = newTotalDistance;
        }
      }
    }
  } catch (error) {
    console.error('Error processing activities:', error);
    throw error;
  }
}