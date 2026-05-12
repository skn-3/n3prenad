ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS case_id TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_case_id ON public.orders(case_id);