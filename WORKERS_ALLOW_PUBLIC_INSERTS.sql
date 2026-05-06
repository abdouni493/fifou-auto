-- Migration: Allow public inserts/selects on workers and remove created_by trigger/policies
-- WARNING: This opens workers table to non-authenticated inserts; only use if you understand the security implications.

-- 1) Drop trigger and trigger function that set created_by
DROP TRIGGER IF EXISTS trg_set_workers_created_by ON public.workers;
DROP FUNCTION IF EXISTS public.set_workers_created_by();

-- 2) Drop policies that reference created_by and profiles
DROP POLICY IF EXISTS "Allow insert if created_by equals auth.uid()" ON public.workers;
DROP POLICY IF EXISTS "Allow select own worker" ON public.workers;
DROP POLICY IF EXISTS "Allow update own worker" ON public.workers;
DROP POLICY IF EXISTS "Admins full access to workers" ON public.workers;

-- 3) Disable RLS (optional) or create permissive policies
ALTER TABLE public.workers DISABLE ROW LEVEL SECURITY;

-- 4) If you want RLS enabled but permissive, you can instead create policies like:
-- ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Allow public insert workers" ON public.workers;
-- CREATE POLICY "Allow public insert workers" ON public.workers FOR INSERT WITH CHECK (true);
-- DROP POLICY IF EXISTS "Allow public select workers" ON public.workers;
-- CREATE POLICY "Allow public select workers" ON public.workers FOR SELECT USING (true);

-- 5) Remove created_by columns if you do not need them
ALTER TABLE public.workers DROP CONSTRAINT IF EXISTS fk_workers_created_by;
ALTER TABLE public.workers DROP COLUMN IF EXISTS created_by;
ALTER TABLE public.workers DROP COLUMN IF EXISTS created_by_uuid;

-- 6) Cleanup: ensure created_at exists and defaults
ALTER TABLE public.workers ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now());

-- Notes:
-- - This migration makes workers accessible to unauthenticated clients. Consider the security risk.
-- - Prefer a backend service or admin-only interface for creating workers in production.
