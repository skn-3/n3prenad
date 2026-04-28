ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS invoice_number text,
  ADD COLUMN IF NOT EXISTS credited_from_order_id uuid REFERENCES public.orders(id);

CREATE INDEX IF NOT EXISTS idx_orders_invoice_number ON public.orders(invoice_number);