-- Migration: Create status_logs table for tracking official vehicle status changes
-- This table tracks when vehicles change status, but only for "Official" updates
-- "Testing" updates will not be logged here

CREATE TABLE IF NOT EXISTS status_logs (
    id BIGSERIAL PRIMARY KEY,
    vehicle_id TEXT REFERENCES "Inventory"("Vehicle ID") ON DELETE CASCADE,
    previous_status TEXT,
    new_status TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on vehicle_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_status_logs_vehicle_id ON status_logs(vehicle_id);

-- Create index on changed_at for date-based queries (used in nightly report)
CREATE INDEX IF NOT EXISTS idx_status_logs_changed_at ON status_logs(changed_at);

-- Create index on new_status for filtering by status type
CREATE INDEX IF NOT EXISTS idx_status_logs_new_status ON status_logs(new_status);

-- Add comment to table
COMMENT ON TABLE status_logs IS 'Tracks official vehicle status changes. Only "Official" updates are logged here; "Testing" updates are not recorded.';

