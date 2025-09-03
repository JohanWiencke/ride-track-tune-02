import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Failed to get user:', userError);
      throw new Error('Invalid authentication token');
    }

    // Get user's Strava tokens from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('strava_access_token, strava_refresh_token, strava_token_expires_at')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.strava_access_token) {
      throw new Error('Strava not connected. Please connect your Strava account first.');
    }

    let accessToken = profile.strava_access_token;

    // Check if token needs refresh
    const expiresAt = new Date(profile.strava_token_expires_at);
    const now = new Date();
    
    if (expiresAt <= now) {
      console.log('Refreshing Strava token...');
      
      const clientId = Deno.env.get('STRAVA_CLIENT_ID');
      const clientSecret = Deno.env.get('STRAVA_CLIENT_SECRET');
      
      const refreshResponse = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: profile.strava_refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh Strava token');
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;

      // Update tokens in profile
      const newExpiresAt = new Date(Date.now() + (refreshData.expires_in * 1000));
      await supabase
        .from('profiles')
        .update({
          strava_access_token: refreshData.access_token,
          strava_refresh_token: refreshData.refresh_token,
          strava_token_expires_at: newExpiresAt.toISOString(),
        })
        .eq('user_id', user.id);
    }

    // Fetch activities from Strava API
    const activitiesResponse = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?per_page=200`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!activitiesResponse.ok) {
      const error = await activitiesResponse.text();
      console.error('Strava API error:', error);
      throw new Error('Failed to fetch activities from Strava');
    }

    const activities = await activitiesResponse.json();
    console.log(`Fetched ${activities.length} activities from Strava`);

    // Process and store activities
    const processedActivities = activities.map((activity: any) => ({
      user_id: user.id,
      strava_activity_id: activity.id,
      name: activity.name,
      type: activity.type,
      distance: activity.distance,
      moving_time: activity.moving_time,
      elapsed_time: activity.elapsed_time,
      total_elevation_gain: activity.total_elevation_gain || 0,
      start_date: activity.start_date,
    }));

    // Insert activities (using upsert to handle duplicates)
    const { error: insertError } = await supabase
      .from('strava_activities')
      .upsert(processedActivities, {
        onConflict: 'strava_activity_id',
        ignoreDuplicates: false
      });

    if (insertError) {
      console.error('Failed to insert activities:', insertError);
      throw new Error('Failed to save activities to database');
    }

    console.log(`Successfully synced ${activities.length} activities for user ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        activities_synced: activities.length,
        message: 'Activities synced successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in strava-sync function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});