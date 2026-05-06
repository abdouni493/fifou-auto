-- Migration: Ensure workers.created_by populated from auth.uid() and RLS policies aligned
-- Run in Supabase SQL editor. Review before running in production.

-- 1) Create trigger function that sets created_by from auth.uid() when missing
CREATE OR REPLACE FUNCTION public.set_workers_created_by()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.created_by IS NULL THEN
      IF auth.uid() IS NOT NULL THEN
        NEW.created_by := auth.uid()::uuid;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) Attach trigger to workers
DROP TRIGGER IF EXISTS trg_set_workers_created_by ON public.workers;
CREATE TRIGGER trg_set_workers_created_by
BEFORE INSERT OR UPDATE ON public.workers
FOR EACH ROW
EXECUTE FUNCTION public.set_workers_created_by();

-- 3) Enable RLS if not enabled
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

-- 4) Replace/create safe policies
-- Admin full access
DROP POLICY IF EXISTS "Admins full access to workers" ON public.workers;
CREATE POLICY "Admins full access to workers"
  ON public.workers FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Allow insert when trigger will set created_by to auth.uid(), or admin
DROP POLICY IF EXISTS "Allow insert if created_by equals auth.uid()" ON public.workers;
CREATE POLICY "Allow insert if created_by equals auth.uid()"
  ON public.workers FOR INSERT
  WITH CHECK (
    (created_by = auth.uid()::uuid) OR
    ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
  );

-- Allow users to read their own rows
DROP POLICY IF EXISTS "Allow select own worker" ON public.workers;
CREATE POLICY "Allow select own worker"
  ON public.workers FOR SELECT
  USING (
    (created_by = auth.uid()::uuid) OR
    ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
  );

-- Allow users to update their own rows
DROP POLICY IF EXISTS "Allow update own worker" ON public.workers;
CREATE POLICY "Allow update own worker"
  ON public.workers FOR UPDATE
  USING (
    (created_by = auth.uid()::uuid) OR
    ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
  )
  WITH CHECK (
    (created_by = auth.uid()::uuid) OR
    ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
  );

-- 5) Migrate data from created_by_uuid (if present) into created_by and drop duplicate column
-- Only run this after inspection and backup
-- UPDATE public.workers SET created_by = created_by_uuid WHERE created_by IS NULL AND created_by_uuid IS NOT NULL;
-- ALTER TABLE public.workers DROP COLUMN IF EXISTS created_by_uuid;

-- Notes:
-- - The trigger uses auth.uid() which is available in Supabase request context when requests are authenticated.
-- - Ensure your client includes a valid session/token so auth.uid() is not NULL.
-- - Test inserts as an authenticated user after applying this migration.
