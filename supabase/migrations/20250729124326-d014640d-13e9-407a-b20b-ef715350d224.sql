-- Add missing columns to bikes table
ALTER TABLE public.bikes 
ADD COLUMN weight NUMERIC,
ADD COLUMN price NUMERIC;