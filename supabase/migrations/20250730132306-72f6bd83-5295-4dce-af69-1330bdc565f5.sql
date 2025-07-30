
-- Create table for receipt uploads
CREATE TABLE public.receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  image_url TEXT NOT NULL,
  original_filename TEXT,
  total_amount NUMERIC,
  purchase_date DATE,
  store_name TEXT,
  analysis_status TEXT DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed')),
  analysis_result JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for receipts
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own receipts" 
  ON public.receipts 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own receipts" 
  ON public.receipts 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own receipts" 
  ON public.receipts 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own receipts" 
  ON public.receipts 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Add receipt_id column to parts_inventory to link inventory items to receipts
ALTER TABLE public.parts_inventory 
ADD COLUMN receipt_id UUID REFERENCES public.receipts(id);

-- Create storage bucket for receipt images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipt-images', 'receipt-images', true);

-- Add RLS policies for receipt images bucket
CREATE POLICY "Users can upload receipt images" 
  ON storage.objects 
  FOR INSERT 
  WITH CHECK (bucket_id = 'receipt-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own receipt images" 
  ON storage.objects 
  FOR SELECT 
  USING (bucket_id = 'receipt-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own receipt images" 
  ON storage.objects 
  FOR DELETE 
  USING (bucket_id = 'receipt-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add trigger for updated_at on receipts table
CREATE TRIGGER update_receipts_updated_at 
  BEFORE UPDATE ON public.receipts 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();
