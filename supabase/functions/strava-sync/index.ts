import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  console.log('Strava sync function called');
  
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
    );

    // Get the user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Syncing data for user:', user.id);

    // Get user's Strava tokens
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('strava_access_token, strava_refresh_token')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.strava_access_token) {
      console.error('No Strava token found for user');
      return new Response(
        JSON.stringify({ error: 'Strava not connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // First, sync bikes from Strava athlete profile
    await syncBikesFromStrava(supabaseClient, user.id, profile.strava_access_token);
    
    // Then sync activities (only new ones)
    await processActivities(supabaseClient, user.id, profile.strava_access_token);

    console.log('Strava sync completed successfully');
    return new Response(
      JSON.stringify({ success: true, message: 'Sync completed successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in strava-sync function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function syncBikesFromStrava(supabaseClient: any, userId: string, accessToken: string) {
  console.log('Syncing bikes from Strava athlete profile...');
  
  try {
    // Get athlete profile which includes gear
    const athleteResponse = await fetch('https://www.strava.com/api/v3/athlete', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!athleteResponse.ok) {
      console.error('Failed to fetch athlete profile:', await athleteResponse.text());
      throw new Error('Failed to fetch athlete profile');
    }

    const athlete = await athleteResponse.json();
    console.log('Athlete profile fetched, bikes found:', athlete.bikes?.length || 0);

    // Also try to get gear directly from the gear endpoint
    let allBikes = athlete.bikes || [];
    
    // Fetch gear list directly as backup
    try {
      const gearResponse = await fetch('https://www.strava.com/api/v3/athlete/gear', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      if (gearResponse.ok) {
        const gearData = await gearResponse.json();
        console.log('Gear endpoint response:', gearData);
        
        // Filter bikes from gear (bikes have resource_state and distance)
        const bikesFromGear = gearData.filter((item: any) => 
          item.resource_state && (item.distance !== undefined || item.converted_distance !== undefined)
        );
        
        if (bikesFromGear.length > 0) {
          console.log('Found bikes from gear endpoint:', bikesFromGear.length);
          allBikes = bikesFromGear;
        }
      }
    } catch (gearError) {
      console.warn('Could not fetch gear directly:', gearError);
    }

    if (!allBikes || allBikes.length === 0) {
      console.log('No bikes found in Strava profile. User may need to add bikes to their Strava gear.');
      return;
    }

    // Get existing bikes to check for matches and updates
    const { data: existingBikes } = await supabaseClient
      .from('bikes')
      .select('id, name, brand, model, total_distance')
      .eq('user_id', userId);

    for (const stravaBike of allBikes) {
      console.log('Processing Strava bike:', stravaBike.name, stravaBike.brand_name, stravaBike.model_name);
      
      // Get detailed bike information if we have the ID
      let bikeDetails = stravaBike;
      if (stravaBike.id) {
        try {
          const bikeResponse = await fetch(`https://www.strava.com/api/v3/gear/${stravaBike.id}`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });

          if (bikeResponse.ok) {
            bikeDetails = await bikeResponse.json();
            console.log('Bike details fetched:', bikeDetails.name, 'Distance:', bikeDetails.distance);
          }
        } catch (detailError) {
          console.warn('Failed to fetch detailed bike info for:', stravaBike.id, detailError);
        }
      }

      // Convert Strava distance from meters to kilometers
      const totalDistanceKm = Math.round((bikeDetails.distance || bikeDetails.converted_distance || 0) / 1000);

      // Try to find existing bike by model name first, then by name
      let matchingBike = null;
      if (existingBikes) {
        // First try model matching
        if (stravaBike.model_name || bikeDetails.model_name) {
          const stravaModel = (stravaBike.model_name || bikeDetails.model_name || '').toLowerCase().trim();
          
          matchingBike = existingBikes.find(bike => {
            if (!bike.model) return false;
            
            const appModel = bike.model.toLowerCase().trim();
            
            // Direct model match
            if (appModel === stravaModel) {
              return true;
            }
            
            // Check if one model contains the other
            if (appModel.includes(stravaModel) || stravaModel.includes(appModel)) {
              return true;
            }
            
            return false;
          });
        }

        // If no model match, try by name
        if (!matchingBike) {
          const stravaName = (stravaBike.name || bikeDetails.name || '').toLowerCase().trim();
          matchingBike = existingBikes.find(bike => 
            bike.name.toLowerCase().trim() === stravaName
          );
        }

        // If still no match, try by brand + model combination
        if (!matchingBike && (stravaBike.brand_name || bikeDetails.brand_name) && (stravaBike.model_name || bikeDetails.model_name)) {
          matchingBike = existingBikes.find(bike => 
            bike.brand === (stravaBike.brand_name || bikeDetails.brand_name) &&
            bike.model === (stravaBike.model_name || bikeDetails.model_name)
          );
        }
      }

      if (matchingBike) {
        console.log('Found matching bike, updating distance:', matchingBike.name, 'from', matchingBike.total_distance, 'to', totalDistanceKm);
        
        // Always update existing bike's total distance from Strava
        const { error: updateError } = await supabaseClient
          .from('bikes')
          .update({ 
            total_distance: totalDistanceKm,
            updated_at: new Date().toISOString()
          })
          .eq('id', matchingBike.id);

        if (updateError) {
          console.error('Error updating bike distance:', updateError);
        } else {
          console.log(`Updated bike ${matchingBike.name} distance to ${totalDistanceKm}km`);
        }
      } else {
        console.log('No matching bike found, creating new bike from Strava gear');
        
        // Determine bike type based on name/description
        let bikeType = 'road'; // default
        const bikeName = ((stravaBike.name || bikeDetails.name) || '').toLowerCase();
        const bikeDescription = (bikeDetails.description || '').toLowerCase();
        const combinedText = `${bikeName} ${bikeDescription}`;
        
        if (combinedText.includes('mountain') || combinedText.includes('mtb')) {
          bikeType = 'mountain';
        } else if (combinedText.includes('gravel') || combinedText.includes('cyclocross') || combinedText.includes('cx')) {
          bikeType = 'gravel';
        } else if (combinedText.includes('hybrid')) {
          bikeType = 'hybrid';
        } else if (combinedText.includes('electric') || combinedText.includes('e-bike') || combinedText.includes('ebike')) {
          bikeType = 'electric';
        }

        // Create bike name from available data
        const bikeName_final = bikeDetails.name || stravaBike.name || 
          `${stravaBike.brand_name || bikeDetails.brand_name || 'Unknown'} ${stravaBike.model_name || bikeDetails.model_name || 'Bike'}`.trim();

        // Insert new bike with distance from Strava
        const { error: insertError } = await supabaseClient
          .from('bikes')
          .insert({
            user_id: userId,
            name: bikeName_final,
            brand: stravaBike.brand_name || bikeDetails.brand_name || null,
            model: stravaBike.model_name || bikeDetails.model_name || null,
            bike_type: bikeType,
            total_distance: totalDistanceKm,
          });

        if (insertError) {
          console.error('Error inserting bike:', insertError);
        } else {
          console.log('Successfully added bike:', bikeName_final, 'with distance:', totalDistanceKm, 'km');
        }
      }
    }
  } catch (error) {
    console.error('Error syncing bikes from Strava:', error);
    throw error;
  }
}

async function processActivities(supabaseClient: any, userId: string, accessToken: string) {
  console.log('Processing recent Strava activities...');
  
  try {
    // Get activities from the last 30 days to avoid processing too much data
    const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
    
    const activitiesResponse = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${thirtyDaysAgo}&per_page=200`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!activitiesResponse.ok) {
      console.error('Failed to fetch activities:', await activitiesResponse.text());
      throw new Error('Failed to fetch activities');
    }

    const activities = await activitiesResponse.json();
    console.log('Fetched activities:', activities.length);

    // Get existing processed activities to avoid duplicates
    const { data: processedActivities } = await supabaseClient
      .from('strava_activities')
      .select('strava_activity_id')
      .eq('user_id', userId);

    const processedActivityIds = new Set(processedActivities?.map(a => a.strava_activity_id) || []);

    // Get user's bikes for matching
    const { data: userBikes } = await supabaseClient
      .from('bikes')
      .select('id, name, brand, model, total_distance')
      .eq('user_id', userId);

    let activitiesProcessed = 0;

    for (const activity of activities) {
      // Skip if already processed
      if (processedActivityIds.has(activity.id.toString())) {
        continue;
      }

      // Only process rides
      if (activity.type !== 'Ride') {
        continue;
      }

      const distanceKm = Math.round((activity.distance || 0) / 1000);
      if (distanceKm === 0) {
        continue;
      }

      console.log('Processing activity:', activity.name, 'Distance:', distanceKm, 'km');

      let bikeId = null;
      
      // Try to match bike by gear_id first if available
      if (activity.gear_id && userBikes) {
        // Get detailed activity data to find bike information
        try {
          const activityDetailResponse = await fetch(`https://www.strava.com/api/v3/activities/${activity.id}`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });
          
          if (activityDetailResponse.ok) {
            const activityDetail = await activityDetailResponse.json();
            
            // Try to match by model name if available
            if (activityDetail.gear && activityDetail.gear.model_name) {
              const stravaModel = activityDetail.gear.model_name.toLowerCase().trim();
              
              // Find bike with matching model
              const matchingBike = userBikes.find(bike => {
                if (!bike.model) return false;
                
                const appModel = bike.model.toLowerCase().trim();
                
                // Direct model match
                if (appModel === stravaModel) {
                  return true;
                }
                
                // Check if one model contains the other (for variations like "Ultimate CF SL 7" vs "Ultimate CF SL 7 di2 2025")
                if (appModel.includes(stravaModel) || stravaModel.includes(appModel)) {
                  return true;
                }
                
                return false;
              });
              
              if (matchingBike) {
                bikeId = matchingBike.id;
                console.log(`Matched activity to bike by model: ${matchingBike.name} (${matchingBike.model})`);
              }
            }
            
            // If no model match, try by bike name as fallback
            if (!bikeId && activityDetail.gear && activityDetail.gear.name) {
              const stravaName = activityDetail.gear.name.toLowerCase().trim();
              
              const matchingBike = userBikes.find(bike => {
                const appName = bike.name.toLowerCase().trim();
                return appName === stravaName;
              });
              
              if (matchingBike) {
                bikeId = matchingBike.id;
                console.log(`Matched activity to bike by name: ${matchingBike.name}`);
              }
            }
          }
        } catch (error) {
          console.warn('Failed to fetch activity details for bike matching:', error);
        }
      }

      // If no specific bike match and user has only one bike, use it
      if (!bikeId && userBikes && userBikes.length === 1) {
        bikeId = userBikes[0].id;
        console.log(`Only one bike available, using: ${userBikes[0].name}`);
      }
      
      // If multiple bikes and no match, skip this activity to avoid incorrect attribution
      if (!bikeId && userBikes && userBikes.length > 1) {
        console.log(`Multiple bikes found but no match for activity: ${activity.name}, skipping`);
        continue;
      }

      // Record that we've processed this activity
      const { error: activityError } = await supabaseClient
        .from('strava_activities')
        .insert({
          user_id: userId,
          strava_activity_id: activity.id.toString(),
          bike_id: bikeId,
          distance: distanceKm,
        });

      if (activityError) {
        console.error('Error recording activity:', activityError);
        continue;
      }

      // Update bike distance if we have a bike match
      if (bikeId) {
        const currentBike = userBikes.find(b => b.id === bikeId);
        if (currentBike) {
          const newTotalDistance = (currentBike.total_distance || 0) + distanceKm;
          
          const { error: bikeUpdateError } = await supabaseClient
            .from('bikes')
            .update({ total_distance: newTotalDistance })
            .eq('id', bikeId);

          if (bikeUpdateError) {
            console.error('Error updating bike distance:', bikeUpdateError);
          } else {
            console.log(`Updated bike ${currentBike.name} distance: +${distanceKm}km (total: ${newTotalDistance}km)`);
            // Update local copy to reflect the change
            currentBike.total_distance = newTotalDistance;
          }
        }
      }

      activitiesProcessed++;
    }

    console.log(`Processed ${activitiesProcessed} new activities`);
    
  } catch (error) {
    console.error('Error processing activities:', error);
    throw error;
  }
}