CREATE TABLE IF NOT EXISTS public.crm_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    vehicle TEXT,
    budget NUMERIC,
    source TEXT NOT NULL CHECK (source IN ('facebook', 'whatsapp', 'website')),
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'sold', 'lost')),
    sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    last_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.crm_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('me', 'lead')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_leads_user_id ON public.crm_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON public.crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_crm_messages_lead_id ON public.crm_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_messages_created_at ON public.crm_messages(created_at);

ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own leads"
    ON public.crm_leads
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own leads"
    ON public.crm_leads
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own leads"
    ON public.crm_leads
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own leads"
    ON public.crm_leads
    FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view messages for their leads"
    ON public.crm_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.crm_leads
            WHERE crm_leads.id = crm_messages.lead_id
            AND crm_leads.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages for their leads"
    ON public.crm_messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.crm_leads
            WHERE crm_leads.id = crm_messages.lead_id
            AND crm_leads.user_id = auth.uid()
        )
    );

ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_messages;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_crm_leads_updated_at
    BEFORE UPDATE ON public.crm_leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();




