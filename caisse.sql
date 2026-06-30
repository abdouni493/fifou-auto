-- ============================================================
-- SHOWROOM — CAISSE (CASH REGISTER) MIGRATION
-- Run this ONCE in the Supabase SQL Editor (Dashboard → SQL Editor).
-- Safe to re-run (idempotent).
--
-- Adds a single table `cash_transactions` that records both:
--   • DEPOSIT    (Versement / Dépôt)  — money put INTO the caisse, attached to a
--                                        client name + phone (optionally linked
--                                        to an existing clients row).
--   • WITHDRAWAL (Retrait)            — money taken OUT of the caisse.
--
-- The frontend (Supabase JS client / PostgREST) reads/writes this table directly,
-- exactly like sales, purchases and expenses.
-- ============================================================


-- ============================================================
-- 1. ENUM — transaction direction
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cash_tx_type') THEN
    CREATE TYPE cash_tx_type AS ENUM ('DEPOSIT', 'WITHDRAWAL');
  END IF;
END $$;


-- ============================================================
-- 2. TABLE — cash_transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cash_transactions (
  id           SERIAL PRIMARY KEY,
  reference    TEXT UNIQUE,                       -- e.g. "VRS-0001" / "RET-0001"
  type         cash_tx_type NOT NULL DEFAULT 'DEPOSIT',
  -- Deposit party (free-typed, optionally linked to an existing client)
  client_id    INT REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name  TEXT,
  client_phone TEXT,
  -- Money + meta
  amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  description  TEXT,
  date         TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- date AND time of the operation
  created_at   TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 3. AUTO-GENERATE reference  (VRS-0001 for deposits, RET-0001 for withdrawals)
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_cash_transaction_reference()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.reference IS NULL THEN
    NEW.reference :=
      CASE WHEN NEW.type = 'WITHDRAWAL' THEN 'RET-' ELSE 'VRS-' END
      || LPAD(NEW.id::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cash_transaction_reference ON public.cash_transactions;
CREATE TRIGGER trg_cash_transaction_reference
  BEFORE INSERT ON public.cash_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_cash_transaction_reference();


-- ============================================================
-- 4. ROW LEVEL SECURITY  (authenticated users only — same as sales/expenses)
-- ============================================================
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cash_transactions: auth all" ON public.cash_transactions;
CREATE POLICY "cash_transactions: auth all"
  ON public.cash_transactions FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


-- ============================================================
-- 5. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_cash_transactions_type      ON public.cash_transactions(type);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_date      ON public.cash_transactions(date);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_client_id ON public.cash_transactions(client_id);


-- ============================================================
-- DONE.
-- The "Caisse" interface (admin sidebar) now reads/writes this table.
-- Deposits  → type = 'DEPOSIT'    (client_name / client_phone / amount / description)
-- Withdraws → type = 'WITHDRAWAL' (amount / description)
-- ============================================================
