import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GATEWAY_SECRET = Deno.env.get('ORDERS_GATEWAY_SECRET')!;

const ALLOW_HEADERS = {
  ...corsHeaders,
  'Access-Control-Allow-Headers':
    (corsHeaders as Record<string, string>)['Access-Control-Allow-Headers'] +
    ', x-gateway-secret',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...ALLOW_HEADERS, 'Content-Type': 'application/json' },
  });

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Action =
  | 'list'
  | 'get'
  | 'search'
  | 'insert'
  | 'update'
  | 'check_duplicate'
  | 'link_case'
  | 'unlink_case'
  | 'list_by_case_ids';

interface Body {
  action: Action;
  filters?: Record<string, unknown>;
  limit?: number;
  order_by?: { column: string; ascending?: boolean };
  id?: string;
  order_number?: number;
  invoice_number?: string;
  field?: string;
  term?: string;
  payload?: Record<string, unknown>;
  order_id?: string;
  case_id?: string | null;
  case_ids?: string[];
}

function applyFilters(q: any, filters?: Record<string, unknown>) {
  if (!filters) return q;
  for (const [k, v] of Object.entries(filters)) {
    if (v === null) {
      q = q.is(k, null);
    } else if (typeof v === 'object' && v !== null && 'ilike' in (v as any)) {
      q = q.ilike(k, (v as any).ilike);
    } else if (typeof v === 'object' && v !== null && 'in' in (v as any)) {
      q = q.in(k, (v as any).in);
    } else if (typeof v === 'object' && v !== null && 'is_null' in (v as any)) {
      q = (v as any).is_null ? q.is(k, null) : q.not(k, 'is', null);
    } else {
      q = q.eq(k, v);
    }
  }
  return q;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: ALLOW_HEADERS });
  }

  // Shared-secret auth
  const provided = req.headers.get('x-gateway-secret');
  if (!provided || provided !== GATEWAY_SECRET) {
    return json({ error: 'Unauthorized' }, 401);
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.action) return json({ error: 'Missing action' }, 400);

  try {
    switch (body.action) {
      case 'list': {
        let q = admin.from('orders').select('*');
        q = applyFilters(q, body.filters);
        if (body.order_by) {
          q = q.order(body.order_by.column, {
            ascending: body.order_by.ascending ?? false,
          });
        } else {
          q = q.order('created_at', { ascending: false });
        }
        if (body.limit) q = q.limit(body.limit);
        const { data, error } = await q;
        if (error) throw error;
        return json({ data });
      }

      case 'get': {
        let q = admin.from('orders').select('*').limit(1);
        if (body.id) q = q.eq('id', body.id);
        else if (typeof body.order_number === 'number')
          q = q.eq('order_number', body.order_number);
        else return json({ error: 'id or order_number required' }, 400);
        const { data, error } = await q.maybeSingle();
        if (error) throw error;
        return json({ data });
      }

      case 'search': {
        if (!body.field || !body.term)
          return json({ error: 'field and term required' }, 400);
        const { data, error } = await admin
          .from('orders')
          .select('*')
          .ilike(body.field, `%${body.term}%`)
          .limit(body.limit ?? 20);
        if (error) throw error;
        return json({ data });
      }

      case 'insert': {
        if (!body.payload) return json({ error: 'payload required' }, 400);
        const { data, error } = await admin
          .from('orders')
          .insert(body.payload)
          .select()
          .single();
        if (error) throw error;
        return json({ data });
      }

      case 'update': {
        if (!body.id || !body.payload)
          return json({ error: 'id and payload required' }, 400);
        const { data, error } = await admin
          .from('orders')
          .update(body.payload)
          .eq('id', body.id)
          .select()
          .single();
        if (error) throw error;
        return json({ data });
      }

      case 'check_duplicate': {
        let q = admin.from('orders').select('id').limit(1);
        if (body.invoice_number) q = q.eq('invoice_number', body.invoice_number);
        else if (typeof body.order_number === 'number')
          q = q.eq('order_number', body.order_number);
        else
          return json(
            { error: 'invoice_number or order_number required' },
            400,
          );
        const { data, error } = await q.maybeSingle();
        if (error) throw error;
        return json({ exists: !!data, id: data?.id ?? null });
      }

      case 'link_case': {
        if (!body.order_id || !body.case_id)
          return json({ error: 'order_id and case_id required' }, 400);
        const { data, error } = await admin
          .from('orders')
          .update({ case_id: body.case_id })
          .eq('id', body.order_id)
          .select()
          .single();
        if (error) throw error;
        return json({ data });
      }

      case 'unlink_case': {
        if (!body.order_id) return json({ error: 'order_id required' }, 400);
        const { data, error } = await admin
          .from('orders')
          .update({ case_id: null })
          .eq('id', body.order_id)
          .select()
          .single();
        if (error) throw error;
        return json({ data });
      }

      case 'list_by_case_ids': {
        if (!body.case_ids || !Array.isArray(body.case_ids))
          return json({ error: 'case_ids array required' }, 400);
        if (body.case_ids.length === 0) return json({ data: [] });
        const { data, error } = await admin
          .from('orders')
          .select('*')
          .in('case_id', body.case_ids);
        if (error) throw error;
        return json({ data });
      }

      default:
        return json({ error: `Unknown action: ${body.action}` }, 400);
    }
  } catch (err) {
    console.error('[orders-gateway] error:', err);
    return json({ error: (err as Error).message || 'Internal error' }, 500);
  }
});