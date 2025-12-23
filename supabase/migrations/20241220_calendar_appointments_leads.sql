-- Calendar Appointments & Leads Tables Migration
-- Created: December 20, 2024

-- ============================================
-- Table: calendar_appointments
-- Purpose: Store customer appointments for vehicle viewings/purchases
-- ============================================
CREATE TABLE IF NOT EXISTS calendar_appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    lead_source TEXT,
    appointment_time TIMESTAMPTZ NOT NULL,
    down_payment_budget NUMERIC(10, 2),
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'showed', 'sold', 'no_show', 'cancelled')),
    vehicle_ids UUID[] DEFAULT '{}',
    model_interests TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE calendar_appointments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for calendar_appointments
CREATE POLICY "Users can view all appointments" ON calendar_appointments
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own appointments" ON calendar_appointments
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own appointments" ON calendar_appointments
    FOR UPDATE USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
    ));

CREATE POLICY "Users can delete their own appointments" ON calendar_appointments
    FOR DELETE USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
    ));

-- Index for faster appointment lookups
CREATE INDEX idx_appointments_time ON calendar_appointments(appointment_time);
CREATE INDEX idx_appointments_user ON calendar_appointments(user_id);
CREATE INDEX idx_appointments_status ON calendar_appointments(status);
CREATE INDEX idx_appointments_phone ON calendar_appointments(customer_phone);

-- ============================================
-- Table: calendar_leads
-- Purpose: Track potential customers who aren't ready for appointments
-- ============================================
CREATE TABLE IF NOT EXISTS calendar_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    lead_source TEXT,
    down_payment_budget NUMERIC(10, 2),
    notes TEXT,
    model_interests TEXT[] DEFAULT '{}',
    potential_date DATE,
    priority TEXT DEFAULT 'warm' CHECK (priority IN ('hot', 'warm', 'cold')),
    was_appointment BOOLEAN DEFAULT FALSE,
    original_appointment_id UUID REFERENCES calendar_appointments(id) ON DELETE SET NULL,
    original_appointment_date TIMESTAMPTZ,
    follow_ups JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE calendar_leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for calendar_leads
CREATE POLICY "Users can view all leads" ON calendar_leads
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own leads" ON calendar_leads
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own leads" ON calendar_leads
    FOR UPDATE USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
    ));

CREATE POLICY "Users can delete their own leads" ON calendar_leads
    FOR DELETE USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
    ));

-- Indexes for calendar_leads
CREATE INDEX idx_leads_user ON calendar_leads(user_id);
CREATE INDEX idx_leads_phone ON calendar_leads(customer_phone);
CREATE INDEX idx_leads_created ON calendar_leads(created_at);
CREATE INDEX idx_leads_potential_date ON calendar_leads(potential_date);
CREATE INDEX idx_leads_priority ON calendar_leads(priority);

-- ============================================
-- Table: user_colors
-- Purpose: Store user color assignments for calendar display
-- ============================================
CREATE TABLE IF NOT EXISTS user_colors (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    color TEXT NOT NULL,
    assigned_by TEXT DEFAULT 'auto' CHECK (assigned_by IN ('auto', 'admin')),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_colors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_colors
CREATE POLICY "Users can view all user colors" ON user_colors
    FOR SELECT USING (true);

CREATE POLICY "Admins can insert user colors" ON user_colors
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
    ) OR auth.uid() = user_id);

CREATE POLICY "Admins can update user colors" ON user_colors
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
    ));

CREATE POLICY "Admins can delete user colors" ON user_colors
    FOR DELETE USING (EXISTS (
        SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
    ));

-- ============================================
-- Trigger: Auto-update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_calendar_appointments_updated_at
    BEFORE UPDATE ON calendar_appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_leads_updated_at
    BEFORE UPDATE ON calendar_leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_colors_updated_at
    BEFORE UPDATE ON user_colors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Lead Sources Table (Optional - for autocomplete)
-- ============================================
CREATE TABLE IF NOT EXISTS lead_sources (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    usage_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lead sources" ON lead_sources
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert lead sources" ON lead_sources
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update lead sources" ON lead_sources
    FOR UPDATE USING (true);
