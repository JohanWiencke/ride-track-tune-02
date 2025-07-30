
-- Add missing columns to profiles table for Strava integration
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS strava_refresh_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS strava_athlete_id TEXT;

-- Add missing columns to bikes table for valuation
ALTER TABLE bikes ADD COLUMN IF NOT EXISTS estimated_value NUMERIC;
ALTER TABLE bikes ADD COLUMN IF NOT EXISTS last_valuation_date TIMESTAMP WITH TIME ZONE;

-- Create bike_valuations table if it doesn't exist
CREATE TABLE IF NOT EXISTS bike_valuations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bike_id UUID NOT NULL,
  estimated_value NUMERIC NOT NULL,
  valuation_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valuation_source TEXT NOT NULL DEFAULT 'automated',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for bike_valuations
ALTER TABLE bike_valuations ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view valuations of their bikes" 
  ON bike_valuations 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM bikes 
    WHERE bikes.id = bike_valuations.bike_id 
    AND bikes.user_id = auth.uid()
  ));

CREATE POLICY IF NOT EXISTS "Users can create valuations for their bikes" 
  ON bike_valuations 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM bikes 
    WHERE bikes.id = bike_valuations.bike_id 
    AND bikes.user_id = auth.uid()
  ));

-- Create valuation_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS valuation_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  total_estimated_value NUMERIC NOT NULL,
  total_bikes_valued INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for valuation_history
ALTER TABLE valuation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view their own valuation history" 
  ON valuation_history 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can create their own valuation history" 
  ON valuation_history 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Update strava_activities table to use correct column name
ALTER TABLE strava_activities RENAME COLUMN activity_id TO strava_activity_id;
ALTER TABLE strava_activities ALTER COLUMN strava_activity_id TYPE TEXT;
