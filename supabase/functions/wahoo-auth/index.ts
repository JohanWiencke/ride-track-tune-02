import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    );

    // Get the user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, code } = await req.json();

    const wahooClientId = Deno.env.get('WAHOO_CLIENT_ID');
    const wahooClientSecret = Deno.env.get('WAHOO_CLIENT_SECRET');

    if (!wahooClientId || !wahooClientSecret) {
      return new Response(
        JSON.stringify({ error: 'Wahoo API credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get_auth_url') {
      const redirectUri = req.headers.get('origin') || 'https://localhost:3000';
      const scope = 'user_read,workouts_read';
      
      const authUrl = `https://api.wahooligan.com/oauth/authorize?` +
        `client_id=${wahooClientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${scope}&` +
        `state=wahoo`;

      return new Response(
        JSON.stringify({ auth_url: authUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'exchange_token') {
      if (!code) {
        return new Response(
          JSON.stringify({ error: 'Authorization code is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const redirectUri = req.headers.get('origin') || 'https://localhost:3000';
      
      const tokenResponse = await fetch('https://api.wahooligan.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: wahooClientId,
          client_secret: wahooClientSecret,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Wahoo token exchange failed:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to exchange authorization code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokens = await tokenResponse.json();

      // Get user info from Wahoo
      const userResponse = await fetch('https://api.wahooligan.com/v1/user', {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
        },
      });

      if (!userResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to get user info from Wahoo' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const wahooUser = await userResponse.json();

      // Store tokens in the profiles table
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .upsert({
          user_id: user.id,
          wahoo_access_token: tokens.access_token,
          wahoo_refresh_token: tokens.refresh_token,
          wahoo_user_id: wahooUser.id.toString(),
        });

      if (updateError) {
        console.error('Error updating profile:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to save tokens' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'disconnect') {
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({
          wahoo_access_token: null,
          wahoo_refresh_token: null,
          wahoo_user_id: null,
        })
        .eq('user_id', user.id);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: 'Failed to disconnect' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in wahoo-auth function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});