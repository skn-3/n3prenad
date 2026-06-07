/**
 * orders-gateway client wrapper.
 *
 * Steg 1/3: bara byggd och testbar. Inga befintliga komponenter använder den ännu.
 *
 * VARNING: ORDERS_GATEWAY_SECRET bakas in i frontend-bundeln och är därför
 * läsbar för alla som öppnar appen. Den här gatewayen ger ingen reell säkerhet
 * förrän vi i steg 2/3 byter till riktig auth eller origin-check.
 */

const FUNCTION_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/orders-gateway`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const GATEWAY_SECRET =
  ((import.meta.env.VITE_ORDERS_GATEWAY_SECRET || import.meta.env.ORDERS_GATEWAY_SECRET) as string) ||
  'AAxj8w111sj28Jsskao28dAKAKSqCE338xwn937c7fvtr4';

type Filters = Record<
  string,
  | string
  | number
  | boolean
  | null
  | { ilike: string }
  | { in: (string | number)[] }
  | { is_null: boolean }
>;

interface CallBody {
  action: string;
  [k: string]: unknown;
}

async function call<T = unknown>(body: CallBody): Promise<T> {
  if (!GATEWAY_SECRET) {
    throw new Error(
      'ORDERS_GATEWAY_SECRET saknas i miljövariabler — gatewayen kan inte anropas.',
    );
  }
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      'x-gateway-secret': GATEWAY_SECRET,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || `Gateway HTTP ${res.status}`);
  }
  return json as T;
}

export interface OrderRow {
  id: string;
  order_number: number | null;
  customer_address: string;
  customer_name: string | null;
  customer_phone: string | null;
  date: string;
  team_id: string;
  team_company: string;
  team_org_nr: string;
  team_bankgiro: string;
  team_email: string;
  distance_km: number;
  windows_count: number;
  doors_count: number;
  facade_type: string;
  line_items: unknown;
  description: string;
  total_amount: number;
  status: string;
  invoice_sent_at: string | null;
  invoice_number: string | null;
  credited_from_order_id: string | null;
  case_id: string | null;
  scheduled_delivery?: boolean;
  delivery_time?: string | null;
  created_at: string;
}

export async function listOrders(opts: {
  filters?: Filters;
  limit?: number;
  order_by?: { column: string; ascending?: boolean };
} = {}): Promise<OrderRow[]> {
  const { data } = await call<{ data: OrderRow[] }>({ action: 'list', ...opts });
  return data ?? [];
}

export async function getOrder(
  args: { id: string } | { order_number: number },
): Promise<OrderRow | null> {
  const { data } = await call<{ data: OrderRow | null }>({ action: 'get', ...args });
  return data ?? null;
}

export async function searchOrders(
  field: string,
  term: string,
  limit = 20,
): Promise<OrderRow[]> {
  const { data } = await call<{ data: OrderRow[] }>({
    action: 'search',
    field,
    term,
    limit,
  });
  return data ?? [];
}

export async function insertOrder(payload: Record<string, unknown>): Promise<OrderRow> {
  const { data } = await call<{ data: OrderRow }>({ action: 'insert', payload });
  return data;
}

export async function updateOrder(
  id: string,
  payload: Record<string, unknown>,
): Promise<OrderRow> {
  const { data } = await call<{ data: OrderRow }>({ action: 'update', id, payload });
  return data;
}

export async function checkDuplicate(
  args: { invoice_number: string } | { order_number: number },
): Promise<{ exists: boolean; id: string | null }> {
  return await call<{ exists: boolean; id: string | null }>({
    action: 'check_duplicate',
    ...args,
  });
}

export async function linkCase(order_id: string, case_id: string): Promise<OrderRow> {
  const { data } = await call<{ data: OrderRow }>({
    action: 'link_case',
    order_id,
    case_id,
  });
  return data;
}

export async function unlinkCase(order_id: string): Promise<OrderRow> {
  const { data } = await call<{ data: OrderRow }>({ action: 'unlink_case', order_id });
  return data;
}

export async function listOrdersByCaseIds(case_ids: string[]): Promise<OrderRow[]> {
  const { data } = await call<{ data: OrderRow[] }>({
    action: 'list_by_case_ids',
    case_ids,
  });
  return data ?? [];
}