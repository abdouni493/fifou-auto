-- COMPREHENSIVE RLS FIXES FOR ALL TABLES
-- Fixes Row Level Security issues across sales, purchases, and workers tables

-- ============================================================================
-- SECTION 1: FIX SALES TABLE RLS
-- ============================================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "sales_select_own" ON public.sales;
DROP POLICY IF EXISTS "sales_insert_own" ON public.sales;
DROP POLICY IF EXISTS "sales_update_own" ON public.sales;
DROP POLICY IF EXISTS "sales_delete_own" ON public.sales;
DROP POLICY IF EXISTS "sales_select_all" ON public.sales;
DROP POLICY IF EXISTS "sales_insert_all" ON public.sales;
DROP POLICY IF EXISTS "sales_update_all" ON public.sales;
DROP POLICY IF EXISTS "sales_delete_all" ON public.sales;
DROP POLICY IF EXISTS "allow_insert_sales" ON public.sales;
DROP POLICY IF EXISTS "allow_select_sales" ON public.sales;
DROP POLICY IF EXISTS "allow_update_sales" ON public.sales;
DROP POLICY IF EXISTS "allow_delete_sales" ON public.sales;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.sales;

-- Enable RLS
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Create permissive policies
CREATE POLICY "sales_public_select" ON public.sales
  FOR SELECT
  USING (true);

CREATE POLICY "sales_public_insert" ON public.sales
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "sales_public_update" ON public.sales
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "sales_public_delete" ON public.sales
  FOR DELETE
  USING (true);

-- ============================================================================
-- SECTION 2: FIX PURCHASES TABLE RLS
-- ============================================================================

DROP POLICY IF EXISTS "purchases_public_select" ON public.purchases;
DROP POLICY IF EXISTS "purchases_public_insert" ON public.purchases;
DROP POLICY IF EXISTS "purchases_public_update" ON public.purchases;
DROP POLICY IF EXISTS "purchases_public_delete" ON public.purchases;
DROP POLICY IF EXISTS "Read purchases policy" ON public.purchases;
DROP POLICY IF EXISTS "Insert purchases policy" ON public.purchases;
DROP POLICY IF EXISTS "Update purchases policy" ON public.purchases;
DROP POLICY IF EXISTS "Delete purchases policy" ON public.purchases;

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "purchases_public_select" ON public.purchases
  FOR SELECT
  USING (true);

CREATE POLICY "purchases_public_insert" ON public.purchases
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "purchases_public_update" ON public.purchases
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "purchases_public_delete" ON public.purchases
  FOR DELETE
  USING (true);

-- ============================================================================
-- SECTION 3: FIX CLIENTS TABLE RLS
-- ============================================================================

DROP POLICY IF EXISTS "clients_public_select" ON public.clients;
DROP POLICY IF EXISTS "clients_public_insert" ON public.clients;
DROP POLICY IF EXISTS "clients_public_update" ON public.clients;
DROP POLICY IF EXISTS "clients_public_delete" ON public.clients;

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_public_select" ON public.clients
  FOR SELECT
  USING (true);

CREATE POLICY "clients_public_insert" ON public.clients
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "clients_public_update" ON public.clients
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "clients_public_delete" ON public.clients
  FOR DELETE
  USING (true);

-- ============================================================================
-- SECTION 4: FIX WORKERS TABLE RLS (400 error source)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.workers;
DROP POLICY IF EXISTS "Users can update own profile" ON public.workers;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.workers;
DROP POLICY IF EXISTS "Admins view all" ON public.workers;
DROP POLICY IF EXISTS "Admins update all" ON public.workers;
DROP POLICY IF EXISTS "Admins insert all" ON public.workers;
DROP POLICY IF EXISTS "Allow service role" ON public.workers;
DROP POLICY IF EXISTS "workers_public_select" ON public.workers;
DROP POLICY IF EXISTS "workers_public_insert" ON public.workers;
DROP POLICY IF EXISTS "workers_public_update" ON public.workers;
DROP POLICY IF EXISTS "workers_public_delete" ON public.workers;

ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workers_public_select" ON public.workers
  FOR SELECT
  USING (true);

CREATE POLICY "workers_public_insert" ON public.workers
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "workers_public_update" ON public.workers
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "workers_public_delete" ON public.workers
  FOR DELETE
  USING (true);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify all policies are in place
SELECT 
  tablename,
  policyname,
  permissive,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('sales', 'purchases', 'clients', 'workers')
ORDER BY tablename, policyname;
