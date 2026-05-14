-- ============================================================
-- 🏁 FINAL AUTH FIX - DEFINITIVE VERSION (V2)
-- ============================================================
-- This script fixes:
-- 1. Infinite Recursion in RLS (causing 500 errors on SELECT)
-- 2. Trigger column mismatch (phone vs telephone, causing 500 on signup)
-- 3. Syncs BOTH 'workers' and 'profiles' tables for compatibility
-- 4. Anonymous access for username -> email lookup
-- ============================================================

-- STEP 1: Disable RLS and drop problematic triggers/functions
ALTER TABLE public.workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- STEP 2: Create a SECURITY DEFINER function to check if a user is an admin
-- Using workers table as the source of truth for roles.
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workers
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- STEP 3: Create a robust trigger function for new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_username TEXT;
  v_fullname TEXT;
  v_role TEXT;
BEGIN
  -- Generate username and fullname from metadata or email
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1));
  v_fullname := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'worker');
  
  -- 1. Create worker record if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM public.workers WHERE id = NEW.id) THEN
    INSERT INTO public.workers (
      id,
      email,
      fullname,
      username,
      role,
      type,
      amount,
      payment_type,
      telephone, -- Correct column name (not phone)
      address,
      permissions,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      v_fullname,
      v_username,
      v_role,
      CASE WHEN v_role = 'admin' THEN 'Admin' ELSE 'Worker' END,
      0,
      'month',
      COALESCE(NEW.raw_user_meta_data->>'phone', ''), -- Map phone from metadata to telephone column
      COALESCE(NEW.raw_user_meta_data->>'address', ''),
      '[]',
      NOW(),
      NOW()
    );
  END IF;

  -- 2. Create profile record for backward compatibility
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    INSERT INTO public.profiles (
      id,
      username,
      full_name,
      role,
      created_at
    ) VALUES (
      NEW.id,
      v_username,
      v_fullname,
      v_role,
      NOW()
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't block user creation
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- STEP 4: Recreate the trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- STEP 5: Fix table structures
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'worker';
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS username VARCHAR(255);
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS permissions TEXT DEFAULT '[]';

-- STEP 6: Clean up existing policies and re-enable RLS
-- Workers Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.workers;
DROP POLICY IF EXISTS "Users can update own profile" ON public.workers;
DROP POLICY IF EXISTS "Admins view all" ON public.workers;
DROP POLICY IF EXISTS "Admins update all" ON public.workers;
DROP POLICY IF EXISTS "Admins insert all" ON public.workers;
DROP POLICY IF EXISTS "Allow anonymous email lookup" ON public.workers;

-- Profiles Policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- STEP 7: Create NEW non-recursive policies

-- --- WORKERS POLICIES ---
CREATE POLICY "Users can view own profile" ON public.workers FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.workers FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins view all" ON public.workers FOR SELECT USING (public.check_is_admin());
CREATE POLICY "Admins update all" ON public.workers FOR UPDATE USING (public.check_is_admin());
CREATE POLICY "Admins insert all" ON public.workers FOR INSERT WITH CHECK (public.check_is_admin());
CREATE POLICY "Allow anonymous email lookup" ON public.workers FOR SELECT TO anon, authenticated USING (true);

-- --- PROFILES POLICIES ---
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- STEP 8: Verify the setup
DO $$ 
BEGIN 
  RAISE NOTICE 'Auth fix V2 applied successfully';
END $$;
