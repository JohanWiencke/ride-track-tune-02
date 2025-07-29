-- Add Wahoo integration columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN wahoo_access_token TEXT,
ADD COLUMN wahoo_refresh_token TEXT,
ADD COLUMN wahoo_user_id TEXT;