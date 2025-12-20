-- Appointments & Leads Tables Schema
-- Run this SQL in your Supabase SQL Editor to create the appointments and leads tables
-- Created: December 2024

-- =============================================
-- TABLE: calendar_appointments
-- Purpose: Store scheduled customer appointments
-- =============================================
CREATE TABLE IF NOT EXISTS public.calendar_appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Customer Info
    title TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    lead_source TEXT,

    -- Appointment Details
    appointment_time TIMESTAMPTZ NOT NULL,
    down_payment_budget NUMERIC,
    notes TEXT,

    -- Status: scheduled, confirmed, showed, sold, no_show, cancelled
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'showed', 'sold', 'no_show', 'cancelled')),

    -- Vehicle Interest (array of inventory IDs)
    vehicle_ids UUID[],

    -- Model Interest (for when specific vehicle not available)
    -- e.g., ['Chrysler 300', 'Camaro', 'Equinox']
    model_interests TEXT[],

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLE: calendar_leads
-- Purpose: Store potential customers not ready for appointments
-- =============================================
CREATE TABLE IF NOT EXISTS public.calendar_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Customer Info
    customer_name TEXT,
    customer_phone TEXT,
    lead_source TEXT,
    down_payment_budget NUMERIC,
    notes TEXT,

    -- Vehicle Interest
    model_interests TEXT[],

    -- Potential timeframe (rough date when customer might be ready)
    potential_date DATE,

    -- Archive tracking (when lead came from a cancelled/no-show appointment)
    was_appointment BOOLEAN DEFAULT FALSE,
    original_appointment_id UUID REFERENCES public.calendar_appointments(id) ON DELETE SET NULL,
    original_appointment_date TIMESTAMPTZ,
    archive_reason TEXT, -- 'no_show', 'postponed', 'vehicle_sold', 'other'

    -- Follow-up history (JSONB array)
    -- Structure: [{ date: string, method: string, outcome: string, notes: string }]
    follow_ups JSONB DEFAULT '[]'::jsonb,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLE: user_colors
-- Purpose: Store user color assignments for calendar display
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_colors (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    color TEXT NOT NULL, -- Hex color code (e.g., '#f59e0b')
    assigned_by TEXT DEFAULT 'auto' CHECK (assigned_by IN ('auto', 'admin')),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

-- Appointments indexes
CREATE INDEX IF NOT EXISTS idx_calendar_appointments_user_id ON public.calendar_appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_appointments_status ON public.calendar_appointments(status);
CREATE INDEX IF NOT EXISTS idx_calendar_appointments_time ON public.calendar_appointments(appointment_time);
CREATE INDEX IF NOT EXISTS idx_calendar_appointments_customer_phone ON public.calendar_appointments(customer_phone);

-- Leads indexes
CREATE INDEX IF NOT EXISTS idx_calendar_leads_user_id ON public.calendar_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_leads_customer_phone ON public.calendar_leads(customer_phone);
CREATE INDEX IF NOT EXISTS idx_calendar_leads_potential_date ON public.calendar_leads(potential_date);
CREATE INDEX IF NOT EXISTS idx_calendar_leads_was_appointment ON public.calendar_leads(was_appointment);
CREATE INDEX IF NOT EXISTS idx_calendar_leads_created_at ON public.calendar_leads(created_at);

-- GIN index for array searches (model_interests)
CREATE INDEX IF NOT EXISTS idx_calendar_appointments_model_interests ON public.calendar_appointments USING GIN (model_interests);
CREATE INDEX IF NOT EXISTS idx_calendar_leads_model_interests ON public.calendar_leads USING GIN (model_interests);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.calendar_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_colors ENABLE ROW LEVEL SECURITY;

-- Appointments RLS Policies
-- All authenticated users can view all appointments (for team visibility)
CREATE POLICY "Authenticated users can view all appointments"
    ON public.calendar_appointments
    FOR SELECT
    TO authenticated
    USING (true);

-- Users can only insert their own appointments
CREATE POLICY "Users can insert their own appointments"
    ON public.calendar_appointments
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own appointments, admins can update all
CREATE POLICY "Users can update own appointments"
    ON public.calendar_appointments
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        )
    )
    WITH CHECK (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Users can delete their own appointments, admins can delete all
CREATE POLICY "Users can delete own appointments"
    ON public.calendar_appointments
    FOR DELETE
    TO authenticated
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Leads RLS Policies
-- All authenticated users can view all leads (for team visibility)
CREATE POLICY "Authenticated users can view all leads"
    ON public.calendar_leads
    FOR SELECT
    TO authenticated
    USING (true);

-- Users can only insert their own leads
CREATE POLICY "Users can insert their own leads"
    ON public.calendar_leads
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own leads, admins can update all
CREATE POLICY "Users can update own leads"
    ON public.calendar_leads
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        )
    )
    WITH CHECK (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Users can delete their own leads, admins can delete all
CREATE POLICY "Users can delete own leads"
    ON public.calendar_leads
    FOR DELETE
    TO authenticated
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- User Colors RLS Policies
-- All authenticated users can view all user colors
CREATE POLICY "Authenticated users can view all user colors"
    ON public.user_colors
    FOR SELECT
    TO authenticated
    USING (true);

-- Users can insert their own color
CREATE POLICY "Users can insert their own color"
    ON public.user_colors
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own color, admins can update all
CREATE POLICY "Users can update colors"
    ON public.user_colors
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        )
    )
    WITH CHECK (true);

-- =============================================
-- TRIGGERS
-- =============================================

-- Use existing update_updated_at_column function or create if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for calendar_appointments
DROP TRIGGER IF EXISTS update_calendar_appointments_updated_at ON public.calendar_appointments;
CREATE TRIGGER update_calendar_appointments_updated_at
    BEFORE UPDATE ON public.calendar_appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for calendar_leads
DROP TRIGGER IF EXISTS update_calendar_leads_updated_at ON public.calendar_leads;
CREATE TRIGGER update_calendar_leads_updated_at
    BEFORE UPDATE ON public.calendar_leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for user_colors
DROP TRIGGER IF EXISTS update_user_colors_updated_at ON public.user_colors;
CREATE TRIGGER update_user_colors_updated_at
    BEFORE UPDATE ON public.user_colors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- REALTIME
-- =============================================

-- Enable Realtime for appointments and leads (for live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_leads;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.calendar_appointments IS 'Stores scheduled customer appointments for vehicle viewings/purchases';
COMMENT ON TABLE public.calendar_leads IS 'Stores potential customers not ready for appointments, including archived appointments';
COMMENT ON TABLE public.user_colors IS 'Stores color assignments for each user for calendar display differentiation';

COMMENT ON COLUMN public.calendar_appointments.vehicle_ids IS 'Array of UUIDs referencing specific vehicles in inventory';
COMMENT ON COLUMN public.calendar_appointments.model_interests IS 'Array of model names when specific vehicle not available (e.g., Chrysler 300, Camaro)';
COMMENT ON COLUMN public.calendar_leads.was_appointment IS 'True if this lead was archived from a cancelled/no-show appointment';
COMMENT ON COLUMN public.calendar_leads.follow_ups IS 'JSONB array of follow-up logs: [{date, method, outcome, notes}]';
