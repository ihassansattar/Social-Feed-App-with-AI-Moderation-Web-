-- Add cover_image_url column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- Update existing profiles to have a default cover image URL if needed
-- This is optional and can be removed if you don't want to set default values
-- UPDATE profiles SET cover_image_url = NULL WHERE cover_image_url IS NULL; 