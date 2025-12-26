-- Migration: Create commission_report_collections_bonus table
-- Purpose: Store collections bonus selections per commission report week
-- Timezone: All timestamps use timestamptz with CST handling

CREATE TABLE IF NOT EXISTS commission_report_collections_bonus (
    week_key TEXT PRIMARY KEY,
    collections_bonus NUMERIC(10, 2) NOT NULL,
    locked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups by week_key
CREATE INDEX IF NOT EXISTS idx_commission_collections_bonus_week_key 
ON commission_report_collections_bonus(week_key);

-- Index for faster lookups by locked status
CREATE INDEX IF NOT EXISTS idx_commission_collections_bonus_locked 
ON commission_report_collections_bonus(locked);

-- Enable RLS (Row Level Security)
ALTER TABLE commission_report_collections_bonus ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read all commission collections bonuses
CREATE POLICY "Users can read commission collections bonuses"
ON commission_report_collections_bonus
FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow authenticated users to insert commission collections bonuses
CREATE POLICY "Users can insert commission collections bonuses"
ON commission_report_collections_bonus
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Allow authenticated users to update commission collections bonuses
CREATE POLICY "Users can update commission collections bonuses"
ON commission_report_collections_bonus
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy: Allow authenticated users to delete commission collections bonuses
CREATE POLICY "Users can delete commission collections bonuses"
ON commission_report_collections_bonus
FOR DELETE
TO authenticated
USING (true);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_commission_collections_bonus_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_commission_collections_bonus_updated_at
BEFORE UPDATE ON commission_report_collections_bonus
FOR EACH ROW
EXECUTE FUNCTION update_commission_collections_bonus_updated_at();

COMMENT ON TABLE commission_report_collections_bonus IS 'Stores collections bonus selections and lock status for each commission report week (Friday-Thursday)';
COMMENT ON COLUMN commission_report_collections_bonus.week_key IS 'Commission week identifier in format YYYY-MM-DD (Friday of the week)';
COMMENT ON COLUMN commission_report_collections_bonus.collections_bonus IS 'Collections bonus amount in dollars';
COMMENT ON COLUMN commission_report_collections_bonus.locked IS 'Whether the collections bonus is locked for this week';
COMMENT ON COLUMN commission_report_collections_bonus.created_at IS 'Timestamp when the record was created (CST)';
COMMENT ON COLUMN commission_report_collections_bonus.updated_at IS 'Timestamp when the record was last updated (CST)';

