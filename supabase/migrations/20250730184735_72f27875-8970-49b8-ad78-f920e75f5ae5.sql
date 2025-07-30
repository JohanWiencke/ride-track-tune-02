
-- Add missing Strava-related columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS strava_refresh_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS strava_athlete_id TEXT;
