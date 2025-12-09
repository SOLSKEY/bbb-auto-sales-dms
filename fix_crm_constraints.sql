-- First, let's check what constraints exist
-- Run this to see the current constraint:
-- SELECT conname, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'public.crm_leads'::regclass 
-- AND conname LIKE '%source%';

-- Drop the existing constraint if it exists (in case it's different)
ALTER TABLE public.crm_leads DROP CONSTRAINT IF EXISTS crm_leads_source_check;

-- Recreate the constraint with the correct values
ALTER TABLE public.crm_leads 
ADD CONSTRAINT crm_leads_source_check 
CHECK (source IN ('facebook', 'whatsapp', 'website'));

-- Also ensure status constraint is correct
ALTER TABLE public.crm_leads DROP CONSTRAINT IF EXISTS crm_leads_status_check;
ALTER TABLE public.crm_leads 
ADD CONSTRAINT crm_leads_status_check 
CHECK (status IN ('new', 'contacted', 'qualified', 'sold', 'lost'));

-- Ensure sentiment constraint is correct
ALTER TABLE public.crm_leads DROP CONSTRAINT IF EXISTS crm_leads_sentiment_check;
ALTER TABLE public.crm_leads 
ADD CONSTRAINT crm_leads_sentiment_check 
CHECK (sentiment IS NULL OR sentiment IN ('positive', 'neutral', 'negative'));

-- Ensure sender constraint is correct for messages
ALTER TABLE public.crm_messages DROP CONSTRAINT IF EXISTS crm_messages_sender_check;
ALTER TABLE public.crm_messages 
ADD CONSTRAINT crm_messages_sender_check 
CHECK (sender IN ('me', 'lead'));






