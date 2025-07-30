
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create bikes table
CREATE TABLE public.bikes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    year INTEGER,
    bike_type TEXT NOT NULL DEFAULT 'road',
    total_distance DECIMAL(10,2) DEFAULT 0 NOT NULL,
    weight DECIMAL(5,2),
    price DECIMAL(10,2),
    image_url TEXT,
    purchase_date DATE,
    component_details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create component_types table
CREATE TABLE public.component_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    default_replacement_distance INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create bike_components table
CREATE TABLE public.bike_components (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bike_id UUID REFERENCES public.bikes(id) ON DELETE CASCADE NOT NULL,
    component_type_id UUID REFERENCES public.component_types(id) ON DELETE CASCADE NOT NULL,
    replacement_distance INTEGER NOT NULL,
    current_distance DECIMAL(10,2) DEFAULT 0 NOT NULL,
    install_distance DECIMAL(10,2) DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create maintenance_records table
CREATE TABLE public.maintenance_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bike_component_id UUID REFERENCES public.bike_components(id) ON DELETE CASCADE NOT NULL,
    action_type TEXT NOT NULL,
    distance_at_action DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create parts_inventory table
CREATE TABLE public.parts_inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    component_type_id UUID REFERENCES public.component_types(id) ON DELETE CASCADE NOT NULL,
    quantity INTEGER DEFAULT 0 NOT NULL,
    purchase_price DECIMAL(10,2),
    purchase_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.bikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.component_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bike_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts_inventory ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bikes
CREATE POLICY "Users can view their own bikes" ON public.bikes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bikes" ON public.bikes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bikes" ON public.bikes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bikes" ON public.bikes
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for component_types (readable by all authenticated users)
CREATE POLICY "Authenticated users can view component types" ON public.component_types
    FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies for bike_components
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

-- RLS Policies for maintenance_records
CREATE POLICY "Users can view maintenance records of their bike components" ON public.maintenance_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.bike_components bc
            JOIN public.bikes b ON b.id = bc.bike_id
            WHERE bc.id = maintenance_records.bike_component_id 
            AND b.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create maintenance records for their bike components" ON public.maintenance_records
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.bike_components bc
            JOIN public.bikes b ON b.id = bc.bike_id
            WHERE bc.id = maintenance_records.bike_component_id 
            AND b.user_id = auth.uid()
        )
    );

-- RLS Policies for parts_inventory
CREATE POLICY "Users can view their own inventory" ON public.parts_inventory
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own inventory" ON public.parts_inventory
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inventory" ON public.parts_inventory
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own inventory" ON public.parts_inventory
    FOR DELETE USING (auth.uid() = user_id);

-- Insert some default component types
INSERT INTO public.component_types (name, default_replacement_distance, description) VALUES
('Chain', 3000, 'Bicycle chain that transfers power from pedals to rear wheel'),
('Cassette', 5000, 'Rear gear cluster'),
('Chain Rings', 8000, 'Front chainrings attached to crankset'),
('Brake Pads', 2000, 'Brake pads for rim or disc brakes'),
('Tires', 4000, 'Front and rear tires'),
('Cables', 6000, 'Brake and derailleur cables'),
('Bar Tape', 1500, 'Handlebar tape for road bikes'),
('Bottom Bracket', 15000, 'Bottom bracket bearings'),
('Headset', 20000, 'Headset bearings'),
('Derailleur Hanger', 10000, 'Replaceable derailleur hanger');
