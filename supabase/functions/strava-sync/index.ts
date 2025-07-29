import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      throw new Error('Unauthorized')
    }

    // Get user's Strava tokens
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('strava_access_token, strava_refresh_token')
      .eq('user_id', user.id)
      .single()

    if (!profile?.strava_access_token) {
      throw new Error('Strava not connected')
    }

    // Fetch recent activities from Strava
    const activitiesResponse = await fetch(
      'https://www.strava.com/api/v3/athlete/activities?per_page=50',
      {
        headers: {
          'Authorization': `Bearer ${profile.strava_access_token}`,
        },
      }
    )

    if (!activitiesResponse.ok) {
      // Try to refresh token if unauthorized
      if (activitiesResponse.status === 401 && profile.strava_refresh_token) {
        const clientId = Deno.env.get('STRAVA_CLIENT_ID')
        const clientSecret = Deno.env.get('STRAVA_CLIENT_SECRET')

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
        })

        const refreshData = await refreshResponse.json()

        if (refreshResponse.ok) {
          // Update tokens
          await supabaseClient
            .from('profiles')
            .update({
              strava_access_token: refreshData.access_token,
              strava_refresh_token: refreshData.refresh_token,
            })
            .eq('user_id', user.id)

          // Retry activities fetch with new token
          const retryResponse = await fetch(
            'https://www.strava.com/api/v3/athlete/activities?per_page=50',
            {
              headers: {
                'Authorization': `Bearer ${refreshData.access_token}`,
              },
            }
          )

          if (!retryResponse.ok) {
            throw new Error('Failed to fetch Strava activities after token refresh')
          }

          const activities = await retryResponse.json()
          await processActivities(activities, supabaseClient, user.id)
        } else {
          throw new Error('Failed to refresh Strava token')
        }
      } else {
        throw new Error('Failed to fetch Strava activities')
      }
    } else {
      const activities = await activitiesResponse.json()
      await processActivities(activities, supabaseClient, user.id)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Activities synced successfully' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

async function processActivities(activities: any[], supabaseClient: any, userId: string) {
  // Filter for cycling activities
  const cyclingActivities = activities.filter(activity => 
    activity.type === 'Ride' && activity.distance > 0
  )

  // Get user's bikes
  const { data: bikes } = await supabaseClient
    .from('bikes')
    .select('id, name, total_distance')
    .eq('user_id', userId)

  if (!bikes || bikes.length === 0) {
    return
  }

  // For now, add all cycling distance to the first bike
  // In a real app, you might want to let users assign activities to specific bikes
  const targetBike = bikes[0]
  
  // Calculate total distance from new activities
  const totalNewDistance = cyclingActivities.reduce((sum, activity) => {
    return sum + (activity.distance / 1000) // Convert meters to kilometers
  }, 0)

  if (totalNewDistance > 0) {
    // Update bike's total distance
    await supabaseClient
      .from('bikes')
      .update({
        total_distance: (parseFloat(targetBike.total_distance) || 0) + totalNewDistance
      })
      .eq('id', targetBike.id)

    // Update all active components for this bike
    const { data: components } = await supabaseClient
      .from('bike_components')
      .select('id, current_distance')
      .eq('bike_id', targetBike.id)
      .eq('is_active', true)

    if (components) {
      for (const component of components) {
        await supabaseClient
          .from('bike_components')
          .update({
            current_distance: (parseFloat(component.current_distance) || 0) + totalNewDistance
          })
          .eq('id', component.id)
      }
    }
  }
}