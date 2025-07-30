
-- Add missing Strava columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS strava_refresh_token text,
ADD COLUMN IF NOT EXISTS strava_athlete_id text;
