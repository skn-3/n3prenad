ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_number_unique;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_number_key;