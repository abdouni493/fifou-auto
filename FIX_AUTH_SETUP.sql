-- ============================================================
-- FIX AUTH SETUP - Supabase Authentication Implementation
-- ============================================================

-- 0. IMPORTANT: Disable RLS temporarily during setup
-- We'll re-enable it after the trigger is working
ALTER TABLE public.workers DISABLE ROW LEVEL SECURITY;

-- 1. Enable the auth schema if not already enabled
-- (This is typically already enabled in Supabase)

-- 2. Update workers table to link with auth.users
-- First, backup existing data
CREATE TABLE workers_backup AS SELECT * FROM workers;

-- 3. Drop existing constraints if any
ALTER TABLE workers 
DROP CONSTRAINT IF EXISTS fk_worker_id;

-- 4. Ensure workers table has proper structure
-- Remove password column as we'll use Supabase Auth
ALTER TABLE workers 
DROP COLUMN IF EXISTS password;

-- 5. Ensure id column is UUID and primary key
-- If the table needs to be recreated, do this:
-- Note: Only run if id is not already UUID
-- ALTER TABLE workers 
-- ALTER COLUMN id SET DATA TYPE UUID USING id::UUID;

-- 6. Add foreign key constraint to auth.users if not exists
ALTER TABLE workers
ADD CONSTRAINT fk_worker_auth_id 
FOREIGN KEY (id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- 7. Create trigger to automatically create worker on new user signup
-- This function is SECURITY DEFINER so it bypasses RLS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create worker if it doesn't already exist
  IF NOT EXISTS (SELECT 1 FROM public.workers WHERE id = NEW.id) THEN
    INSERT INTO public.workers (
      id,
      email,
      fullname,
      role,
      type,
      amount,
      payment_type,
      phone,
      address,
      permissions,
      username,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
      COALESCE(NEW.raw_user_meta_data->>'role', 'worker'),
      COALESCE(NEW.raw_user_meta_data->>'type', 'worker'),
      0,
      'monthly',
      COALESCE(NEW.raw_user_meta_data->>'phone', ''),
      COALESCE(NEW.raw_user_meta_data->>'address', ''),
      COALESCE(NEW.raw_user_meta_data->>'permissions', '[]'),
      COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
      NOW(),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. Create or replace trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Enable Row Level Security on workers table
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

-- 10. Drop all existing policies first
DROP POLICY IF EXISTS "Users can view their own worker profile" ON public.workers;
DROP POLICY IF EXISTS "Users can update their own worker profile" ON public.workers;
DROP POLICY IF EXISTS "Admins can view all workers" ON public.workers;
DROP POLICY IF EXISTS "Admins can update all workers" ON public.workers;
DROP POLICY IF EXISTS "Admins can insert workers" ON public.workers;
DROP POLICY IF EXISTS "Allow trigger to create workers" ON public.workers;

-- 11. Create new RLS policies
-- Policy: Allow authenticated users to view their own record
CREATE POLICY "Users can view own profile"
  ON public.workers
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Allow authenticated users to update their own record
CREATE POLICY "Users can update own profile"
  ON public.workers
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Allow authenticated users to insert their own record (for signup)
CREATE POLICY "Users can insert own profile"
  ON public.workers
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy: Allow admins to view all workers
CREATE POLICY "Admins view all"
  ON public.workers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workers admin 
      WHERE admin.id = auth.uid() 
      AND admin.role = 'admin'
    )
  );

-- Policy: Allow admins to update any worker
CREATE POLICY "Admins update all"
  ON public.workers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.workers admin 
      WHERE admin.id = auth.uid() 
      AND admin.role = 'admin'
    )
  );

-- Policy: Allow admins to insert workers
CREATE POLICY "Admins insert all"
  ON public.workers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workers admin 
      WHERE admin.id = auth.uid() 
      AND admin.role = 'admin'
    )
  );

-- Policy: Allow trigger function to insert (SECURITY DEFINER bypasses RLS)
-- But just in case, this helps with anonymous inserts during signup
CREATE POLICY "Allow service role"
  ON public.workers
  FOR ALL
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- 12. Test: Verify the setup
SELECT 
  'Workers table structure' as check_type,
  COUNT(*) as record_count
FROM workers
UNION ALL
SELECT 
  'Auth users count' as check_type,
  COUNT(*) as record_count
FROM auth.users;

-- 13. IMPORTANT: Re-enable RLS after setup is complete
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- MIGRATION NOTES:
-- ============================================================
-- 1. After running this script, users must sign up/create accounts via Supabase Auth
-- 2. Existing worker records will need their IDs updated to match auth.users IDs
-- 3. The trigger will automatically create worker records for new Supabase Auth signups
-- 4. Passwords are now managed by Supabase Auth, not stored in the workers table
-- 5. Use supabase.auth.signInWithPassword() for login
-- ============================================================
