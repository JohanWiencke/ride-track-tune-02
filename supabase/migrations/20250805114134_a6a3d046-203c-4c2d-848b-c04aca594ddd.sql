-- Remove Strava-related columns from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS strava_athlete_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS strava_access_token;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS strava_refresh_token;

-- Drop Strava activities table
DROP TABLE IF EXISTS public.strava_activities;