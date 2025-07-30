-- Add columns to bikes table for valuation data
ALTER TABLE public.bikes 
ADD COLUMN estimated_value NUMERIC,
ADD COLUMN last_valuation_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN valuation_source TEXT;