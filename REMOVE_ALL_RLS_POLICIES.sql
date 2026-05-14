-- REMOVE ALL RLS POLICIES AND DISABLE ROW LEVEL SECURITY
-- Run this in Supabase SQL Editor to disable all RLS restrictions
-- This allows all authenticated users to access all data without restrictions

-- ============================================================
-- DISABLE RLS ON ALL TABLES
-- ============================================================

-- Purchases table
ALTER TABLE public.purchases DISABLE ROW LEVEL SECURITY;

-- Suppliers tablef
ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;

-- Sales table
ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;

-- Showroom config table
ALTER TABLE public.showroom_config DISABLE ROW LEVEL SECURITY;

-- Inspections table
ALTER TABLE public.inspections DISABLE ROW LEVEL SECURITY;

-- Inspection templates table
ALTER TABLE public.inspection_templates DISABLE ROW LEVEL SECURITY;

-- Maintenance table
ALTER TABLE public.maintenance DISABLE ROW LEVEL SECURITY;

-- Receipts table
ALTER TABLE public.receipts DISABLE ROW LEVEL SECURITY;

-- Workers table
ALTER TABLE public.workers DISABLE ROW LEVEL SECURITY;

-- Worker payments table
ALTER TABLE public.worker_payments DISABLE ROW LEVEL SECURITY;

-- Worker transactions table
ALTER TABLE public.worker_transactions DISABLE ROW LEVEL SECURITY;

-- Expenses table
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;

-- Vehicle expenses table
ALTER TABLE public.vehicle_expenses DISABLE ROW LEVEL SECURITY;

-- Profiles table
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- DROP ALL RLS POLICIES
-- ============================================================

-- Purchases policies
DROP POLICY IF EXISTS "Read purchases policy" ON public.purchases;
DROP POLICY IF EXISTS "Insert purchases policy" ON public.purchases;
DROP POLICY IF EXISTS "Update purchases policy" ON public.purchases;
DROP POLICY IF EXISTS "Delete purchases policy" ON public.purchases;
DROP POLICY IF EXISTS "Anyone can read purchases" ON public.purchases;
DROP POLICY IF EXISTS "Authenticated users can read purchases" ON public.purchases;
DROP POLICY IF EXISTS "Authenticated users can insert purchases" ON public.purchases;
DROP POLICY IF EXISTS "Authenticated users can update purchases" ON public.purchases;
DROP POLICY IF EXISTS "Authenticated users can delete purchases" ON public.purchases;

-- Suppliers policies
DROP POLICY IF EXISTS "Read suppliers policy" ON public.suppliers;
DROP POLICY IF EXISTS "Insert suppliers policy" ON public.suppliers;
DROP POLICY IF EXISTS "Update suppliers policy" ON public.suppliers;
DROP POLICY IF EXISTS "Delete suppliers policy" ON public.suppliers;
DROP POLICY IF EXISTS "Anyone can read suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can read suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can delete suppliers" ON public.suppliers;

-- Sales policies
DROP POLICY IF EXISTS "Read sales policy" ON public.sales;
DROP POLICY IF EXISTS "Insert sales policy" ON public.sales;
DROP POLICY IF EXISTS "Update sales policy" ON public.sales;
DROP POLICY IF EXISTS "Delete sales policy" ON public.sales;
DROP POLICY IF EXISTS "Anyone can read sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can read sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can insert sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can update sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can delete sales" ON public.sales;

-- Showroom config policies
DROP POLICY IF EXISTS "Read showroom_config policy" ON public.showroom_config;
DROP POLICY IF EXISTS "Update showroom_config policy" ON public.showroom_config;
DROP POLICY IF EXISTS "Anyone can read showroom_config" ON public.showroom_config;
DROP POLICY IF EXISTS "Authenticated users can read showroom_config" ON public.showroom_config;

-- Inspections policies
DROP POLICY IF EXISTS "Read inspections policy" ON public.inspections;
DROP POLICY IF EXISTS "Insert inspections policy" ON public.inspections;
DROP POLICY IF EXISTS "Update inspections policy" ON public.inspections;
DROP POLICY IF EXISTS "Delete inspections policy" ON public.inspections;
DROP POLICY IF EXISTS "Anyone can read inspections" ON public.inspections;
DROP POLICY IF EXISTS "Authenticated users can read inspections" ON public.inspections;

-- Inspection templates policies
DROP POLICY IF EXISTS "Read inspection_templates policy" ON public.inspection_templates;
DROP POLICY IF EXISTS "Insert inspection_templates policy" ON public.inspection_templates;
DROP POLICY IF EXISTS "Anyone can read inspection_templates" ON public.inspection_templates;

-- Maintenance policies
DROP POLICY IF EXISTS "Read maintenance policy" ON public.maintenance;
DROP POLICY IF EXISTS "Insert maintenance policy" ON public.maintenance;
DROP POLICY IF EXISTS "Update maintenance policy" ON public.maintenance;
DROP POLICY IF EXISTS "Delete maintenance policy" ON public.maintenance;
DROP POLICY IF EXISTS "Anyone can read maintenance" ON public.maintenance;

-- Receipts policies
DROP POLICY IF EXISTS "Read receipts policy" ON public.receipts;
DROP POLICY IF EXISTS "Insert receipts policy" ON public.receipts;
DROP POLICY IF EXISTS "Update receipts policy" ON public.receipts;
DROP POLICY IF EXISTS "Delete receipts policy" ON public.receipts;
DROP POLICY IF EXISTS "Anyone can read receipts" ON public.receipts;

-- Workers policies
DROP POLICY IF EXISTS "Read workers policy" ON public.workers;
DROP POLICY IF EXISTS "Insert workers policy" ON public.workers;
DROP POLICY IF EXISTS "Update workers policy" ON public.workers;
DROP POLICY IF EXISTS "Delete workers policy" ON public.workers;
DROP POLICY IF EXISTS "Anyone can read workers" ON public.workers;
DROP POLICY IF EXISTS "Authenticated users can read workers" ON public.workers;

-- Worker payments policies
DROP POLICY IF EXISTS "Read worker_payments policy" ON public.worker_payments;
DROP POLICY IF EXISTS "Insert worker_payments policy" ON public.worker_payments;
DROP POLICY IF EXISTS "Update worker_payments policy" ON public.worker_payments;
DROP POLICY IF EXISTS "Delete worker_payments policy" ON public.worker_payments;
DROP POLICY IF EXISTS "Anyone can read worker_payments" ON public.worker_payments;

-- Worker transactions policies
DROP POLICY IF EXISTS "Read worker_transactions policy" ON public.worker_transactions;
DROP POLICY IF EXISTS "Insert worker_transactions policy" ON public.worker_transactions;
DROP POLICY IF EXISTS "Update worker_transactions policy" ON public.worker_transactions;
DROP POLICY IF EXISTS "Delete worker_transactions policy" ON public.worker_transactions;
DROP POLICY IF EXISTS "Anyone can read worker_transactions" ON public.worker_transactions;

-- Expenses policies
DROP POLICY IF EXISTS "Read expenses policy" ON public.expenses;
DROP POLICY IF EXISTS "Insert expenses policy" ON public.expenses;
DROP POLICY IF EXISTS "Update expenses policy" ON public.expenses;
DROP POLICY IF EXISTS "Delete expenses policy" ON public.expenses;
DROP POLICY IF EXISTS "Anyone can read expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated users can read expenses" ON public.expenses;

-- Vehicle expenses policies
DROP POLICY IF EXISTS "Read vehicle_expenses policy" ON public.vehicle_expenses;
DROP POLICY IF EXISTS "Insert vehicle_expenses policy" ON public.vehicle_expenses;
DROP POLICY IF EXISTS "Update vehicle_expenses policy" ON public.vehicle_expenses;
DROP POLICY IF EXISTS "Delete vehicle_expenses policy" ON public.vehicle_expenses;
DROP POLICY IF EXISTS "Anyone can read vehicle_expenses" ON public.vehicle_expenses;

-- Profiles policies
DROP POLICY IF EXISTS "Read profiles policy" ON public.profiles;
DROP POLICY IF EXISTS "Update profiles policy" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;

-- ============================================================
-- SUCCESS VERIFICATION
-- ============================================================

-- Check that RLS is disabled on all tables:
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('purchases', 'suppliers', 'sales', 'showroom_config', 
--                   'inspections', 'inspection_templates', 'maintenance', 
--                   'receipts', 'workers', 'worker_payments', 'worker_transactions', 
--                   'expenses', 'vehicle_expenses', 'profiles');

-- Check that all policies are deleted:
-- SELECT * FROM pg_policies WHERE schemaname = 'public';
-- Result should be empty or show no policies

-- ============================================================
-- RESULT
-- ============================================================
-- ✅ RLS disabled on 13 tables
-- ✅ All RLS policies removed
-- ✅ All authenticated users can now access all data
-- ✅ No more JWT/401 errors related to RLS restrictions

-- WARNING: This makes your database publicly readable/writable to authenticated users!
-- For production, consider implementing proper row-level security policies instead.
