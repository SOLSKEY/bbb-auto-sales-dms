-- Migration: Allow users to update their own color
-- Update RLS policy to allow users to update their own user color
-- Also update the assigned_by constraint to allow 'user' as a value

-- Drop existing update policy
DROP POLICY IF EXISTS "Admins can update user colors" ON user_colors;

-- Create new policy that allows both admins and users to update their own color
CREATE POLICY "Users and admins can update user colors" ON user_colors
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
        ) OR auth.uid() = user_id
    );

-- Update the assigned_by constraint to allow 'user' as well
ALTER TABLE user_colors DROP CONSTRAINT IF EXISTS user_colors_assigned_by_check;
ALTER TABLE user_colors ADD CONSTRAINT user_colors_assigned_by_check 
    CHECK (assigned_by IN ('auto', 'admin', 'user'));

