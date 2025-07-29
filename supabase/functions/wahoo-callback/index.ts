import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  console.log('Wahoo callback function called');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    const state = url.searchParams.get('state');

    console.log('Callback params - code:', !!code, 'error:', error, 'state:', state);

    // Redirect URL for the frontend
    const frontendUrl = 'https://preview--ride-track-tune-02.lovable.app';
    
    if (error) {
      console.error('OAuth error:', error);
      return Response.redirect(`${frontendUrl}/wahoo-callback?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      console.error('No authorization code received');
      return Response.redirect(`${frontendUrl}/wahoo-callback?error=no_code`);
    }

    if (state !== 'wahoo') {
      console.error('Invalid state parameter');
      return Response.redirect(`${frontendUrl}/wahoo-callback?error=invalid_state`);
    }

    // Redirect to frontend with the code for processing
    const callbackUrl = `${frontendUrl}/wahoo-callback?code=${encodeURIComponent(code)}`;
    console.log('Redirecting to frontend:', callbackUrl);
    
    return Response.redirect(callbackUrl);

  } catch (error) {
    console.error('Error in wahoo-callback function:', error);
    const frontendUrl = 'https://preview--ride-track-tune-02.lovable.app';
    return Response.redirect(`${frontendUrl}/wahoo-callback?error=callback_error`);
  }
});