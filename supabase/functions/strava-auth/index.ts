
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const stravaClientId = Deno.env.get('STRAVA_CLIENT_ID')!;
const stravaClientSecret = Deno.env.get('STRAVA_CLIENT_SECRET')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if required environment variables are set
    if (!stravaClientId || !stravaClientSecret) {
      console.error('Missing Strava credentials:', { 
        hasClientId: !!stravaClientId, 
        hasClientSecret: !!stravaClientSecret 
      });
      throw new Error('Strava API credentials not configured');
    }

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

    const { action, code } = await req.json();

    if (action === 'get_auth_url') {
      // Generate Strava OAuth URL
      const redirectUri = `${req.headers.get('origin')}/strava-callback`;
      const scope = 'read,activity:read_all';
      const authUrl = `https://www.strava.com/oauth/authorize?client_id=${stravaClientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
      
      return new Response(JSON.stringify({ authUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'exchange_code') {
      // Exchange authorization code for access token
      const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: stravaClientId,
          client_secret: stravaClientSecret,
          code: code,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error('Strava token exchange failed:', errorData);
        throw new Error('Failed to exchange authorization code');
      }

      const tokenData = await tokenResponse.json();
      
      // Store tokens in user profile
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          strava_access_token: tokenData.access_token,
          strava_refresh_token: tokenData.refresh_token,
          strava_athlete_id: tokenData.athlete.id.toString(),
        });

      if (updateError) {
        console.error('Error updating profile:', updateError);
        throw new Error('Failed to store Strava tokens');
      }

      return new Response(JSON.stringify({ 
        success: true, 
        athlete: tokenData.athlete 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'disconnect') {
      // Remove Strava tokens from user profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          strava_access_token: null,
          strava_refresh_token: null,
          strava_athlete_id: null,
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error disconnecting Strava:', updateError);
        throw new Error('Failed to disconnect Strava');
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Error in strava-auth function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
