-- COMPREHENSIVE FIX FOR SALES TABLE RLS ISSUES
-- This script fixes the Row Level Security (RLS) policies on the sales table
-- to ensure authenticated users can read all sales records

-- 1. Drop ALL existing RLS policies on sales table (clean slate)
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

-- 2. Ensure RLS is enabled on sales table
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- 3. Create PERMISSIVE policies that allow ALL authenticated users to perform all operations
-- These use 'true' condition which means they apply to everyone

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

-- 4. Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'sales'
ORDER BY policyname;
