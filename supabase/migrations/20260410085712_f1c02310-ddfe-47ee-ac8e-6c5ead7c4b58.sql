
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  customer_address TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  date DATE NOT NULL,
  team_id TEXT NOT NULL,
  team_company TEXT NOT NULL,
  team_org_nr TEXT NOT NULL,
  team_bankgiro TEXT NOT NULL,
  team_email TEXT NOT NULL,
  distance_km INTEGER NOT NULL DEFAULT 0,
  windows_count INTEGER NOT NULL DEFAULT 0,
  doors_count INTEGER NOT NULL DEFAULT 0,
  facade_type TEXT NOT NULL DEFAULT 'tra',
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  description TEXT NOT NULL DEFAULT '',
  total_amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'order',
  invoice_sent_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Allow all operations without auth (internal tool, no sensitive data)
CREATE POLICY "Allow all access" ON public.orders FOR ALL USING (true) WITH CHECK (true);
