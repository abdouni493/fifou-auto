-- VERIFICATION QUERIES FOR RLS FIXES
-- Run these in Supabase SQL Editor to verify the fixes are working

-- ============================================================================
-- 1. CHECK CURRENT RLS POLICIES
-- ============================================================================

-- View all RLS policies on critical tables
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

-- ============================================================================
-- 2. CHECK RLS STATUS (enabled/disabled)
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('sales', 'purchases', 'clients', 'workers')
ORDER BY tablename;

-- ============================================================================
-- 3. VERIFY SALES DATA EXISTS
-- ============================================================================

-- Count total sales
SELECT COUNT(*) as total_sales FROM public.sales;

-- View sample sales (with key fields for billing)
SELECT 
  id,
  first_name || ' ' || last_name as client_name,
  total_price,
  amount_paid,
  balance,
  status,
  created_at
FROM public.sales
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- 4. VERIFY PURCHASES DATA EXISTS
-- ============================================================================

-- Count total purchases
SELECT COUNT(*) as total_purchases FROM public.purchases;

-- View sample purchases
SELECT 
  id,
  make,
  model,
  total_cost,
  selling_price,
  created_at
FROM public.purchases
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- 5. CHECK FOR RLS-RELATED ERRORS
-- ============================================================================

-- View function to check if user can execute SELECT on sales
-- This helps diagnose permission issues
SELECT 
  has_table_privilege((SELECT auth.uid()), 'public.sales', 'SELECT') as can_select_sales,
  has_table_privilege((SELECT auth.uid()), 'public.sales', 'INSERT') as can_insert_sales,
  has_table_privilege((SELECT auth.uid()), 'public.sales', 'UPDATE') as can_update_sales,
  has_table_privilege((SELECT auth.uid()), 'public.sales', 'DELETE') as can_delete_sales;

-- ============================================================================
-- 6. QUICK STATS (for testing billing page calculations)
-- ============================================================================

-- Calculate expected billing stats
SELECT 
  COUNT(*) as total_sales,
  SUM(CAST(amount_paid AS NUMERIC)) as total_revenue,
  SUM(CAST(balance AS NUMERIC)) as total_debts
FROM public.sales
WHERE status = 'completed' OR status = 'debt';

-- Break down by status
SELECT 
  status,
  COUNT(*) as count,
  SUM(CAST(amount_paid AS NUMERIC)) as revenue,
  SUM(CAST(balance AS NUMERIC)) as debts
FROM public.sales
GROUP BY status
ORDER BY status;
