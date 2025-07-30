-- Add foreign key relationship between bike_valuations and bikes
ALTER TABLE bike_valuations ADD CONSTRAINT fk_bike_valuations_bike_id 
FOREIGN KEY (bike_id) REFERENCES bikes(id) ON DELETE CASCADE;