-- Add component_details column to bikes table for better valuation accuracy
ALTER TABLE public.bikes 
ADD COLUMN component_details TEXT;