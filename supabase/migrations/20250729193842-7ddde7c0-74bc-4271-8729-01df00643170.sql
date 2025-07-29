-- Create parts inventory table
CREATE TABLE public.parts_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  component_type_id UUID NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  purchase_price NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (component_type_id) REFERENCES public.component_types(id) ON DELETE CASCADE
);

-- Enable RLS on parts_inventory
ALTER TABLE public.parts_inventory ENABLE ROW LEVEL SECURITY;

-- Create policies for parts_inventory
CREATE POLICY "Users can view their own inventory" 
ON public.parts_inventory 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own inventory items" 
ON public.parts_inventory 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inventory items" 
ON public.parts_inventory 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own inventory items" 
ON public.parts_inventory 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_parts_inventory_updated_at
BEFORE UPDATE ON public.parts_inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();