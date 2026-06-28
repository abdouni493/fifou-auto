-- ============================================================
-- SHOWROOM APPLICATION — SUPABASE COMPLETE SCHEMA
-- Project: https://ewwdiycrlsbzgruyfzio.supabase.co
-- ============================================================
-- Run this entire file in Supabase SQL Editor (once)
-- ============================================================


-- ============================================================
-- 0. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- 1. STORAGE BUCKETS
-- ============================================================
-- Each bucket is public so the app can display images via URL

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('car-images',    'car-images',    true, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('car-documents', 'car-documents', true, 20971520, ARRAY['image/jpeg','image/png','image/webp','application/pdf']),
  ('client-photos', 'client-photos', true, 5242880,  ARRAY['image/jpeg','image/png','image/webp']),
  ('showroom-logo', 'showroom-logo', true, 5242880,  ARRAY['image/jpeg','image/png','image/webp','image/svg+xml'])
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 2. STORAGE POLICIES (public read, authenticated write)
-- ============================================================

-- ---- car-images ----
CREATE POLICY "car-images: public read"
  ON storage.objects FOR SELECT USING (bucket_id = 'car-images');

CREATE POLICY "car-images: auth insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'car-images' AND auth.role() = 'authenticated');

CREATE POLICY "car-images: auth update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'car-images' AND auth.role() = 'authenticated');

CREATE POLICY "car-images: auth delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'car-images' AND auth.role() = 'authenticated');

-- ---- car-documents ----
CREATE POLICY "car-documents: public read"
  ON storage.objects FOR SELECT USING (bucket_id = 'car-documents');

CREATE POLICY "car-documents: auth insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'car-documents' AND auth.role() = 'authenticated');

CREATE POLICY "car-documents: auth update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'car-documents' AND auth.role() = 'authenticated');

CREATE POLICY "car-documents: auth delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'car-documents' AND auth.role() = 'authenticated');

-- ---- client-photos ----
CREATE POLICY "client-photos: public read"
  ON storage.objects FOR SELECT USING (bucket_id = 'client-photos');

CREATE POLICY "client-photos: auth insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'client-photos' AND auth.role() = 'authenticated');

CREATE POLICY "client-photos: auth update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'client-photos' AND auth.role() = 'authenticated');

CREATE POLICY "client-photos: auth delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'client-photos' AND auth.role() = 'authenticated');

-- ---- showroom-logo ----
CREATE POLICY "showroom-logo: public read"
  ON storage.objects FOR SELECT USING (bucket_id = 'showroom-logo');

CREATE POLICY "showroom-logo: auth insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'showroom-logo' AND auth.role() = 'authenticated');

CREATE POLICY "showroom-logo: auth update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'showroom-logo' AND auth.role() = 'authenticated');

CREATE POLICY "showroom-logo: auth delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'showroom-logo' AND auth.role() = 'authenticated');


-- ============================================================
-- 3. HELPER: public URL function
-- ============================================================
-- Returns the full public URL for a storage object.
-- Usage: storage_url('car-images', 'path/to/file.jpg')
CREATE OR REPLACE FUNCTION storage_url(bucket text, path text)
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT 'https://ewwdiycrlsbzgruyfzio.supabase.co/storage/v1/object/public/' || bucket || '/' || path;
$$;


-- ============================================================
-- 4. ENUM TYPES
-- ============================================================
CREATE TYPE car_status      AS ENUM ('AVAILABLE', 'SOLD', 'RESERVED');
CREATE TYPE energy_type     AS ENUM ('ESSENCE', 'DIESEL', 'HYBRID', 'ELECTRIC');
CREATE TYPE gearbox_type    AS ENUM ('MANUAL', 'AUTO');
CREATE TYPE source_type     AS ENUM ('SUPPLIER', 'CLIENT');
CREATE TYPE sale_type       AS ENUM ('NORMAL', 'DEPOSIT');
CREATE TYPE reduction_type  AS ENUM ('NONE', 'PERCENT', 'FIXED');
CREATE TYPE expense_type    AS ENUM ('CAR', 'SHOWROOM');
CREATE TYPE pay_type        AS ENUM ('MONTHLY', 'DAILY', 'NONE');
CREATE TYPE reservation_status AS ENUM ('PENDING', 'ACCEPTED', 'CANCELLED');


-- ============================================================
-- 5. CORE TABLES
-- ============================================================

-- ----------------------------------------------------------
-- 5.1 USERS / ADMINS  (mirrors Supabase Auth users)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id     UUID UNIQUE,                   -- links to auth.users.id
  full_name   TEXT NOT NULL,
  username    TEXT UNIQUE NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  role        TEXT DEFAULT 'admin',          -- 'admin' | 'worker'
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users: own row"
  ON users FOR ALL USING (auth.uid() = auth_id);

CREATE POLICY "users: admin sees all"
  ON users FOR SELECT USING (
    EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.role = 'admin')
  );


-- ----------------------------------------------------------
-- 5.2 SHOWROOM SETTINGS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  id          SERIAL PRIMARY KEY,
  name        TEXT,
  description TEXT,
  email       TEXT,
  phone       TEXT,
  address     TEXT,
  nif         TEXT,
  nis         TEXT,
  article     TEXT,
  rc          TEXT,
  -- Logo: stores the full public URL from Supabase Storage (bucket: showroom-logo)
  logo_url    TEXT,
  -- Website contact links
  facebook    TEXT,
  instagram   TEXT,
  tiktok      TEXT,
  maps        TEXT,
  whatsapp    TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings: public read"  ON settings FOR SELECT USING (true);
CREATE POLICY "settings: auth write"   ON settings FOR ALL  USING (auth.role() = 'authenticated');

-- Seed one row
INSERT INTO settings (name) VALUES ('Mon Showroom') ON CONFLICT DO NOTHING;


-- ----------------------------------------------------------
-- 5.3 SUPPLIERS (Fournisseurs)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
  id          SERIAL PRIMARY KEY,
  full_name   TEXT NOT NULL,
  phone       TEXT NOT NULL,
  address     TEXT,
  nif         TEXT,
  nis         TEXT,
  article     TEXT,
  rs          TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suppliers: auth all" ON suppliers FOR ALL USING (auth.role() = 'authenticated');


-- ----------------------------------------------------------
-- 5.4 CLIENTS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS clients (
  id                   SERIAL PRIMARY KEY,
  first_name           TEXT NOT NULL,
  last_name            TEXT NOT NULL,
  phone_primary        TEXT NOT NULL,
  phone_secondary      TEXT,
  email                TEXT,
  address              TEXT,
  profession           TEXT,
  birth_date           DATE,
  birth_place          TEXT,
  gender               CHAR(1),
  doc_type             TEXT,
  doc_number           TEXT,
  doc_delivery_date    DATE,
  doc_expiry           DATE,
  doc_delivery_address TEXT,
  nif                  TEXT,
  rc                   TEXT,
  -- Photo: full public URL from Supabase Storage (bucket: client-photos)
  photo_url            TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients: auth all" ON clients FOR ALL USING (auth.role() = 'authenticated');


-- ----------------------------------------------------------
-- 5.5 WORKER ROLES
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS worker_roles (
  id          SERIAL PRIMARY KEY,
  name        TEXT UNIQUE NOT NULL,
  -- permissions stored as JSON: { "dashboard": { "view": true, "create": false, ... }, ... }
  permissions JSONB DEFAULT '{}'
);

ALTER TABLE worker_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "worker_roles: auth all" ON worker_roles FOR ALL USING (auth.role() = 'authenticated');


-- ----------------------------------------------------------
-- 5.6 WORKERS (Employés)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS workers (
  id              SERIAL PRIMARY KEY,
  full_name       TEXT NOT NULL,
  phone           TEXT NOT NULL,
  birthday        DATE,
  id_card_number  TEXT,
  role_id         INT REFERENCES worker_roles(id) ON DELETE SET NULL,
  payment_type    pay_type DEFAULT 'NONE',
  payment_amount  NUMERIC(12,2) DEFAULT 0,
  start_date      DATE,
  -- Optional login account
  account_enabled BOOLEAN DEFAULT false,
  auth_id         UUID UNIQUE,               -- links to auth.users.id if account_enabled
  email           TEXT,
  username        TEXT UNIQUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workers: auth all" ON workers FOR ALL USING (auth.role() = 'authenticated');


-- ----------------------------------------------------------
-- 5.7 WORKER ADVANCES, ABSENCES, PAYMENTS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS worker_advances (
  id          SERIAL PRIMARY KEY,
  worker_id   INT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  amount      NUMERIC(12,2) NOT NULL,
  date        DATE NOT NULL,
  description TEXT,
  is_paid     BOOLEAN DEFAULT false,
  paid_at     TIMESTAMPTZ,
  payment_id  INT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE worker_advances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "worker_advances: auth all" ON worker_advances FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS worker_absences (
  id          SERIAL PRIMARY KEY,
  worker_id   INT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  cost        NUMERIC(12,2) NOT NULL DEFAULT 0,
  date        DATE NOT NULL,
  description TEXT,
  is_paid     BOOLEAN DEFAULT false,
  paid_at     TIMESTAMPTZ,
  payment_id  INT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE worker_absences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "worker_absences: auth all" ON worker_absences FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS worker_payments (
  id          SERIAL PRIMARY KEY,
  worker_id   INT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  amount      NUMERIC(12,2) NOT NULL,
  date        DATE NOT NULL,
  month       TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE worker_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "worker_payments: auth all" ON worker_payments FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE worker_advances
  ADD CONSTRAINT worker_advances_payment_id_fkey
  FOREIGN KEY (payment_id) REFERENCES worker_payments(id) ON DELETE SET NULL;

ALTER TABLE worker_absences
  ADD CONSTRAINT worker_absences_payment_id_fkey
  FOREIGN KEY (payment_id) REFERENCES worker_payments(id) ON DELETE SET NULL;


-- ----------------------------------------------------------
-- 5.8 CARS (Véhicules)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS cars (
  id         SERIAL PRIMARY KEY,
  brand      TEXT NOT NULL,
  model      TEXT NOT NULL,
  plate      TEXT,
  year       INT,
  color      TEXT,
  energy     energy_type DEFAULT 'ESSENCE',
  gearbox    gearbox_type DEFAULT 'MANUAL',
  seats      INT,
  mileage    INT,
  vin        TEXT,
  keys_count INT,
  fiche      TEXT,                            -- technical description
  status     car_status DEFAULT 'AVAILABLE',
  hidden     BOOLEAN DEFAULT false,           -- website visibility
  -- images: JSON array of full public URLs from Supabase Storage (bucket: car-images)
  -- Example: ["https://...supabase.co/storage/v1/object/public/car-images/uuid.jpg"]
  images     JSONB DEFAULT '[]',
  -- inspection checklist snapshot
  inspection JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cars: public read"  ON cars FOR SELECT USING (true);
CREATE POLICY "cars: auth write"   ON cars FOR ALL USING (auth.role() = 'authenticated');

-- Index for status filter (Showroom page)
CREATE INDEX IF NOT EXISTS idx_cars_status ON cars(status);


-- ----------------------------------------------------------
-- 5.9 CAR DOCUMENT TYPES (custom document type names)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS car_document_types (
  id   SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);
ALTER TABLE car_document_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "car_document_types: auth all" ON car_document_types FOR ALL USING (auth.role() = 'authenticated');

-- Seed common document types
INSERT INTO car_document_types (name)
VALUES ('Carte Grise'), ('Contrôle Technique'), ('Assurance'), ('Carte de Propriété')
ON CONFLICT DO NOTHING;


-- ----------------------------------------------------------
-- 5.10 CAR DOCUMENTS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS car_documents (
  id        SERIAL PRIMARY KEY,
  car_id    INT NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  type      TEXT NOT NULL,                   -- e.g. "Carte Grise"
  -- doc_url: full public URL from Supabase Storage (bucket: car-documents)
  -- Stores images or PDFs scanned at purchase time
  doc_url   TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE car_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "car_documents: public read"  ON car_documents FOR SELECT USING (true);
CREATE POLICY "car_documents: auth write"   ON car_documents FOR ALL USING (auth.role() = 'authenticated');


-- ----------------------------------------------------------
-- 5.11 PURCHASES (Achats)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchases (
  id              SERIAL PRIMARY KEY,
  reference       TEXT UNIQUE,                        -- e.g. "ACH-0001"
  car_id          INT NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  source_type     source_type NOT NULL DEFAULT 'SUPPLIER',
  supplier_id     INT REFERENCES suppliers(id) ON DELETE SET NULL,
  client_id       INT REFERENCES clients(id) ON DELETE SET NULL,
  purchase_price  NUMERIC(12,2) NOT NULL DEFAULT 0,
  selling_price   NUMERIC(12,2) DEFAULT 0,
  amount_paid     NUMERIC(12,2) DEFAULT 0,
  amount_rest     NUMERIC(12,2) GENERATED ALWAYS AS (purchase_price - amount_paid) STORED,
  date            TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purchases: auth all" ON purchases FOR ALL USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_purchases_car_id ON purchases(car_id);

-- Auto-generate reference
CREATE OR REPLACE FUNCTION set_purchase_reference()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.reference IS NULL THEN
    NEW.reference := 'ACH-' || LPAD(NEW.id::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_purchase_reference
  BEFORE INSERT ON purchases
  FOR EACH ROW EXECUTE FUNCTION set_purchase_reference();


-- ----------------------------------------------------------
-- 5.12 PURCHASE PAYMENTS (debts on purchases)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchase_payments (
  id          SERIAL PRIMARY KEY,
  purchase_id INT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  amount      NUMERIC(12,2) NOT NULL,
  date        TIMESTAMPTZ DEFAULT NOW(),
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE purchase_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purchase_payments: auth all" ON purchase_payments FOR ALL USING (auth.role() = 'authenticated');

-- Update purchase.amount_paid when a payment is added
CREATE OR REPLACE FUNCTION update_purchase_paid()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE purchases
  SET amount_paid = (
    SELECT COALESCE(SUM(amount), 0)
    FROM purchase_payments
    WHERE purchase_id = NEW.purchase_id
  )
  WHERE id = NEW.purchase_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_update_purchase_paid
  AFTER INSERT OR UPDATE OR DELETE ON purchase_payments
  FOR EACH ROW EXECUTE FUNCTION update_purchase_paid();


-- ----------------------------------------------------------
-- 5.13 SALES (Ventes / POS)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales (
  id                   SERIAL PRIMARY KEY,
  reference            TEXT UNIQUE,                   -- e.g. "VNT-0001"
  car_id               INT NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  client_id            INT REFERENCES clients(id) ON DELETE SET NULL,
  sale_type            sale_type DEFAULT 'NORMAL',
  total_before_tax     NUMERIC(12,2) DEFAULT 0,
  tva_enabled          BOOLEAN DEFAULT false,
  tva_rate             NUMERIC(5,2) DEFAULT 19,
  reduction_type       reduction_type DEFAULT 'NONE',
  reduction_value      NUMERIC(12,2) DEFAULT 0,
  total_after_reduction NUMERIC(12,2) DEFAULT 0,
  amount_paid          NUMERIC(12,2) DEFAULT 0,
  amount_rest          NUMERIC(12,2) GENERATED ALWAYS AS (total_after_reduction - amount_paid) STORED,
  client_take_car      BOOLEAN DEFAULT true,
  inspection           JSONB DEFAULT '{}',
  date                 TIMESTAMPTZ DEFAULT NOW(),
  created_at           TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales: auth all" ON sales FOR ALL USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_sales_car_id    ON sales(car_id);
CREATE INDEX IF NOT EXISTS idx_sales_client_id ON sales(client_id);

-- Auto-generate reference + update car status
CREATE OR REPLACE FUNCTION set_sale_reference()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.reference IS NULL THEN
    NEW.reference := 'VNT-' || LPAD(NEW.id::text, 4, '0');
  END IF;
  -- Update car status based on sale type
  IF NEW.client_take_car THEN
    UPDATE cars SET status = 'SOLD' WHERE id = NEW.car_id;
  ELSE
    UPDATE cars SET status = 'RESERVED' WHERE id = NEW.car_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_sale_reference
  BEFORE INSERT ON sales
  FOR EACH ROW EXECUTE FUNCTION set_sale_reference();


-- ----------------------------------------------------------
-- 5.14 SALE PAYMENTS (règlements clients)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS sale_payments (
  id          SERIAL PRIMARY KEY,
  sale_id     INT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  -- Also store car_id for the Payments page (filtered by car/client)
  car_id      INT REFERENCES cars(id) ON DELETE SET NULL,
  amount      NUMERIC(12,2) NOT NULL,
  date        TIMESTAMPTZ DEFAULT NOW(),
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE sale_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sale_payments: auth all" ON sale_payments FOR ALL USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_sale_payments_sale_id ON sale_payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_payments_car_id  ON sale_payments(car_id);

-- Update sale.amount_paid when a payment is added
CREATE OR REPLACE FUNCTION update_sale_paid()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE sales
  SET amount_paid = (
    SELECT COALESCE(SUM(amount), 0)
    FROM sale_payments
    WHERE sale_id = NEW.sale_id
  )
  WHERE id = NEW.sale_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_update_sale_paid
  AFTER INSERT OR UPDATE OR DELETE ON sale_payments
  FOR EACH ROW EXECUTE FUNCTION update_sale_paid();


-- ----------------------------------------------------------
-- 5.15 EXPENSES (Dépenses)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS expenses (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  type        expense_type NOT NULL DEFAULT 'SHOWROOM',
  car_id      INT REFERENCES cars(id) ON DELETE SET NULL,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses: auth all" ON expenses FOR ALL USING (auth.role() = 'authenticated');
CREATE INDEX IF NOT EXISTS idx_expenses_type   ON expenses(type);
CREATE INDEX IF NOT EXISTS idx_expenses_car_id ON expenses(car_id);


-- ----------------------------------------------------------
-- 5.16 WEBSITE SPECIAL OFFERS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS special_offers (
  id            SERIAL PRIMARY KEY,
  car_id        INT NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  special_price NUMERIC(12,2) NOT NULL,
  old_price     NUMERIC(12,2),
  start_date    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date      TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE special_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "special_offers: public read"  ON special_offers FOR SELECT USING (true);
CREATE POLICY "special_offers: auth write"   ON special_offers FOR ALL USING (auth.role() = 'authenticated');


-- ----------------------------------------------------------
-- 5.17 WEBSITE RESERVATIONS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS website_reservations (
  id           SERIAL PRIMARY KEY,
  car_id       INT NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  client_name  TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  status       reservation_status DEFAULT 'PENDING',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE website_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "website_reservations: public insert"
  ON website_reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "website_reservations: auth all"
  ON website_reservations FOR ALL USING (auth.role() = 'authenticated');


-- ============================================================
-- 6. VIEWS (useful for the app)
-- ============================================================

-- Full car view with purchase + sale info (used by Showroom page)
CREATE OR REPLACE VIEW v_cars_full AS
SELECT
  c.*,
  -- latest purchase
  p.id               AS purchase_id,
  p.source_type,
  p.supplier_id,
  p.purchase_price,
  p.selling_price,
  p.amount_paid      AS purchase_amount_paid,
  p.amount_rest      AS purchase_amount_rest,
  p.date             AS purchase_date,
  p.reference        AS purchase_reference,
  -- supplier name
  s.full_name        AS supplier_name,
  s.phone            AS supplier_phone,
  -- latest sale
  sl.id              AS sale_id,
  sl.client_id,
  sl.sale_type,
  sl.total_after_reduction AS sale_total,
  sl.amount_paid     AS sale_amount_paid,
  sl.amount_rest     AS sale_amount_rest,
  -- client name
  cl.first_name      AS client_first_name,
  cl.last_name       AS client_last_name,
  cl.phone_primary   AS client_phone,
  cl.photo_url       AS client_photo_url
FROM cars c
LEFT JOIN LATERAL (
  SELECT * FROM purchases WHERE car_id = c.id ORDER BY created_at DESC LIMIT 1
) p ON true
LEFT JOIN suppliers s ON s.id = p.supplier_id
LEFT JOIN LATERAL (
  SELECT * FROM sales WHERE car_id = c.id ORDER BY created_at DESC LIMIT 1
) sl ON true
LEFT JOIN clients cl ON cl.id = sl.client_id;


-- Dashboard KPIs view
CREATE OR REPLACE VIEW v_dashboard_kpis AS
SELECT
  (SELECT COUNT(*) FROM cars WHERE status = 'AVAILABLE')           AS cars_in_stock,
  (SELECT COUNT(*) FROM cars WHERE status = 'SOLD'
     AND created_at >= date_trunc('month', NOW()))                 AS cars_sold_month,
  (SELECT COUNT(*) FROM cars WHERE status = 'RESERVED')           AS cars_reserved,
  (SELECT COALESCE(SUM(total_after_reduction), 0) FROM sales
     WHERE date >= date_trunc('month', NOW()))                     AS revenue_month,
  (SELECT COALESCE(SUM(amount_rest), 0) FROM sales
     WHERE amount_rest > 0)                                        AS client_debts,
  (SELECT COALESCE(SUM(amount_rest), 0) FROM purchases
     WHERE amount_rest > 0)                                        AS supplier_debts,
  (SELECT COALESCE(SUM(amount), 0) FROM expenses
     WHERE date >= date_trunc('month', CURRENT_DATE)::date)        AS expenses_month;


-- ============================================================
-- 7. USEFUL FUNCTIONS
-- ============================================================

-- Get client purchase/sale stats (used by Clients page)
CREATE OR REPLACE FUNCTION client_stats(p_client_id INT)
RETURNS TABLE(total_purchases INT, total_sales INT, sale_rest NUMERIC)
LANGUAGE sql STABLE AS $$
  SELECT
    (SELECT COUNT(*) FROM purchases WHERE client_id = p_client_id)::int,
    (SELECT COUNT(*) FROM sales     WHERE client_id = p_client_id)::int,
    (SELECT COALESCE(SUM(amount_rest), 0) FROM sales WHERE client_id = p_client_id AND amount_rest > 0);
$$;


-- ============================================================
-- 8. HOW IMAGE URLs WORK IN THIS APP
-- ============================================================
--
-- BUCKET: car-images
--   Upload path: car-images/{car_id}/{uuid}.jpg
--   URL stored in: cars.images  (JSONB array)
--   Example value: ["https://ewwdiycrlsbzgruyfzio.supabase.co/storage/v1/object/public/car-images/42/abc123.jpg"]
--   Displayed in: CarCard, CarImage component, Showroom, Purchase, Sales, Website
--
-- BUCKET: car-documents
--   Upload path: car-documents/{car_id}/{uuid}.pdf  (or .jpg)
--   URL stored in: car_documents.doc_url  (TEXT)
--   Example value: "https://...supabase.co/storage/v1/object/public/car-documents/42/doc.pdf"
--   Displayed in: Showroom detail modal, Purchase view modal, as clickable <a> links
--
-- BUCKET: client-photos
--   Upload path: client-photos/{client_id}/{uuid}.jpg
--   URL stored in: clients.photo_url  (TEXT)
--   Example value: "https://...supabase.co/storage/v1/object/public/client-photos/7/photo.jpg"
--   Displayed in: Clients page (avatar), Showroom car detail (client section)
--
-- BUCKET: showroom-logo
--   Upload path: showroom-logo/logo.{ext}
--   URL stored in: settings.logo_url  (TEXT)
--   Example value: "https://...supabase.co/storage/v1/object/public/showroom-logo/logo.png"
--   Displayed in: Login page header, print templates, website nav, Settings page
--
-- HOW TO GET THE URL AFTER UPLOADING:
--   const { data } = await supabase.storage.from('car-images').upload(path, file);
--   const { data: { publicUrl } } = supabase.storage.from('car-images').getPublicUrl(data.path);
--   // publicUrl is what you store in the database
--
-- ============================================================


-- ============================================================
-- 9. ROW LEVEL SECURITY — ANON key access
-- ============================================================
-- The anon key can:
--   - Read: cars, settings, special_offers, website_reservations (public pages)
--   - Insert: website_reservations (reservation form from website)
-- Everything else requires authentication.

-- Already set above. Summary:
-- cars:                 SELECT = true (public), ALL = authenticated
-- settings:             SELECT = true (public), ALL = authenticated
-- special_offers:       SELECT = true (public), ALL = authenticated
-- website_reservations: INSERT = true (public), ALL = authenticated
-- All other tables:     ALL = authenticated only


-- ============================================================
-- DONE — schema is ready.
-- Next step: run the Claude Code prompt to wire up the frontend.
-- ============================================================