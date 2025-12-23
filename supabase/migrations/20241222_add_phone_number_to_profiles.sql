-- Add phone_number column to profiles table
-- Created: December 22, 2024

-- Add phone_number column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Add a comment to document the column
COMMENT ON COLUMN public.profiles.phone_number IS 'Phone number for the user/coworker';

