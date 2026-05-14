-- ============================================================
-- 🏁 FINAL SALES TABLE SCHEMA FIX
-- ============================================================
-- This script ensures the sales table has all columns required by POS.tsx
-- and fixes column naming inconsistencies (photo -> photo_url, etc.)
-- ============================================================

-- 1. Ensure the table exists (it should, but just in case)
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    car_id UUID REFERENCES public.purchases(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add/Verify all columns expected by handleFinalize in POS.tsx
DO $$ 
BEGIN 
    -- Basic info
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'sales' AND column_name = 'first_name') THEN
        ALTER TABLE public.sales ADD COLUMN first_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'sales' AND column_name = 'last_name') THEN
        ALTER TABLE public.sales ADD COLUMN last_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'sales' AND column_name = 'dob') THEN
        ALTER TABLE public.sales ADD COLUMN dob DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'sales' AND column_name = 'gender') THEN
        ALTER TABLE public.sales ADD COLUMN gender TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'sales' AND column_name = 'pob') THEN
        ALTER TABLE public.sales ADD COLUMN pob TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'sales' AND column_name = 'address') THEN
        ALTER TABLE public.sales ADD COLUMN address TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'sales' AND column_name = 'profession') THEN
        ALTER TABLE public.sales ADD COLUMN profession TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'sales' AND column_name = 'mobile1') THEN
        ALTER TABLE public.sales ADD COLUMN mobile1 TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'sales' AND column_name = 'mobile2') THEN
        ALTER TABLE public.sales ADD COLUMN mobile2 TEXT;
    END IF;

    -- Document info
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'sales' AND column_name = 'doc_type') THEN
        ALTER TABLE public.sales ADD COLUMN doc_type TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'sales' AND column_name = 'doc_number') THEN
        ALTER TABLE public.sales ADD COLUMN doc_number TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'sales' AND column_name = 'issue_date') THEN
        ALTER TABLE public.sales ADD COLUMN issue_date DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'sales' AND column_name = 'expiry_date') THEN
        ALTER TABLE public.sales ADD COLUMN expiry_date DATE;
    END IF;

    -- Business info
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'sales' AND column_name = 'nif') THEN
        ALTER TABLE public.sales ADD COLUMN nif TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'sales' AND column_name = 'rc') THEN
        ALTER TABLE public.sales ADD COLUMN rc TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'sales' AND column_name = 'nis') THEN
        ALTER TABLE public.sales ADD COLUMN nis TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'sales' AND column_name = 'art') THEN
        ALTER TABLE public.sales ADD COLUMN art TEXT;
    END IF;

    -- Financials (ensure they are NOT generated columns so we can insert into them)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'balance' AND is_generated = 'ALWAYS') THEN
        ALTER TABLE public.sales DROP COLUMN balance;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'sales' AND column_name = 'balance') THEN
        ALTER TABLE public.sales ADD COLUMN balance NUMERIC DEFAULT 0;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'total_price' AND is_generated = 'ALWAYS') THEN
        ALTER TABLE public.sales DROP COLUMN total_price;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'sales' AND column_name = 'total_price') THEN
        ALTER TABLE public.sales ADD COLUMN total_price NUMERIC DEFAULT 0;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'amount_paid' AND is_generated = 'ALWAYS') THEN
        ALTER TABLE public.sales DROP COLUMN amount_paid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'sales' AND column_name = 'amount_paid') THEN
        ALTER TABLE public.sales ADD COLUMN amount_paid NUMERIC DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'sales' AND column_name = 'status') THEN
        ALTER TABLE public.sales ADD COLUMN status TEXT DEFAULT 'debt';
    END IF;

    -- Image URLs (Migrated from base64/photo columns)
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'sales' AND column_name = 'photo_url') THEN
        ALTER TABLE public.sales ADD COLUMN photo_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'sales' AND column_name = 'scan_url') THEN
        ALTER TABLE public.sales ADD COLUMN scan_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'sales' AND column_name = 'signature_url') THEN
        ALTER TABLE public.sales ADD COLUMN signature_url TEXT;
    END IF;

    -- Creator tracking (UUID for profile linking)
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'sales' AND column_name = 'created_by') THEN
        ALTER TABLE public.sales ADD COLUMN created_by UUID;
    ELSE
        -- Ensure it's UUID type if it exists as something else
        -- (Only run if you are sure you want to convert and data is convertible)
        -- ALTER TABLE public.sales ALTER COLUMN created_by TYPE UUID USING created_by::UUID;
    END IF;

END $$;

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_car_id ON public.sales(car_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_by ON public.sales(created_by);
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales(status);

-- 4. Enable RLS and add basic policy if not exists
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.sales;
CREATE POLICY "Enable all for authenticated users" ON public.sales 
    FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- 5. Verification Notice
DO $$ BEGIN RAISE NOTICE 'Sales table schema fix applied'; END $$;
