import { supabase } from '@/integrations/supabase/client';

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
  table?: string;
  columns?: string;
  filters?: Filters;
  order_by?: { column: string; ascending?: boolean };
  payload?: Record<string, unknown>;
  limit?: number;
  [k: string]: unknown;
}

async function call<T = unknown>(body: CallBody): Promise<T> {
  const { data, error } = await supabase.functions.invoke('caseflow-proxy', {
    body,
  });
  if (error) {
    throw new Error(error.message || 'caseflow-proxy invocation failed');
  }
  if (data && typeof data === 'object' && 'error' in (data as any) && (data as any).error) {
    throw new Error((data as any).error);
  }
  return data as T;
}

export async function cfSelect<T = any>(
  table: string,
  opts: {
    columns?: string;
    filters?: Filters;
    order_by?: { column: string; ascending?: boolean };
    limit?: number;
  } = {},
): Promise<T[]> {
  const res = await call<{ data: T[] } | T[]>({
    action: 'select',
    table,
    ...opts,
  });
  if (Array.isArray(res)) return res;
  return (res as any)?.data ?? [];
}

export async function cfUpdateCase(
  id: string,
  payload: Record<string, unknown>,
): Promise<any> {
  const res = await call<{ data: any } | any>({
    action: 'update',
    table: 'cases',
    filters: { id },
    payload,
  });
  return (res as any)?.data ?? res;
}

export async function cfInsertCaseEvent(
  payload: Record<string, unknown>,
): Promise<any> {
  const res = await call<{ data: any } | any>({
    action: 'insert',
    table: 'case_events',
    payload,
  });
  return (res as any)?.data ?? res;
}