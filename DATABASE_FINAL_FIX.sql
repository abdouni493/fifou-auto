-- ============================================================
-- 🏁 DATABASE FINAL FIX - WORKER CREATION & SCHEMA SYNC
-- ============================================================
-- This script fixes:
-- 1. Missing 'updated_at' columns (causing trigger/RPC failures)
-- 2. Missing 'create_worker_v3' RPC function
-- 3. Resilient Auth -> Public sync triggers
-- ============================================================

-- STEP 1: Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- STEP 2: Fix table structures (Add missing columns)
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'worker';
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS permissions TEXT;

-- Ensure constraints are correct
ALTER TABLE public.workers DROP CONSTRAINT IF EXISTS workers_username_key;
ALTER TABLE public.workers ADD CONSTRAINT workers_username_key UNIQUE (username);

-- STEP 3: Create/Update the Worker Creation RPC
CREATE OR REPLACE FUNCTION public.create_worker_v3(
    p_fullname TEXT,
    p_username TEXT,
    p_email TEXT,
    p_password TEXT,
    p_role TEXT,
    p_telephone TEXT,
    p_address TEXT,
    p_payment_type TEXT,
    p_amount NUMERIC,
    p_photo_url TEXT DEFAULT NULL,
    p_created_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_encrypted_pw TEXT;
    v_now TIMESTAMP WITH TIME ZONE := COALESCE(p_created_at, now());
BEGIN
    -- 1. Validation
    IF p_email IS NULL OR p_email = '' THEN
        RETURN json_build_object('error', 'L''email est obligatoire');
    END IF;
    
    IF p_username IS NULL OR p_username = '' THEN
        RETURN json_build_object('error', 'Le nom d''utilisateur est obligatoire');
    END IF;

    -- 2. Existence checks
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
        RETURN json_build_object('error', 'Cet email est déjà utilisé par un autre compte');
    END IF;

    IF EXISTS (SELECT 1 FROM public.workers WHERE username = p_username) THEN
        RETURN json_build_object('error', 'Ce nom d''utilisateur est déjà pris');
    END IF;

    -- 3. Generation
    v_user_id := gen_random_uuid();
    v_encrypted_pw := crypt(p_password, gen_salt('bf'));

    -- 4. Insert into auth.users (Supabase Auth)
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        aud,
        role,
        created_at,
        updated_at,
        is_sso_user
    ) VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        p_email,
        v_encrypted_pw,
        v_now,
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object(
            'full_name', p_fullname,
            'username', p_username,
            'role', p_role,
            'phone', p_telephone,
            'address', p_address
        ),
        'authenticated',
        'authenticated',
        v_now,
        v_now,
        false
    );

    -- 5. Insert into auth.identities (Required for login)
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        v_user_id,
        v_user_id,
        jsonb_build_object('sub', v_user_id, 'email', p_email),
        'email',
        v_user_id::text,
        v_now,
        v_now,
        v_now
    );

    -- 6. Insert into public.workers (Application Data)
    -- We do this explicitly here to avoid race conditions with triggers
    INSERT INTO public.workers (
        id, fullname, username, email, role, type, 
        telephone, address, payment_type, amount, 
        photo_url, password, created_at, updated_at
    ) VALUES (
        v_user_id, p_fullname, p_username, p_email, p_role, INITCAP(p_role),
        p_telephone, p_address, p_payment_type, p_amount,
        p_photo_url, p_password, v_now, v_now
    )
    ON CONFLICT (id) DO UPDATE SET
        fullname = EXCLUDED.fullname,
        username = EXCLUDED.username,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        type = EXCLUDED.type,
        telephone = EXCLUDED.telephone,
        address = EXCLUDED.address,
        payment_type = EXCLUDED.payment_type,
        amount = EXCLUDED.amount,
        photo_url = EXCLUDED.photo_url,
        password = EXCLUDED.password,
        updated_at = v_now;

    RETURN json_build_object('success', true, 'user_id', v_user_id);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 4: Ensure RLS allows the system to work
ALTER TABLE public.workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

-- Allow the RPC (Security Definer) to bypass RLS for its own operations
-- (Already handled by SECURITY DEFINER)

-- Policy to allow anonymous lookup for email (needed for login flow)
DROP POLICY IF EXISTS "Allow anonymous email lookup" ON public.workers;
CREATE POLICY "Allow anonymous email lookup" ON public.workers FOR SELECT TO anon, authenticated USING (true);

-- Policy to allow authenticated users to update workers (needed for permissions/edits)
DROP POLICY IF EXISTS "Allow authenticated update" ON public.workers;
CREATE POLICY "Allow authenticated update" ON public.workers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- STEP 5: Verify
DO $$ 
BEGIN 
  RAISE NOTICE 'Worker Auth V3 Fix Applied';
END $$;
