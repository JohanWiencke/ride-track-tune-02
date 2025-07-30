
-- Add valuation columns to bikes table
ALTER TABLE public.bikes 
ADD COLUMN estimated_value numeric,
ADD COLUMN last_valuation_date timestamp with time zone,
ADD COLUMN valuation_source text;

-- Create bike_valuations table
CREATE TABLE public.bike_valuations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bike_id uuid NOT NULL REFERENCES public.bikes(id) ON DELETE CASCADE,
  valuation_date timestamp with time zone NOT NULL DEFAULT now(),
  estimated_value numeric NOT NULL,
  valuation_source text NOT NULL DEFAULT 'automated',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create valuation_history table  
CREATE TABLE public.valuation_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  total_estimated_value numeric NOT NULL,
  total_bikes_valued integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add RLS policies for bike_valuations
ALTER TABLE public.bike_valuations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view valuations of their bikes"
  ON public.bike_valuations
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.bikes 
    WHERE bikes.id = bike_valuations.bike_id 
    AND bikes.user_id = auth.uid()
  ));

CREATE POLICY "Users can create valuations for their bikes"
  ON public.bike_valuations
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.bikes 
    WHERE bikes.id = bike_valuations.bike_id 
    AND bikes.user_id = auth.uid()
  ));

-- Add RLS policies for valuation_history
ALTER TABLE public.valuation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own valuation history"
  ON public.valuation_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own valuation history"
  ON public.valuation_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
