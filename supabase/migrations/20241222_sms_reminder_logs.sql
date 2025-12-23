-- SMS Reminder Logs Table Migration
-- Purpose: Track sent SMS reminders to prevent duplicates and provide audit trail

-- Create the sms_reminder_logs table
CREATE TABLE IF NOT EXISTS sms_reminder_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Reference to the appointment
    appointment_id UUID NOT NULL REFERENCES calendar_appointments(id) ON DELETE CASCADE,

    -- Reminder type: 'day_before' | 'day_of' | 'one_hour'
    reminder_type TEXT NOT NULL CHECK (reminder_type IN ('day_before', 'day_of', 'one_hour')),

    -- Reference to the employee who received the SMS
    recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_phone TEXT NOT NULL,

    -- Twilio response tracking
    twilio_message_sid TEXT,
    twilio_status TEXT, -- 'queued', 'sent', 'delivered', 'failed', 'undelivered'

    -- Error tracking
    error_message TEXT,

    -- Timestamps
    scheduled_for TIMESTAMPTZ NOT NULL, -- When the reminder was supposed to be sent
    sent_at TIMESTAMPTZ DEFAULT NOW(),

    -- Composite unique constraint to prevent duplicate sends
    CONSTRAINT unique_reminder_per_user UNIQUE (appointment_id, reminder_type, recipient_user_id)
);

-- Enable Row Level Security
ALTER TABLE sms_reminder_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Service role can manage all sms_reminder_logs (for the scheduler)
CREATE POLICY "Service role full access to sms_reminder_logs" ON sms_reminder_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Authenticated users can view their own reminder logs
CREATE POLICY "Users can view their own reminder logs" ON sms_reminder_logs
    FOR SELECT
    TO authenticated
    USING (recipient_user_id = auth.uid());

-- Indexes for efficient queries
CREATE INDEX idx_sms_reminder_logs_appointment ON sms_reminder_logs(appointment_id);
CREATE INDEX idx_sms_reminder_logs_type ON sms_reminder_logs(reminder_type);
CREATE INDEX idx_sms_reminder_logs_scheduled ON sms_reminder_logs(scheduled_for);
CREATE INDEX idx_sms_reminder_logs_recipient ON sms_reminder_logs(recipient_user_id);
CREATE INDEX idx_sms_reminder_logs_composite ON sms_reminder_logs(appointment_id, reminder_type, recipient_user_id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON sms_reminder_logs TO service_role;
GRANT SELECT ON sms_reminder_logs TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE sms_reminder_logs IS 'Tracks SMS reminders sent to employees for appointments. Prevents duplicate sends and provides audit trail.';
COMMENT ON COLUMN sms_reminder_logs.reminder_type IS 'Type of reminder: day_before (6:30 PM CST), day_of (9:30 AM CST), or one_hour (1 hour before)';
COMMENT ON COLUMN sms_reminder_logs.twilio_status IS 'Status from Twilio API: queued, sent, delivered, failed, undelivered';
