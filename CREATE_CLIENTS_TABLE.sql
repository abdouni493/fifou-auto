-- ============================================
-- CREATE CLIENTS TABLE
-- Run this in Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dob DATE,
  gender TEXT DEFAULT 'M',
  pob TEXT,
  address TEXT,
  profession TEXT,
  mobile1 TEXT NOT NULL,
  mobile2 TEXT,
  nif TEXT,
  rc TEXT,
  nis TEXT,
  art TEXT,
  doc_type TEXT,
  doc_number TEXT,
  issue_date DATE,
  expiry_date DATE,
  photo_url TEXT,
  scan_url TEXT,
  signature_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

-- Disable RLS for simplicity (matching existing pattern)
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;

-- Create indexes for search
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients (first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_clients_mobile ON clients (mobile1);
CREATE INDEX IF NOT EXISTS idx_clients_doc ON clients (doc_number);

-- ============================================
-- OPTIONAL: Populate clients from existing sales
-- ============================================
INSERT INTO clients (first_name, last_name, dob, gender, pob, address, profession, mobile1, mobile2, nif, rc, nis, art, doc_type, doc_number, issue_date, expiry_date, photo_url, scan_url, signature_url, created_at, created_by)
SELECT DISTINCT ON (doc_number)
  first_name, last_name, dob::date, gender, pob, address, profession, mobile1, mobile2, nif, rc, nis, art, doc_type, doc_number, issue_date::date, expiry_date::date, photo_url, scan_url, signature_url, created_at, created_by
FROM sales
WHERE doc_number IS NOT NULL AND doc_number != ''
ON CONFLICT DO NOTHING;
