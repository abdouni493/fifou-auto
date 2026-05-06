-- SQL Script to Create Worker Transactions Table
-- This table tracks all worker transactions including payments, advances, and absences

CREATE TABLE IF NOT EXISTS public.worker_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('paiement', 'avance', 'absence', 'deduction')),
  amount NUMERIC(10, 2) NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_by VARCHAR(255)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_worker_transactions_worker_id 
ON public.worker_transactions(worker_id);

CREATE INDEX IF NOT EXISTS idx_worker_transactions_created_at 
ON public.worker_transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_worker_transactions_type 
ON public.worker_transactions(type);

CREATE INDEX IF NOT EXISTS idx_worker_transactions_date 
ON public.worker_transactions(date DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.worker_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "Admins can view all worker transactions"
ON public.worker_transactions FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert worker transactions"
ON public.worker_transactions FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update worker transactions"
ON public.worker_transactions FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete worker transactions"
ON public.worker_transactions FOR DELETE
USING (auth.uid() IS NOT NULL);
