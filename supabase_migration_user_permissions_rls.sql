-- Migration: Set up RLS policies for UserPermissions table
-- This allows users to read their own permissions while only admins can modify them

-- Enable RLS on UserPermissions table if not already enabled
ALTER TABLE "UserPermissions" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own permissions" ON "UserPermissions";
DROP POLICY IF EXISTS "Service role can do anything" ON "UserPermissions";

-- Policy 1: Allow users to read their own permissions
CREATE POLICY "Users can view their own permissions"
ON "UserPermissions"
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy 2: Allow service role (admin operations) full access
-- This ensures admin operations through adminSupabase still work
CREATE POLICY "Service role can do anything"
ON "UserPermissions"
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Note: Regular authenticated users can only READ their own permissions
-- Only admins (via service_role) can INSERT, UPDATE, or DELETE permissions
