import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the user from the session
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { year } = await req.json()

    // Get Strava tokens from profiles
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('strava_access_token, strava_refresh_token, strava_athlete_id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile?.strava_access_token) {
      return new Response(
        JSON.stringify({ error: 'Strava not connected' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get athlete stats for the specified year
    const statsResponse = await fetch(
      `https://www.strava.com/api/v3/athletes/${profile.strava_athlete_id}/stats`,
      {
        headers: {
          'Authorization': `Bearer ${profile.strava_access_token}`,
        },
      }
    )

    if (!statsResponse.ok) {
      // Try to refresh token if needed
      if (statsResponse.status === 401 && profile.strava_refresh_token) {
        const refreshResponse = await fetch('https://www.strava.com/oauth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: Deno.env.get('STRAVA_CLIENT_ID'),
            client_secret: Deno.env.get('STRAVA_CLIENT_SECRET'),
            refresh_token: profile.strava_refresh_token,
            grant_type: 'refresh_token',
          }),
        })

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          
          // Update tokens in database
          await supabaseClient
            .from('profiles')
            .update({
              strava_access_token: refreshData.access_token,
              strava_refresh_token: refreshData.refresh_token,
            })
            .eq('user_id', user.id)

          // Retry the stats request
          const retryStatsResponse = await fetch(
            `https://www.strava.com/api/v3/athletes/${profile.strava_athlete_id}/stats`,
            {
              headers: {
                'Authorization': `Bearer ${refreshData.access_token}`,
              },
            }
          )

          if (retryStatsResponse.ok) {
            const statsData = await retryStatsResponse.json()
            
            // Extract current year data
            const yearlyStats = {
              total_distance: statsData.ytd_ride_totals?.distance || 0,
              total_rides: statsData.ytd_ride_totals?.count || 0,
              total_elevation: statsData.ytd_ride_totals?.elevation_gain || 0,
              total_time: statsData.ytd_ride_totals?.moving_time || 0,
              biggest_ride_distance: statsData.biggest_ride_distance || 0,
            }

            return new Response(
              JSON.stringify(yearlyStats),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        }
      }

      return new Response(
        JSON.stringify({ error: 'Failed to fetch Strava stats' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const statsData = await statsResponse.json()
    
    // Extract current year data (ytd = year to date)
    const yearlyStats = {
      total_distance: statsData.ytd_ride_totals?.distance || 0,
      total_rides: statsData.ytd_ride_totals?.count || 0,
      total_elevation: statsData.ytd_ride_totals?.elevation_gain || 0,
      total_time: statsData.ytd_ride_totals?.moving_time || 0,
      biggest_ride_distance: statsData.biggest_ride_distance || 0,
    }

    return new Response(
      JSON.stringify(yearlyStats),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error fetching Strava stats:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})