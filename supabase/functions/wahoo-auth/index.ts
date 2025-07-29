import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WAHOO_CALLBACK_URL = 'https://preview--ride-track-tune-02.lovable.app/api/oauth/wahoo/callback';

Deno.serve(async (req) => {
  console.log('Wahoo auth function called with method:', req.method);
  
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

    const wahooClientId = Deno.env.get('WAHOO_CLIENT_ID');
    const wahooClientSecret = Deno.env.get('WAHOO_CLIENT_SECRET');

    if (!wahooClientId || !wahooClientSecret) {
      console.error('Missing Wahoo credentials');
      return new Response(
        JSON.stringify({ error: 'Wahoo API credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, code } = await req.json();
    console.log('Action:', action, 'Code present:', !!code);

    if (action === 'get_auth_url') {
      const scope = 'user_read,workouts_read';
      
      const authUrl = `https://api.wahooligan.com/oauth/authorize?` +
        `client_id=${wahooClientId}&` +
        `redirect_uri=${encodeURIComponent(WAHOO_CALLBACK_URL)}&` +
        `response_type=code&` +
        `scope=${scope}&` +
        `state=wahoo`;

      console.log('Generated auth URL:', authUrl);
      return new Response(
        JSON.stringify({ auth_url: authUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the user for actions that require authentication
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

    if (action === 'exchange_token') {
      if (!code) {
        return new Response(
          JSON.stringify({ error: 'Authorization code is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Exchanging token with Wahoo...');
      
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
          redirect_uri: WAHOO_CALLBACK_URL,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Wahoo token exchange failed:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to exchange authorization code for token' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokens = await tokenResponse.json();
      console.log('Token exchange successful, access token received');

      // Get user info from Wahoo
      const userResponse = await fetch('https://api.wahooligan.com/v1/user', {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
        },
      });

      if (!userResponse.ok) {
        const errorText = await userResponse.text();
        console.error('Failed to get Wahoo user info:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to get user info from Wahoo' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const wahooUser = await userResponse.json();
      console.log('Wahoo user info retrieved:', wahooUser.id);

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
          JSON.stringify({ error: 'Failed to save Wahoo tokens to profile' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Wahoo tokens saved successfully');
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'disconnect') {
      console.log('Disconnecting Wahoo for user:', user.id);
      
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({
          wahoo_access_token: null,
          wahoo_refresh_token: null,
          wahoo_user_id: null,
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error disconnecting Wahoo:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to disconnect Wahoo' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Wahoo disconnected successfully');
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