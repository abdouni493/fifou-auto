-- Update Purchases Table Schema for Client Support and Extra Fields

-- 1. Add client-related columns
ALTER TABLE public.purchases
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id),
ADD COLUMN IF NOT EXISTS client_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS client_phone VARCHAR(50);

-- 2. Add price and info columns
ALTER TABLE public.purchases
ADD COLUMN IF NOT EXISTS initial_client_price NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS car_notes TEXT,
ADD COLUMN IF NOT EXISTS car_info TEXT;

-- 3. Create indexes for client search within purchases
CREATE INDEX IF NOT EXISTS idx_purchases_client_id ON public.purchases(client_id);
CREATE INDEX IF NOT EXISTS idx_purchases_client_name ON public.purchases(client_name);

-- 4. Verify columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'purchases' 
AND column_name IN ('client_id', 'client_name', 'client_phone', 'initial_client_price', 'car_notes', 'car_info');
