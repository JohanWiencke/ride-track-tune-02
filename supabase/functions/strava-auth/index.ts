
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
  console.log('Strava auth function called:', req.method);
  
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
      console.error('Auth error:', authError);
      throw new Error('Invalid authentication');
    }

    console.log('Processing request for user:', user.id);

    const { action, code } = await req.json();
    console.log('Action:', action);

    if (action === 'get_auth_url') {
      // Generate Strava OAuth URL with expanded scopes for gear access
      const redirectUri = `${req.headers.get('origin')}/strava-callback`;
      const scope = 'read,read_all,activity:read_all,activity:read'; // Added more comprehensive scopes
      const authUrl = `https://www.strava.com/oauth/authorize?client_id=${stravaClientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
      
      console.log('Generated auth URL for redirect URI:', redirectUri);
      console.log('Using scopes:', scope);
      
      return new Response(JSON.stringify({ authUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'exchange_code') {
      console.log('Exchanging code for access token');
      
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
      console.log('Token exchange successful, athlete:', tokenData.athlete?.firstname, tokenData.athlete?.lastname);
      
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

      console.log('Successfully stored Strava tokens for user:', user.id);

      return new Response(JSON.stringify({ 
        success: true, 
        athlete: tokenData.athlete 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'disconnect') {
      console.log('Disconnecting Strava for user:', user.id);
      
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

      console.log('Successfully disconnected Strava for user:', user.id);

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
