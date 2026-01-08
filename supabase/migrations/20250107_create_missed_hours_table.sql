-- Create table for logging missed hours by salesperson
CREATE TABLE IF NOT EXISTS missed_hours (
    id BIGSERIAL PRIMARY KEY,
    salesperson TEXT NOT NULL,
    date DATE NOT NULL,
    hours INTEGER NOT NULL DEFAULT 0,
    minutes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(salesperson, date)
);

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_missed_hours_salesperson_date ON missed_hours(salesperson, date);
CREATE INDEX IF NOT EXISTS idx_missed_hours_date ON missed_hours(date);

-- Add comment
COMMENT ON TABLE missed_hours IS 'Tracks missed hours for salespeople by date. Used for commission report calculations.';

