-- Add Strava integration columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN strava_access_token TEXT,
ADD COLUMN strava_refresh_token TEXT,
ADD COLUMN strava_athlete_id BIGINT,
ADD COLUMN strava_connected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN strava_token_expires_at TIMESTAMP WITH TIME ZONE;

-- Create Strava activities table
CREATE TABLE public.strava_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strava_activity_id BIGINT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  distance NUMERIC NOT NULL DEFAULT 0,
  moving_time INTEGER NOT NULL DEFAULT 0,
  elapsed_time INTEGER NOT NULL DEFAULT 0,
  total_elevation_gain NUMERIC NOT NULL DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on strava_activities
ALTER TABLE public.strava_activities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for strava_activities
CREATE POLICY "Users can view their own Strava activities" 
ON public.strava_activities 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Strava activities" 
ON public.strava_activities 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Strava activities" 
ON public.strava_activities 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Strava activities" 
ON public.strava_activities 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_strava_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_strava_activities_updated_at
BEFORE UPDATE ON public.strava_activities
FOR EACH ROW
EXECUTE FUNCTION public.update_strava_activities_updated_at();