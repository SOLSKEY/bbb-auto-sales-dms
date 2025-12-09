-- Enable Row Level Security (RLS) on all public tables
-- This addresses the security advisors from Supabase

-- Enable RLS on Users table
ALTER TABLE public."Users" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on Delinquency table
ALTER TABLE public."Delinquency" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on Inventory table
ALTER TABLE public."Inventory" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on DailyClosingReportsLog table
ALTER TABLE public."DailyClosingReportsLog" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on Sales table
ALTER TABLE public."Sales" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on Payments table
ALTER TABLE public."Payments" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on CommissionReportsLog table
ALTER TABLE public."CommissionReportsLog" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on status_logs table
ALTER TABLE public.status_logs ENABLE ROW LEVEL SECURITY;

-- Note: After enabling RLS, you'll need to create policies for each table
-- to allow authenticated users to read/write data. For example:
--
-- CREATE POLICY "Users can read their own data" ON public."Users"
--   FOR SELECT USING (auth.uid() = id);
--
-- You'll need to create appropriate policies based on your access requirements.



