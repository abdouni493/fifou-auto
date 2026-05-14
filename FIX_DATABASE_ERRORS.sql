-- Fix Database Errors: Query Column Names & RLS Permissions
-- Run this in Supabase SQL Editor

-- ============================================================
-- PART 1: FIX COLUMN NAME ISSUES (400 errors)
-- ============================================================

-- The purchases table uses 'created_at' not 'dateAdded'
-- The purchases table uses 'is_sold' (should work, but let's verify)
-- Make sure these columns exist and are properly named

-- Verify/Add critical columns if missing
ALTER TABLE public.purchases
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_sold BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS created_by TEXT,
ADD COLUMN IF NOT EXISTS supplier_name TEXT,
ADD COLUMN IF NOT EXISTS total_cost NUMERIC,
ADD COLUMN IF NOT EXISTS selling_price NUMERIC,
ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS purchase_date_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS safety_checklist JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS equipment_checklist JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS comfort_checklist JSONB DEFAULT '{}';

-- ============================================================
-- PART 2: FIX RLS (ROW LEVEL SECURITY) ISSUES (401 errors)
-- ============================================================

-- For PURCHASES table - Open up RLS to allow authenticated users
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they're too restrictive
DROP POLICY IF EXISTS "Anyone can read purchases" ON public.purchases;
DROP POLICY IF EXISTS "Authenticated users can read purchases" ON public.purchases;
DROP POLICY IF EXISTS "Authenticated users can insert purchases" ON public.purchases;
DROP POLICY IF EXISTS "Authenticated users can update purchases" ON public.purchases;
DROP POLICY IF EXISTS "Authenticated users can delete purchases" ON public.purchases;

-- Create permissive READ policy
CREATE POLICY "Read purchases policy" ON public.purchases
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create permissive INSERT policy
CREATE POLICY "Insert purchases policy" ON public.purchases
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Create permissive UPDATE policy
CREATE POLICY "Update purchases policy" ON public.purchases
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Create permissive DELETE policy
CREATE POLICY "Delete purchases policy" ON public.purchases
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================================
-- For SUPPLIERS table - Fix RLS errors
-- ============================================================

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they're too restrictive
DROP POLICY IF EXISTS "Anyone can read suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can read suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can delete suppliers" ON public.suppliers;

-- Create permissive READ policy
CREATE POLICY "Read suppliers policy" ON public.suppliers
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create permissive INSERT policy
CREATE POLICY "Insert suppliers policy" ON public.suppliers
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Create permissive UPDATE policy
CREATE POLICY "Update suppliers policy" ON public.suppliers
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Create permissive DELETE policy
CREATE POLICY "Delete suppliers policy" ON public.suppliers
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================================
-- For SALES table - Fix RLS if needed
-- ============================================================

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can read sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can insert sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can update sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can delete sales" ON public.sales;

-- Create permissive policies
CREATE POLICY "Read sales policy" ON public.sales
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Insert sales policy" ON public.sales
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Update sales policy" ON public.sales
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Delete sales policy" ON public.sales
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================================
-- PART 3: CREATE INDEXES FOR PERFORMANCE
-- ============================================================

-- Purchases indexes
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON public.purchases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_is_sold ON public.purchases(is_sold);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON public.purchases(supplier_id);

-- Suppliers indexes
CREATE INDEX IF NOT EXISTS idx_suppliers_created_at ON public.suppliers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_suppliers_code ON public.suppliers(code);

-- Sales indexes
CREATE INDEX IF NOT EXISTS idx_sales_car_id ON public.sales(car_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at DESC);

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Run these to verify everything worked:

-- Check purchases table columns
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'purchases' 
-- ORDER BY ordinal_position;

-- Check purchases RLS policies
-- SELECT * FROM pg_policies WHERE tablename = 'purchases';

-- Check suppliers RLS policies
-- SELECT * FROM pg_policies WHERE tablename = 'suppliers';

-- ============================================================
-- SUCCESS INDICATORS
-- ============================================================
-- ✅ If you see "CREATE INDEX" messages, indexes were created
-- ✅ If you see "CREATE POLICY" messages, policies were created
-- ✅ No error messages = successful execution
-- ✅ Refresh the app - database queries should now work!
