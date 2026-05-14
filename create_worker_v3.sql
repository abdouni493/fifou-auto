-- ============================================================
-- 🚀 WORKER CREATION WITH AUTH - V3
-- ============================================================
-- This script creates a security definer function to:
-- 1. Create a user in auth.users
-- 2. Create an identity in auth.identities (required for login)
-- 3. Sync with public.workers table
-- ============================================================

-- Ensure pgcrypto is enabled for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
    p_photo_url TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_encrypted_pw TEXT;
    v_now TIMESTAMP WITH TIME ZONE := now();
BEGIN
    -- 1. Validate Input
    IF p_email IS NULL OR p_email = '' THEN
        RETURN json_build_object('error', 'Email is required');
    END IF;
    
    IF p_username IS NULL OR p_username = '' THEN
        RETURN json_build_object('error', 'Username is required');
    END IF;

    -- 2. Check if email/username exists in workers
    IF EXISTS (SELECT 1 FROM public.workers WHERE email = p_email) THEN
        RETURN json_build_object('error', 'Email already exists');
    END IF;

    IF EXISTS (SELECT 1 FROM public.workers WHERE username = p_username) THEN
        RETURN json_build_object('error', 'Username already exists');
    END IF;

    -- 3. Check if email exists in auth.users
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
        RETURN json_build_object('error', 'Auth email already exists');
    END IF;

    -- 4. Generate ID and Encrypt password
    v_user_id := gen_random_uuid();
    v_encrypted_pw := crypt(p_password, gen_salt('bf'));

    -- 5. Insert into auth.users
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
        is_sso_user,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change
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
        false,
        '', '', '', ''
    );

    -- 6. Insert into auth.identities
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        v_user_id,
        v_user_id,
        jsonb_build_object('sub', v_user_id, 'email', p_email),
        'email',
        v_now,
        v_now,
        v_now
    );

    -- 7. The trigger 'on_auth_user_created' (from FINAL_AUTH_FIX.sql) 
    -- should automatically insert into public.workers.
    -- We wait or just update it to ensure all fields are correct.
    -- If the trigger hasn't run yet, we can insert manually.
    
    IF NOT EXISTS (SELECT 1 FROM public.workers WHERE id = v_user_id) THEN
        INSERT INTO public.workers (
            id, fullname, username, email, role, type, 
            telephone, address, payment_type, amount, 
            photo_url, password, created_at, updated_at
        ) VALUES (
            v_user_id, p_fullname, p_username, p_email, p_role, INITCAP(p_role),
            p_telephone, p_address, p_payment_type, p_amount,
            p_photo_url, p_password, v_now, v_now
        );
    ELSE
        UPDATE public.workers SET
            fullname = p_fullname,
            username = p_username,
            role = p_role,
            type = INITCAP(p_role),
            telephone = p_telephone,
            address = p_address,
            payment_type = p_payment_type,
            amount = p_amount,
            photo_url = p_photo_url,
            password = p_password,
            updated_at = v_now
        WHERE id = v_user_id;
    END IF;

    RETURN json_build_object('success', true, 'user_id', v_user_id);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
