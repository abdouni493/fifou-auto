-- ====================================================
-- 🚀 SHOWROOM MANAGEMENT — FULL PERFORMANCE OPTIMIZATION
-- Run in Supabase SQL Editor
-- ====================================================

-- ============================================
-- 1. PURCHASES — Most queried table
-- ============================================
CREATE INDEX IF NOT EXISTS idx_purchases_is_sold ON purchases(is_sold);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_client_id ON purchases(client_id);
CREATE INDEX IF NOT EXISTS idx_purchases_plate ON purchases(plate);
CREATE INDEX IF NOT EXISTS idx_purchases_vin ON purchases(vin);
CREATE INDEX IF NOT EXISTS idx_purchases_make_model ON purchases(make, model);
CREATE INDEX IF NOT EXISTS idx_purchases_date_added ON purchases(date_added DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_is_sold_created ON purchases(is_sold, created_at DESC);

-- ============================================
-- 2. SALES — Core revenue table
-- ============================================
CREATE INDEX IF NOT EXISTS idx_sales_car_id ON sales(car_id);
CREATE INDEX IF NOT EXISTS idx_sales_client_id ON sales(client_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_balance ON sales(balance) WHERE balance > 0;

-- ============================================
-- 3. PAYMENTS — Debt tracking
-- ============================================
CREATE INDEX IF NOT EXISTS idx_payments_sale_id ON payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- ============================================
-- 4. EXPENSES — Daily lookups
-- ============================================
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at DESC);

-- ============================================
-- 5. VEHICLE_EXPENSES — Per-car cost tracking
-- ============================================
CREATE INDEX IF NOT EXISTS idx_vehicle_expenses_vehicle_id ON vehicle_expenses(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_expenses_date ON vehicle_expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_expenses_created_at ON vehicle_expenses(created_at DESC);

-- ============================================
-- 6. MAINTENANCE — Vehicle maintenance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_id ON maintenance(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_type ON maintenance(type);
CREATE INDEX IF NOT EXISTS idx_maintenance_date ON maintenance(date DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_expiry ON maintenance(expiry_date) WHERE expiry_date IS NOT NULL;

-- ============================================
-- 7. WORKER_TRANSACTIONS — Salary/advance records
-- ============================================
CREATE INDEX IF NOT EXISTS idx_worker_transactions_worker_id ON worker_transactions(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_transactions_type ON worker_transactions(type);
CREATE INDEX IF NOT EXISTS idx_worker_transactions_date ON worker_transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_worker_transactions_created_at ON worker_transactions(created_at DESC);

-- ============================================
-- 8. WORKER_PAYMENTS — Additional payment records
-- ============================================
CREATE INDEX IF NOT EXISTS idx_worker_payments_worker_id ON worker_payments(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_payments_date ON worker_payments(payment_date DESC);

-- ============================================
-- 9. WORKERS — Login lookup (CRITICAL for speed)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_workers_username ON workers(username);
CREATE INDEX IF NOT EXISTS idx_workers_email ON workers(email);
CREATE INDEX IF NOT EXISTS idx_workers_role ON workers(role);

-- ============================================
-- 10. INSPECTIONS — Checkin/checkout
-- ============================================
CREATE INDEX IF NOT EXISTS idx_inspections_car_id ON inspections(car_id);
CREATE INDEX IF NOT EXISTS idx_inspections_type ON inspections(type);
CREATE INDEX IF NOT EXISTS idx_inspections_date ON inspections(date DESC);
CREATE INDEX IF NOT EXISTS idx_inspections_created_at ON inspections(created_at DESC);

-- ============================================
-- 11. CLIENTS — Fast search
-- ============================================
CREATE INDEX IF NOT EXISTS idx_clients_mobile1 ON clients(mobile1);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(last_name, first_name);

-- ============================================
-- 12. SUPPLIERS — Fast lookup
-- ============================================
CREATE INDEX IF NOT EXISTS idx_suppliers_mobile ON suppliers(mobile);
CREATE INDEX IF NOT EXISTS idx_suppliers_created_at ON suppliers(created_at DESC);

-- ============================================
-- 13. RECEIPTS
-- ============================================
CREATE INDEX IF NOT EXISTS idx_receipts_created_by ON receipts(created_by);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(receipt_date DESC);

-- ============================================
-- 14. INSPECTION_TEMPLATES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_inspection_templates_type ON inspection_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_inspection_templates_active ON inspection_templates(is_active);

-- ============================================
-- 15. AUTH — Speed up login/logout (CRITICAL)
-- Supabase handles auth.users internally, but this speeds up profile lookups
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);

-- ============================================
-- 16. VACUUM & ANALYZE — Refresh planner statistics
-- (Run after indexes are created)
-- ============================================
ANALYZE purchases;
ANALYZE sales;
ANALYZE payments;
ANALYZE expenses;
ANALYZE vehicle_expenses;
ANALYZE workers;
ANALYZE worker_transactions;
ANALYZE clients;
ANALYZE suppliers;
ANALYZE inspections;
ANALYZE maintenance;

-- ============================================
-- 17. FAST REPORT VIEW — Pre-aggregated for Reports page
-- ============================================
CREATE OR REPLACE VIEW v_sales_with_profit AS
SELECT
  s.id,
  s.car_id,
  s.client_id,
  s.first_name || ' ' || s.last_name AS client_name,
  s.total_price,
  s.amount_paid,
  s.balance,
  s.status,
  s.created_at,
  p.make,
  p.model,
  p.year,
  p.color,
  p.plate,
  p.total_cost AS purchase_cost,
  p.supplier_id,
  p.supplier_name,
  COALESCE(
    (SELECT SUM(ve.cost) FROM vehicle_expenses ve WHERE ve.vehicle_id = p.id), 0
  ) AS vehicle_expenses_total,
  s.total_price - p.total_cost - COALESCE(
    (SELECT SUM(ve.cost) FROM vehicle_expenses ve WHERE ve.vehicle_id = p.id), 0
  ) AS gross_profit
FROM sales s
JOIN purchases p ON s.car_id = p.id;

-- Grant access
GRANT SELECT ON v_sales_with_profit TO anon, authenticated;

-- ============================================
-- 18. FAST STOCK VIEW — For Showroom & Dashboard
-- ============================================
CREATE OR REPLACE VIEW v_stock_available AS
SELECT
  p.*,
  COALESCE(
    (SELECT SUM(ve.cost) FROM vehicle_expenses ve WHERE ve.vehicle_id = p.id), 0
  ) AS total_vehicle_expenses,
  p.selling_price - p.total_cost - COALESCE(
    (SELECT SUM(ve.cost) FROM vehicle_expenses ve WHERE ve.vehicle_id = p.id), 0
  ) AS potential_profit
FROM purchases p
WHERE p.is_sold = false
ORDER BY p.created_at DESC;

GRANT SELECT ON v_stock_available TO anon, authenticated;
