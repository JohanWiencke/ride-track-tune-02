-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bikes table
CREATE TABLE public.bikes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  total_distance DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create component types table
CREATE TABLE public.component_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  default_replacement_distance DECIMAL(10,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bike components table (tracks installed components)
CREATE TABLE public.bike_components (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bike_id UUID NOT NULL REFERENCES public.bikes(id) ON DELETE CASCADE,
  component_type_id UUID NOT NULL REFERENCES public.component_types(id) ON DELETE CASCADE,
  install_distance DECIMAL(10,2) DEFAULT 0,
  replacement_distance DECIMAL(10,2) NOT NULL,
  current_distance DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create maintenance records table
CREATE TABLE public.maintenance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bike_component_id UUID NOT NULL REFERENCES public.bike_components(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('replaced', 'serviced', 'inspected')),
  distance_at_action DECIMAL(10,2) NOT NULL,
  notes TEXT,
  cost DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.component_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bike_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for bikes
CREATE POLICY "Users can view their own bikes" ON public.bikes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create bikes" ON public.bikes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own bikes" ON public.bikes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own bikes" ON public.bikes
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for component types (public read)
CREATE POLICY "Anyone can view component types" ON public.component_types
  FOR SELECT USING (true);

-- Create RLS policies for bike components
CREATE POLICY "Users can view components of their bikes" ON public.bike_components
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bikes 
      WHERE bikes.id = bike_components.bike_id 
      AND bikes.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can create components for their bikes" ON public.bike_components
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bikes 
      WHERE bikes.id = bike_components.bike_id 
      AND bikes.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update components of their bikes" ON public.bike_components
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.bikes 
      WHERE bikes.id = bike_components.bike_id 
      AND bikes.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete components of their bikes" ON public.bike_components
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.bikes 
      WHERE bikes.id = bike_components.bike_id 
      AND bikes.user_id = auth.uid()
    )
  );

-- Create RLS policies for maintenance records
CREATE POLICY "Users can view maintenance records of their bike components" ON public.maintenance_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bike_components bc
      JOIN public.bikes b ON bc.bike_id = b.id
      WHERE bc.id = maintenance_records.bike_component_id 
      AND b.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can create maintenance records for their bike components" ON public.maintenance_records
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bike_components bc
      JOIN public.bikes b ON bc.bike_id = b.id
      WHERE bc.id = maintenance_records.bike_component_id 
      AND b.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update maintenance records of their bike components" ON public.maintenance_records
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.bike_components bc
      JOIN public.bikes b ON bc.bike_id = b.id
      WHERE bc.id = maintenance_records.bike_component_id 
      AND b.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete maintenance records of their bike components" ON public.maintenance_records
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.bike_components bc
      JOIN public.bikes b ON bc.bike_id = b.id
      WHERE bc.id = maintenance_records.bike_component_id 
      AND b.user_id = auth.uid()
    )
  );

-- Insert default component types
INSERT INTO public.component_types (name, default_replacement_distance, description) VALUES
  ('Chain', 3000, 'Bike chain - replace every 3000km'),
  ('Cassette', 6000, 'Rear cassette - replace every 6000km'),
  ('Chainrings', 8000, 'Front chainrings - replace every 8000km'),
  ('Brake Pads', 2000, 'Brake pads - replace every 2000km'),
  ('Brake Cables', 5000, 'Brake cables - replace every 5000km'),
  ('Gear Cables', 5000, 'Gear cables - replace every 5000km'),
  ('Tires (Front)', 4000, 'Front tire - replace every 4000km'),
  ('Tires (Rear)', 3000, 'Rear tire - replace every 3000km'),
  ('Bar Tape', 2000, 'Handlebar tape - replace every 2000km'),
  ('Bottom Bracket', 15000, 'Bottom bracket - service every 15000km');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bikes_updated_at
  BEFORE UPDATE ON public.bikes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bike_components_updated_at
  BEFORE UPDATE ON public.bike_components
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();