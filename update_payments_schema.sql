
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    amount NUMERIC NOT NULL,
    payment_method TEXT DEFAULT 'Cash',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT
);

-- Add client_id to sales if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'sales' AND column_name = 'client_id') THEN
        ALTER TABLE public.sales ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
    END IF;
END $$;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.payments;
CREATE POLICY "Enable all for authenticated users" ON public.payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
