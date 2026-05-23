ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS scheduled_delivery BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_time TIME;