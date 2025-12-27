-- Migration: Add "Is Name Change" column to Inventory table
-- Purpose: Flag vehicles that are for name changes, which should be excluded from inventory counts and inventory text out
-- Date: 2025-01-20

-- Add the column with default value of false
ALTER TABLE "Inventory" 
ADD COLUMN IF NOT EXISTS "Is Name Change" BOOLEAN DEFAULT FALSE;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_inventory_is_name_change 
ON "Inventory"("Is Name Change");

-- Add comment
COMMENT ON COLUMN "Inventory"."Is Name Change" IS 'When true, this vehicle is for a name change and should be excluded from inventory counts and inventory text out reports';

