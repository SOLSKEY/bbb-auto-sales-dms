-- Migration: Fix status_logs CASCADE constraint to allow logs to persist after vehicle deletion
-- This allows vehicles sent to Nashville to appear in the inventory text out even after deletion

-- Drop the existing foreign key constraint with CASCADE
ALTER TABLE status_logs 
DROP CONSTRAINT IF EXISTS status_logs_vehicle_id_fkey;

-- Recreate the foreign key constraint without CASCADE (or with SET NULL)
-- This allows status logs to persist even after the vehicle is deleted
ALTER TABLE status_logs
ADD CONSTRAINT status_logs_vehicle_id_fkey 
FOREIGN KEY (vehicle_id) 
REFERENCES "Inventory"("Vehicle ID") 
ON DELETE SET NULL;

-- Note: vehicle_id can now be NULL for deleted vehicles
-- The formatted vehicle string is stored in previous_status in format: "STATUS|FORMATTED_VEHICLE"




