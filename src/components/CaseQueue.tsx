import { useQuery } from '@tanstack/react-query';
import { caseflowDb } from '@/integrations/supabase/caseflowClient';
import { listOrders } from '@/utils/ordersGateway';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Loader2 } from 'lucide-react';

interface CaseRow {
  id: string;
  address: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  seller: string | null;
  team: string | null;
  status: string | null;
  order_value: number | null;
  offer_number: string | null;
  notes: string | null;
  created_at: string;
}

interface CaseQueueProps {
  onCreateOrder: (c: CaseRow) => void;
  onGoToInvoicing: () => void;
}

const statusBadge: Record<string, { label: string; className: string }> = {
  km_klar: { label: 'KM klar', className: 'bg-blue-500 text-white hover:bg-blue-500' },
  montage_bokat: { label: 'Montage bokat', className: 'bg-yellow-500 text-black hover:bg-yellow-500' },
  leverans_klar: { label: 'Leverans klar', className: 'bg-green-500 text-white hover:bg-green-500' },
  montage_klart: { label: 'Montage klart', className: 'bg-emerald-600 text-white hover:bg-emerald-600' },
};

function formatSEK(n: number | null) {
  if (!n) return null;
  return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(n);
}

export default function CaseQueue({ onCreateOrder, onGoToInvoicing }: CaseQueueProps) {
  const { data: orderCases = [], isLoading: loadingOrder } = useQuery({
    queryKey: ['caseflow-cases', 'order-ready'],
    queryFn: async () => {
      const { data, error } = await caseflowDb
        .from('cases')
        .select('*')
        .in('status', ['km_klar', 'montage_bokat', 'leverans_klar'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as CaseRow[];
    },
  });

  const { data: invoiceCases = [], isLoading: loadingInvoice } = useQuery({
    queryKey: ['caseflow-cases', 'invoice-ready'],
    queryFn: async () => {
      const { data, error } = await caseflowDb
        .from('cases')
        .select('*')
        .eq('status', 'montage_klart')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as CaseRow[];
    },
  });

  const { data: linkedOrders = [] } = useQuery({
    queryKey: ['linked-orders'],
    queryFn: async () => {
      const data = await listOrders({
        filters: { case_id: { is_null: false } },
      });
      return data;
    },
  });

  const linkedIds = new Set(linkedOrders.map((o: any) => o.case_id));
  const readyForOrder = orderCases.filter(c => !linkedIds.has(c.id));

  // For invoicing: case has status montage_klart AND a matching order with status='order'
  const orderByCaseId = new Map<string, any>();
  linkedOrders.forEach((o: any) => {
    if (o.case_id && o.status === 'order') orderByCaseId.set(o.case_id, o);
  });
  const readyForInvoice = invoiceCases
    .map(c => ({ caseRow: c, order: orderByCaseId.get(c.id) }))
    .filter(x => !!x.order);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Redo för A-ORDER</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingOrder ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Hämtar ärenden...
            </div>
          ) : readyForOrder.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              Inga ärenden just nu.
              <p className="text-xs mt-1">Ärenden med status KM klar, Montage bokat eller Leverans klar visas här.</p>
            </div>
          ) : (
            readyForOrder.map(c => {
              const sb = c.status ? statusBadge[c.status] : undefined;
              return (
                <div
                  key={c.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-3 border rounded-lg p-4 hover:bg-accent/40 transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{c.address || '(adress saknas)'}</div>
                    <div className="text-sm text-muted-foreground">
                      {c.customer_name}{c.customer_phone ? ` · ${c.customer_phone}` : ''}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {c.team && <Badge variant="outline">{c.team}</Badge>}
                      {sb && <Badge className={sb.className}>{sb.label}</Badge>}
                      {c.order_value ? <span className="text-xs text-muted-foreground">{formatSEK(c.order_value)}</span> : null}
                    </div>
                  </div>
                  <Button onClick={() => onCreateOrder(c)} className="gap-2 shrink-0">
                    Skapa A-ORDER <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Redo att fakturera</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingInvoice ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Hämtar ärenden...
            </div>
          ) : readyForInvoice.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              Inga ärenden just nu.
              <p className="text-xs mt-1">Ärenden med status Montage klart och en kopplad A-ORDER visas här.</p>
            </div>
          ) : (
            readyForInvoice.map(({ caseRow: c, order }) => (
              <div
                key={c.id}
                className="flex flex-col md:flex-row md:items-center justify-between gap-3 border rounded-lg p-4 hover:bg-accent/40 transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{c.address || order.customer_address}</div>
                  <div className="text-sm text-muted-foreground">
                    {c.customer_name}{c.team ? ` · ${c.team}` : ''}
                  </div>
                  <div className="text-sm font-medium mt-1">{formatSEK(order.total_amount)}</div>
                </div>
                <Button onClick={onGoToInvoicing} variant="default" className="gap-2 shrink-0">
                  Fakturera <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}