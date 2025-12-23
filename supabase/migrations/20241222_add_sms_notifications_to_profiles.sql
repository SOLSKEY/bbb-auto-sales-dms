-- Add sms_notifications_enabled column to profiles table
-- Created: December 22, 2024

-- Add sms_notifications_enabled column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS sms_notifications_enabled BOOLEAN DEFAULT true;

-- Add a comment to document the column
COMMENT ON COLUMN public.profiles.sms_notifications_enabled IS 'Whether the user wants to receive SMS notifications for appointment reminders';

