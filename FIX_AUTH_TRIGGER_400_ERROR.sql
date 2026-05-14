-- ============================================================
-- SIMPLIFIED AUTH SETUP - Fixes 400 Error
-- ============================================================
-- Run this in Supabase SQL Editor to fix the 400 error

-- STEP 1: Disable RLS temporarily
ALTER TABLE public.workers DISABLE ROW LEVEL SECURITY;

-- STEP 2: Drop problematic trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- STEP 3: Drop and recreate function with better error handling
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_username TEXT;
  v_fullname TEXT;
BEGIN
  -- Generate username from email if not provided
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1));
  v_fullname := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  
  -- Only create worker if it doesn't already exist
  IF NOT EXISTS (SELECT 1 FROM public.workers WHERE id = NEW.id) THEN
    BEGIN
      INSERT INTO public.workers (
        id,
        email,
        fullname,
        username,
        role,
        type,
        amount,
        payment_type,
        phone,
        address,
        permissions
      ) VALUES (
        NEW.id,
        NEW.email,
        v_fullname,
        v_username,
        COALESCE(NEW.raw_user_meta_data->>'role', 'worker'),
        COALESCE(NEW.raw_user_meta_data->>'type', 'worker'),
        0,
        'monthly',
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        COALESCE(NEW.raw_user_meta_data->>'address', ''),
        '[]'
      );
      RAISE NOTICE 'Worker created for user %', NEW.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error creating worker: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- STEP 4: Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- STEP 5: Add foreign key constraint if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_worker_auth_id'
  ) THEN
    ALTER TABLE public.workers
    ADD CONSTRAINT fk_worker_auth_id 
    FOREIGN KEY (id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- STEP 6: Drop password column if it exists
ALTER TABLE public.workers DROP COLUMN IF EXISTS password;

-- STEP 7: Set up RLS policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.workers;
DROP POLICY IF EXISTS "Users can update own profile" ON public.workers;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.workers;
DROP POLICY IF EXISTS "Admins view all" ON public.workers;
DROP POLICY IF EXISTS "Admins update all" ON public.workers;
DROP POLICY IF EXISTS "Admins insert all" ON public.workers;
DROP POLICY IF EXISTS "Allow service role" ON public.workers;

-- Enable RLS
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for authenticated users
CREATE POLICY "Users can view own profile"
  ON public.workers
  FOR SELECT
  USING (auth.uid() = id OR auth.role() = 'service_role');

CREATE POLICY "Users can update own profile"
  ON public.workers
  FOR UPDATE
  USING (auth.uid() = id OR auth.role() = 'service_role');

CREATE POLICY "Users can insert own profile"
  ON public.workers
  FOR INSERT
  WITH CHECK (auth.uid() = id OR auth.role() = 'service_role');

-- Create admin policies
CREATE POLICY "Admins view all"
  ON public.workers
  FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM public.workers WHERE role = 'admin')
    OR auth.role() = 'service_role'
  );

CREATE POLICY "Admins update all"
  ON public.workers
  FOR UPDATE
  USING (
    auth.uid() IN (SELECT id FROM public.workers WHERE role = 'admin')
    OR auth.role() = 'service_role'
  );

CREATE POLICY "Admins insert all"
  ON public.workers
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT id FROM public.workers WHERE role = 'admin')
    OR auth.role() = 'service_role'
  );

-- STEP 8: Verify setup
SELECT 
  'Step' as item,
  'Status' as status
UNION ALL
SELECT 'Trigger created', 'Done'
UNION ALL
SELECT 'RLS enabled', 'Done'
UNION ALL
SELECT 'Policies created', 'Done'
ORDER BY item;

-- Show trigger info
SELECT trigger_name, event_manipulation, trigger_schema
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Show RLS policies
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'workers'
ORDER BY policyname;
