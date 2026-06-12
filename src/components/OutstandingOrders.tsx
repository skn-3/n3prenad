import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { listOrders, updateOrder, type OrderRow } from '@/utils/ordersGateway';
import { useTeams } from '@/components/TeamManager';

export default function OutstandingOrders() {
  const { teams } = useTeams();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignOrder, setAssignOrder] = useState<OrderRow | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const fetchOutstanding = async () => {
    setLoading(true);
    try {
      const data = await listOrders({
        filters: { team_id: { is_null: true } },
        order_by: { column: 'date', ascending: false },
      });
      setOrders(data);
    } catch (err: any) {
      console.error(err);
      toast.error(`Kunde inte hämta utestående ordrar: ${err.message || 'Okänt fel'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOutstanding(); }, []);

  const totalValue = useMemo(
    () => orders.reduce((s, o) => s + (o.total_amount || 0), 0),
    [orders],
  );
  const internalTotal = useMemo(
    () => orders.reduce((s, o) => {
      const h = Number((o as any).internal_extra_hours || 0);
      const r = Number((o as any).internal_hour_rate || 0);
      const a = Number((o as any).internal_extra_amount || 0);
      return s + Math.round(h * r + a);
    }, 0),
    [orders],
  );
  const grandTotal = totalValue + internalTotal;

  const openAssign = (order: OrderRow) => {
    setAssignOrder(order);
    setSelectedTeamId('');
  };

  const confirmAssign = async () => {
    if (!assignOrder || !selectedTeamId) return;
    const team = teams.find(t => t.id === selectedTeamId);
    if (!team) { toast.error('Valt team hittades inte'); return; }
    setSaving(true);
    try {
      await updateOrder(assignOrder.id, {
        team_id: team.name,
        team_company: team.companyName,
        team_org_nr: team.orgNr,
        team_bankgiro: team.bankgiro,
        team_email: team.email,
      });
      toast.success(`Order #${assignOrder.order_number ?? ''} tilldelad ${team.name}`);
      setAssignOrder(null);
      setSelectedTeamId('');
      await fetchOutstanding();
    } catch (err: any) {
      toast.error(`Kunde inte tilldela: ${err.message || 'Okänt fel'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground mb-1">Utestående totalt</p>
          <p className="text-3xl font-bold text-primary">
            {grandTotal.toLocaleString('sv-SE')} kr
            <span className="text-base font-normal text-muted-foreground ml-3">
              · {orders.length} {orders.length === 1 ? 'order' : 'ordrar'}
            </span>
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            varav montörsvärde {totalValue.toLocaleString('sv-SE')} kr · internt{' '}
            {internalTotal.toLocaleString('sv-SE')} kr
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            Utestående A-ordrar (ej tilldelade)
            <Button variant="outline" size="sm" onClick={fetchOutstanding} disabled={loading}>
              Uppdatera
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : orders.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Inga utestående ordrar.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Ordernr</th>
                    <th className="text-left p-2">Datum</th>
                    <th className="text-left p-2">Kund</th>
                    <th className="text-left p-2">Adress</th>
                    <th className="text-right p-2">Enheter</th>
                    <th className="text-right p-2">Montörsvärde</th>
                    <th className="text-right p-2">Internt</th>
                    <th className="text-right p-2">Totalt</th>
                    <th className="text-right p-2">Åtgärd</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => {
                    const units = (o.windows_count || 0) + (o.doors_count || 0) + ((o as any).roof_windows_count || 0);
                    const h = Number((o as any).internal_extra_hours || 0);
                    const r = Number((o as any).internal_hour_rate || 0);
                    const a = Number((o as any).internal_extra_amount || 0);
                    const internal = Math.round(h * r + a);
                    const rowTotal = (o.total_amount || 0) + internal;
                    return (
                      <tr key={o.id} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{o.order_number ? `#${o.order_number}` : '—'}</td>
                        <td className="p-2">{o.date}</td>
                        <td className="p-2">{o.customer_name || '—'}</td>
                        <td className="p-2">{o.customer_address}</td>
                        <td className="p-2 text-right">{units}</td>
                        <td className="p-2 text-right">{(o.total_amount || 0).toLocaleString('sv-SE')} kr</td>
                        <td className="p-2 text-right">{internal.toLocaleString('sv-SE')} kr</td>
                        <td className="p-2 text-right font-medium">{rowTotal.toLocaleString('sv-SE')} kr</td>
                        <td className="p-2 text-right">
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => openAssign(o)}>
                            <UserPlus className="h-3.5 w-3.5" /> Tilldela montör
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!assignOrder} onOpenChange={(open) => { if (!open) { setAssignOrder(null); setSelectedTeamId(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tilldela montör — order #{assignOrder?.order_number ?? ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">{assignOrder?.customer_address}</p>
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger><SelectValue placeholder="Välj montör..." /></SelectTrigger>
              <SelectContent>
                {teams.filter(t => t.isActive).map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name} — {t.companyName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOrder(null)} disabled={saving}>Avbryt</Button>
            <Button onClick={confirmAssign} disabled={!selectedTeamId || saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Sparar...</> : 'Tilldela'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}