-- Add purchase_date column to bikes table
ALTER TABLE public.bikes ADD COLUMN purchase_date DATE;

-- Create table to track individual bike valuations over time
CREATE TABLE public.bike_valuations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bike_id UUID NOT NULL,
  valuation_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  estimated_value NUMERIC NOT NULL,
  valuation_source TEXT DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on bike_valuations
ALTER TABLE public.bike_valuations ENABLE ROW LEVEL SECURITY;

-- Create policies for bike_valuations
CREATE POLICY "Users can view valuations of their bikes" 
ON public.bike_valuations 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM bikes 
  WHERE bikes.id = bike_valuations.bike_id 
  AND bikes.user_id = auth.uid()
));

CREATE POLICY "Users can create valuations for their bikes" 
ON public.bike_valuations 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM bikes 
  WHERE bikes.id = bike_valuations.bike_id 
  AND bikes.user_id = auth.uid()
));

CREATE POLICY "Users can update valuations of their bikes" 
ON public.bike_valuations 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM bikes 
  WHERE bikes.id = bike_valuations.bike_id 
  AND bikes.user_id = auth.uid()
));

CREATE POLICY "Users can delete valuations of their bikes" 
ON public.bike_valuations 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM bikes 
  WHERE bikes.id = bike_valuations.bike_id 
  AND bikes.user_id = auth.uid()
));