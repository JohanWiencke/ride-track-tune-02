-- Add bike_type column to bikes table
ALTER TABLE public.bikes 
ADD COLUMN bike_type TEXT CHECK (bike_type IN ('road', 'gravel', 'mountain')) DEFAULT 'road';

-- Remove Wahoo columns from profiles table
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS wahoo_access_token,
DROP COLUMN IF EXISTS wahoo_refresh_token,
DROP COLUMN IF EXISTS wahoo_user_id;

-- Create table to track processed Strava activities to prevent duplicates
CREATE TABLE public.strava_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  strava_activity_id TEXT NOT NULL,
  bike_id UUID,
  distance NUMERIC NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, strava_activity_id)
);

-- Enable RLS on strava_activities
ALTER TABLE public.strava_activities ENABLE ROW LEVEL SECURITY;

-- Create policies for strava_activities
CREATE POLICY "Users can view their own strava activities" 
ON public.strava_activities 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own strava activities" 
ON public.strava_activities 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add foreign key reference to bikes table
ALTER TABLE public.strava_activities 
ADD CONSTRAINT fk_strava_activities_bike 
FOREIGN KEY (bike_id) REFERENCES public.bikes(id) ON DELETE SET NULL;