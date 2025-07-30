import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  console.log('Strava athlete info function called:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Invalid authentication');

    console.log('Fetching athlete info for user:', user.id);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('strava_access_token, strava_refresh_token')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.strava_access_token) {
      throw new Error('No Strava connection found');
    }

    // TODO: If you want, add logic here to check if token expired and refresh it using strava_refresh_token

    console.log('Found Strava token, fetching athlete data...');

    const stravaResponse = await fetch('https://www.strava.com/api/v3/athlete', {
      headers: {
        'Authorization': `Bearer ${profile.strava_access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!stravaResponse.ok) {
      const errorText = await stravaResponse.text();
      throw new Error(`Failed to fetch athlete data from Strava: ${errorText}`);
    }

    const athleteData = await stravaResponse.json();
    console.log('Successfully fetched athlete data:', athleteData.firstname ?? '', athleteData.lastname ?? '');

    return new Response(JSON.stringify({ 
      success: true, 
      athlete: athleteData 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in strava-athlete-info function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
