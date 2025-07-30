
-- Add missing columns to receipts table
ALTER TABLE public.receipts 
ADD COLUMN total_amount numeric,
ADD COLUMN store_name text,
ADD COLUMN purchase_date date,
ADD COLUMN analysis_result jsonb;

-- Add missing column to profiles table  
ALTER TABLE public.profiles
ADD COLUMN strava_access_token text;

-- Create strava_activities table
CREATE TABLE public.strava_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  activity_id bigint NOT NULL,
  name text,
  distance numeric,
  activity_type text,
  start_date timestamp with time zone,
  bike_id uuid REFERENCES public.bikes(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add RLS policies for strava_activities
ALTER TABLE public.strava_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own strava activities"
  ON public.strava_activities
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own strava activities"
  ON public.strava_activities
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own strava activities"
  ON public.strava_activities
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own strava activities"
  ON public.strava_activities
  FOR DELETE
  USING (auth.uid() = user_id);
