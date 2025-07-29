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

    console.log('Starting Strava sync for user:', user.id)
    
    // First, sync bikes from Strava athlete profile
    await syncBikesFromStrava(profile.strava_access_token, supabaseClient, user.id)

    console.log('Fetching activities from Strava...')

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
      JSON.stringify({ success: true, message: 'Bikes and activities synced successfully' }),
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

async function syncBikesFromStrava(accessToken: string, supabaseClient: any, userId: string) {
  try {
    console.log('Syncing bikes from Strava for user:', userId)
    
    // Fetch athlete data to get bikes
    const athleteResponse = await fetch('https://www.strava.com/api/v3/athlete', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    console.log('Athlete response status:', athleteResponse.status)

    if (!athleteResponse.ok) {
      console.error('Failed to fetch athlete data from Strava. Status:', athleteResponse.status)
      const errorText = await athleteResponse.text()
      console.error('Error response:', errorText)
      return
    }

    const athlete = await athleteResponse.json()
    console.log('Athlete data received. Bikes found:', athlete.bikes?.length || 0)
    
    if (!athlete.bikes || athlete.bikes.length === 0) {
      console.log('No bikes found in Strava profile')
      return
    }

    console.log('Found bikes in Strava:', athlete.bikes.map(bike => ({ name: bike.name, brand: bike.brand_name, model: bike.model_name })))

    // Get existing bikes for this user
    const { data: existingBikes } = await supabaseClient
      .from('bikes')
      .select('id, name, brand, model, total_distance')
      .eq('user_id', userId)

    const existingBikeNames = new Set(existingBikes?.map(bike => bike.name.toLowerCase()) || [])

    // Add new bikes from Strava
    for (const stravaBike of athlete.bikes) {
      // Skip if bike already exists (case-insensitive comparison)
      if (existingBikeNames.has(stravaBike.name.toLowerCase())) {
        console.log(`Bike "${stravaBike.name}" already exists, skipping`)
        continue
      }

      // Create new bike from Strava data
      const { error } = await supabaseClient
        .from('bikes')
        .insert({
          user_id: userId,
          name: stravaBike.name,
          brand: stravaBike.brand_name || null,
          model: stravaBike.model_name || null,
          total_distance: stravaBike.distance ? (stravaBike.distance / 1000) : 0, // Convert meters to km
        })

      if (error) {
        console.error(`Failed to create bike "${stravaBike.name}":`, error)
      } else {
        console.log(`Created bike "${stravaBike.name}" from Strava`)
      }
    }
  } catch (error) {
    console.error('Error syncing bikes from Strava:', error)
  }
}

async function processActivities(activities: any[], supabaseClient: any, userId: string) {
  // Filter for cycling activities
  const cyclingActivities = activities.filter(activity => 
    activity.type === 'Ride' && activity.distance > 0
  )

  if (cyclingActivities.length === 0) {
    return
  }

  // Get user's bikes
  const { data: bikes } = await supabaseClient
    .from('bikes')
    .select('id, name, total_distance')
    .eq('user_id', userId)

  if (!bikes || bikes.length === 0) {
    return
  }

  // Process activities and update bike distances based on gear_id when available
  const bikeUpdates = new Map()
  
  for (const activity of cyclingActivities) {
    const distanceKm = activity.distance / 1000 // Convert meters to kilometers
    
    if (activity.gear_id) {
      // Try to match activity gear to a bike by finding the Strava gear details
      // For now, we'll add all unmatched activities to the first bike
      // Future enhancement: store Strava gear IDs in bikes table for proper matching
      const targetBike = bikes[0]
      bikeUpdates.set(targetBike.id, (bikeUpdates.get(targetBike.id) || 0) + distanceKm)
    } else {
      // No gear specified, add to first bike
      const targetBike = bikes[0]
      bikeUpdates.set(targetBike.id, (bikeUpdates.get(targetBike.id) || 0) + distanceKm)
    }
  }

  // Update bike distances
  for (const [bikeId, additionalDistance] of bikeUpdates) {
    const bike = bikes.find(b => b.id === bikeId)
    if (!bike) continue

    const newTotalDistance = (parseFloat(bike.total_distance) || 0) + additionalDistance

    await supabaseClient
      .from('bikes')
      .update({ total_distance: newTotalDistance })
      .eq('id', bikeId)

    // Update all active components for this bike
    const { data: components } = await supabaseClient
      .from('bike_components')
      .select('id, current_distance')
      .eq('bike_id', bikeId)
      .eq('is_active', true)

    if (components) {
      for (const component of components) {
        await supabaseClient
          .from('bike_components')
          .update({
            current_distance: (parseFloat(component.current_distance) || 0) + additionalDistance
          })
          .eq('id', component.id)
      }
    }
  }
}