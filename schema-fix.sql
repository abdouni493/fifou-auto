-- ============================================================
-- SHOWROOM — SCHEMA FIX PACK
-- Run this ONCE in the Supabase SQL Editor (Dashboard → SQL Editor).
-- Safe to re-run (idempotent).
--
-- Fixes:
--   1. Infinite-recursion RLS policy on `users` that broke admin login.
--   2. Robust admin-profile creation on sign-up (DB trigger).
--   3. Reliable Storage policies so image upload/display always works.
-- ============================================================


-- ⚠️ IMPORTANT — also do this in the Dashboard (one click, no SQL):
--   Authentication → Providers → Email → turn OFF "Confirm email".
--   Otherwise newly registered admins / workers must click an email link
--   before they can log in (and Supabase's shared SMTP is rate-limited).


-- ============================================================
-- 1. USERS RLS — remove the self-referencing (recursive) policy
-- ============================================================
-- The original "users: admin sees all" policy does `SELECT ... FROM users`
-- inside a policy ON users → Postgres raises "infinite recursion detected"
-- and the admin profile can never be read. Replace with simple own-row policies.

DROP POLICY IF EXISTS "users: admin sees all" ON public.users;
DROP POLICY IF EXISTS "users: own row"       ON public.users;
DROP POLICY IF EXISTS "users self select"    ON public.users;
DROP POLICY IF EXISTS "users self insert"    ON public.users;
DROP POLICY IF EXISTS "users self update"    ON public.users;

CREATE POLICY "users self select" ON public.users
  FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "users self insert" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = auth_id);

CREATE POLICY "users self update" ON public.users
  FOR UPDATE USING (auth.uid() = auth_id) WITH CHECK (auth.uid() = auth_id);


-- ============================================================
-- 2. AUTO-CREATE the admin profile row on sign-up
-- ============================================================
-- The app calls supabase.auth.signUp(..., { data: { kind: 'admin', full_name, username } })
-- for admin registration. This trigger creates the matching public.users row
-- server-side (SECURITY DEFINER bypasses RLS), so it works even with email
-- confirmation enabled. Worker sign-ups carry kind='worker' and are skipped
-- (workers live in the `workers` table, linked by auth_id).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.raw_user_meta_data ->> 'kind') = 'admin' THEN
    BEGIN
      INSERT INTO public.users (auth_id, full_name, username, email, role)
      VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
        COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1)),
        NEW.email,
        'admin'
      )
      ON CONFLICT (auth_id) DO NOTHING;
    EXCEPTION WHEN unique_violation THEN
      -- username/email already taken — ignore; the client reconciles the row.
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- 3. STORAGE — guarantee public read + authenticated write
-- ============================================================
-- Make sure the 4 app buckets are public (display via URL) and add reliable
-- write policies keyed on auth.uid() (more robust than auth.role()). These are
-- ADDED alongside any existing policies; permissive policies are OR'd together.

UPDATE storage.buckets
   SET public = true
 WHERE id IN ('car-images', 'car-documents', 'client-photos', 'showroom-logo');

DROP POLICY IF EXISTS "app storage public read" ON storage.objects;
CREATE POLICY "app storage public read" ON storage.objects
  FOR SELECT
  USING (bucket_id IN ('car-images', 'car-documents', 'client-photos', 'showroom-logo'));

DROP POLICY IF EXISTS "app storage auth insert" ON storage.objects;
CREATE POLICY "app storage auth insert" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id IN ('car-images', 'car-documents', 'client-photos', 'showroom-logo') AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "app storage auth update" ON storage.objects;
CREATE POLICY "app storage auth update" ON storage.objects
  FOR UPDATE
  USING (bucket_id IN ('car-images', 'car-documents', 'client-photos', 'showroom-logo') AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "app storage auth delete" ON storage.objects;
CREATE POLICY "app storage auth delete" ON storage.objects
  FOR DELETE
  USING (bucket_id IN ('car-images', 'car-documents', 'client-photos', 'showroom-logo') AND auth.uid() IS NOT NULL);


-- ============================================================
-- 4. INSPECTION CHECKLIST TEMPLATE
-- ============================================================
-- Stores the reusable inspection checklist (the master list of items shown on
-- every new purchase / sale). When a user adds or removes an item on the
-- Inspection step it is saved here, so it reappears on the next purchase and the
-- next sale instead of resetting to the built-in defaults.

ALTER TABLE settings ADD COLUMN IF NOT EXISTS inspection_template JSONB;


-- ============================================================
-- DONE.
-- After running: register an admin on the login page, then create workers
-- (toggle "Activer un compte d'accès" + email + password) and set their role
-- permissions. Workers then log in at /login with that email + password.
-- ============================================================
