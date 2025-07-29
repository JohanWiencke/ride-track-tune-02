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

    const { action, code } = await req.json()

    if (action === 'get_auth_url') {
      // Generate Strava authorization URL
      const clientId = Deno.env.get('STRAVA_CLIENT_ID')
      const redirectUri = req.headers.get('origin') || 'https://localhost:3000'
      const scope = 'read,activity:read'
      
      const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&approval_prompt=force&scope=${scope}&state=strava`
      
      return new Response(
        JSON.stringify({ authUrl }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (action === 'exchange_token' && code) {
      // Exchange authorization code for access token
      const clientId = Deno.env.get('STRAVA_CLIENT_ID')
      const clientSecret = Deno.env.get('STRAVA_CLIENT_SECRET')

      const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          grant_type: 'authorization_code',
        }),
      })

      const tokenData = await tokenResponse.json()

      if (!tokenResponse.ok) {
        throw new Error(`Strava token exchange failed: ${tokenData.message}`)
      }

      // Store tokens in user profile
      const { error } = await supabaseClient
        .from('profiles')
        .update({
          strava_access_token: tokenData.access_token,
          strava_refresh_token: tokenData.refresh_token,
          strava_athlete_id: tokenData.athlete.id.toString(),
        })
        .eq('user_id', user.id)

      if (error) {
        throw new Error(`Failed to store Strava tokens: ${error.message}`)
      }

      return new Response(
        JSON.stringify({ success: true, athlete: tokenData.athlete }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (action === 'disconnect') {
      // Remove Strava tokens from user profile
      const { error } = await supabaseClient
        .from('profiles')
        .update({
          strava_access_token: null,
          strava_refresh_token: null,
          strava_athlete_id: null,
        })
        .eq('user_id', user.id)

      if (error) {
        throw new Error(`Failed to disconnect Strava: ${error.message}`)
      }

      return new Response(
        JSON.stringify({ success: true }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    throw new Error('Invalid action')

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