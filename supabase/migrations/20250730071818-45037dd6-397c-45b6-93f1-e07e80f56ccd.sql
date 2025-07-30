-- Create a table to track valuation history for the graph
CREATE TABLE public.valuation_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    total_estimated_value NUMERIC NOT NULL,
    total_bikes_valued INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.valuation_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own valuation history" 
ON public.valuation_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own valuation history" 
ON public.valuation_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add index for better performance
CREATE INDEX idx_valuation_history_user_id_created_at ON public.valuation_history (user_id, created_at);