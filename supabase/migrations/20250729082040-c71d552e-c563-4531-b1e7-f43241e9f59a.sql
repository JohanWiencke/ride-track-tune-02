-- Add Strava integration columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS strava_access_token TEXT,
ADD COLUMN IF NOT EXISTS strava_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS strava_athlete_id TEXT;