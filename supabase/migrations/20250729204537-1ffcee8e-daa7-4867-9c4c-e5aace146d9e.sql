-- Create storage buckets for bike images and profile pictures
INSERT INTO storage.buckets (id, name, public) VALUES ('bike-images', 'bike-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-pictures', 'profile-pictures', true);

-- Create storage policies for bike images
CREATE POLICY "Anyone can view bike images" ON storage.objects FOR SELECT USING (bucket_id = 'bike-images');

CREATE POLICY "Users can upload bike images" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'bike-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their bike images" ON storage.objects FOR UPDATE USING (
  bucket_id = 'bike-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their bike images" ON storage.objects FOR DELETE USING (
  bucket_id = 'bike-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create storage policies for profile pictures
CREATE POLICY "Anyone can view profile pictures" ON storage.objects FOR SELECT USING (bucket_id = 'profile-pictures');

CREATE POLICY "Users can upload their profile picture" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'profile-pictures' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their profile picture" ON storage.objects FOR UPDATE USING (
  bucket_id = 'profile-pictures' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their profile picture" ON storage.objects FOR DELETE USING (
  bucket_id = 'profile-pictures' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add image_url column to bikes table
ALTER TABLE public.bikes ADD COLUMN image_url TEXT;

-- Add avatar_url column to profiles table
ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;