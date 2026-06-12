ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS internal_extra_hours numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS internal_hour_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS internal_extra_amount numeric NOT NULL DEFAULT 0;