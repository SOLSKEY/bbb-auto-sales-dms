-- Enable Row Level Security (RLS) on all public tables with basic policies
-- This addresses the security advisors from Supabase

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE public."Users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Delinquency" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Inventory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DailyClosingReportsLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Sales" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CommissionReportsLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE POLICIES FOR AUTHENTICATED USERS
-- ============================================
-- These policies allow authenticated users to read/write all data
-- Adjust these based on your specific access requirements

-- Users table: Allow authenticated users full access
CREATE POLICY "Authenticated users can manage users" ON public."Users"
  FOR ALL USING (auth.role() = 'authenticated');

-- Delinquency table: Allow authenticated users full access
CREATE POLICY "Authenticated users can manage delinquency" ON public."Delinquency"
  FOR ALL USING (auth.role() = 'authenticated');

-- Inventory table: Allow authenticated users full access
CREATE POLICY "Authenticated users can manage inventory" ON public."Inventory"
  FOR ALL USING (auth.role() = 'authenticated');

-- DailyClosingReportsLog table: Allow authenticated users full access
CREATE POLICY "Authenticated users can manage daily closing reports" ON public."DailyClosingReportsLog"
  FOR ALL USING (auth.role() = 'authenticated');

-- Sales table: Allow authenticated users full access
CREATE POLICY "Authenticated users can manage sales" ON public."Sales"
  FOR ALL USING (auth.role() = 'authenticated');

-- Payments table: Allow authenticated users full access
CREATE POLICY "Authenticated users can manage payments" ON public."Payments"
  FOR ALL USING (auth.role() = 'authenticated');

-- CommissionReportsLog table: Allow authenticated users full access
CREATE POLICY "Authenticated users can manage commission reports" ON public."CommissionReportsLog"
  FOR ALL USING (auth.role() = 'authenticated');

-- status_logs table: Allow authenticated users full access
CREATE POLICY "Authenticated users can manage status logs" ON public.status_logs
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- NOTES
-- ============================================
-- 1. These policies allow ALL authenticated users to access ALL data
-- 2. You may want to create more restrictive policies based on user roles
-- 3. Test thoroughly after applying these changes
-- 4. Consider creating separate policies for SELECT, INSERT, UPDATE, DELETE if needed



