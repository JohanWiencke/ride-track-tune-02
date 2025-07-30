import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('Strava Edge Function called');

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const STRAVA_CLIENT_ID = Deno.env.get('STRAVA_CLIENT_ID')
    const STRAVA_CLIENT_SECRET = Deno.env.get('STRAVA_CLIENT_SECRET')

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
      throw new Error('Missing required environment variables')
    }

    const supabaseClient = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (!user || authError) {
      throw new Error('Unauthorized or auth retrieval failed')
    }

    const { action, code } = await req.json()
    console.log('Received action:', action)

    if (action === 'get_auth_url') {
      const redirectUri = req.headers.get('origin') || 'https://preview--ride-track-tune-02.lovable.app'
      const scope = 'read,activity:read,profile:read_all'

      const authUrl = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${redirectUri}&approval_prompt=force&scope=${scope}&state=strava`

      return new Response(
        JSON.stringify({ authUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'exchange_token') {
      if (!code) throw new Error('Missing Strava authorization code')

      const tokenRes = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: STRAVA_CLIENT_ID,
          client_secret: STRAVA_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
        }),
      })

      const tokenData = await tokenRes.json()

      if (!tokenRes.ok) {
        console.error('Strava token exchange error:', tokenData)
        throw new Error(`Strava token exchange failed: ${tokenData.message || 'Unknown error'}`)
      }

      const { access_token, refresh_token, athlete } = tokenData
      if (!access_token || !athlete?.id) {
        throw new Error('Invalid token data returned from Strava')
      }

      const { error: dbError } = await supabaseClient
        .from('profiles')
        .update({
          strava_access_token: access_token,
          strava_refresh_token: refresh_token,
          strava_athlete_id: athlete.id.toString(),
        })
        .eq('user_id', user.id)

      if (dbError) {
        console.error('Supabase update error:', dbError)
        throw new Error(`Failed to store Strava tokens: ${dbError.message}`)
      }

      return new Response(
        JSON.stringify({ success: true, athlete }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'disconnect') {
      const { error: disconnectError } = await supabaseClient
        .from('profiles')
        .update({
          strava_access_token: null,
          strava_refresh_token: null,
          strava_athlete_id: null,
        })
        .eq('user_id', user.id)

      if (disconnectError) {
        console.error('Disconnect error:', disconnectError)
        throw new Error(`Failed to disconnect Strava: ${disconnectError.message}`)
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Invalid action')

  } catch (error) {
    console.error('Strava OAuth error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
