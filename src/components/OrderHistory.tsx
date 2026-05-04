import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { generateOrderPDF } from '@/utils/pdfGenerator';
import { generateInvoicePDF } from '@/utils/invoicePdfGenerator';
import { useTeams } from '@/components/TeamManager';
import { Download, FileText, Loader2, Send, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

interface OrderRow {
  id: string;
  order_number: number;
  date: string;
  customer_address: string;
  customer_name: string | null;
  customer_phone: string | null;
  team_id: string;
  team_company: string;
  team_org_nr: string;
  team_bankgiro: string;
  team_email: string;
  distance_km: number;
  windows_count: number;
  doors_count: number;
  facade_type: string;
  line_items: any[];
  description: string;
  total_amount: number;
  status: string;
  invoice_sent_at: string | null;
  created_at: string;
  invoice_number: string | null;
  credited_from_order_id: string | null;
}

export default function OrderHistory() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoiceOrder, setInvoiceOrder] = useState<OrderRow | null>(null);
  const [invoiceLines, setInvoiceLines] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [pendingPdf, setPendingPdf] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);
  const [pendingInvoiceNumber, setPendingInvoiceNumber] = useState<string | null>(null);
  const [creditedOrder, setCreditedOrder] = useState<OrderRow | null>(null);
  const [creditPromptOrder, setCreditPromptOrder] = useState<OrderRow | null>(null);
  const [manualInvoiceNumber, setManualInvoiceNumber] = useState('');
  const { teams, setTeams } = useTeams();

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Kunde inte hämta ordrar');
      console.error(error);
    } else {
      setOrders((data || []).map((d: any) => ({ ...d, line_items: d.line_items as any[] })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const downloadOrderPDF = (order: OrderRow) => {
    const team = {
      id: order.team_id,
      name: order.team_id,
      companyName: order.team_company,
      orgNr: order.team_org_nr,
      address: '',
      email: order.team_email,
      bankgiro: order.team_bankgiro,
      isActive: true,
    };
    const lines = (order.line_items as any[]).map((l: any, i: number) => ({
      id: `line-${i}`,
      name: l.name,
      unitPrice: l.unit_price,
      quantity: l.quantity,
      sum: l.sum,
    }));
    const pdf = generateOrderPDF({
      date: order.date,
      orderNumber: order.order_number,
      customerAddress: order.customer_address,
      lines,
      description: order.description,
      team,
    });
    pdf.save(`A-ORDER-${order.order_number}.pdf`);
  };

  const openInvoiceDialog = (order: OrderRow) => {
    setInvoiceOrder(order);
    setInvoiceLines((order.line_items as any[]).map(l => ({ ...l })));
  };

  const updateInvoiceLineQty = (idx: number, qty: number) => {
    setInvoiceLines(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      return { ...l, quantity: qty, sum: Math.round(l.unit_price * qty) };
    }));
  };

  const getInvoiceEmail = (order: OrderRow): string => {
    // Find team in localStorage to check for invoiceEmail
    const team = teams.find(t => t.name === order.team_id || t.companyName === order.team_company);
    if (team?.invoiceEmail) return team.invoiceEmail;
    return order.team_email;
  };

  const findTeamFor = (order: OrderRow) =>
    teams.find(t => t.name === order.team_id || t.companyName === order.team_company);

  const buildInvoiceNumber = (order: OrderRow): string => {
    const team = findTeamFor(order);
    const prefix = (team?.invoicePrefix || order.team_id || 'INV').toUpperCase();
    const num = team?.nextInvoiceNumber ?? 1;
    return `${prefix}-${String(num).padStart(3, '0')}`;
  };

  const incrementTeamInvoiceCounter = (order: OrderRow) => {
    const team = findTeamFor(order);
    if (!team) return;
    setTeams(prev => prev.map(t =>
      t.id === team.id ? { ...t, nextInvoiceNumber: (t.nextInvoiceNumber ?? 1) + 1 } : t
    ));
  };

  const finishInvoice = async (order: OrderRow, invoiceNumber: string) => {
    const newTotal = invoiceLines.reduce((s: number, l: any) => s + l.sum, 0);
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'invoiced',
        invoice_sent_at: new Date().toISOString(),
        line_items: invoiceLines,
        total_amount: newTotal,
        invoice_number: invoiceNumber,
      } as any)
      .eq('id', order.id);
    if (error) console.error('Update error:', error);
    incrementTeamInvoiceCounter(order);
    fetchOrders();
  };

  // Store invoiceOrder ref for send dialog
  const [invoiceOrderForSend, setInvoiceOrderForSend] = useState<OrderRow | null>(null);

  const handleGenerateInvoice = async () => {
    if (!invoiceOrder) return;
    setSaving(true);
    try {
      const invoiceNumber = buildInvoiceNumber(invoiceOrder);
      const pdf = generateInvoicePDF({
        date: new Date().toISOString().split('T')[0],
        orderNumber: invoiceOrder.order_number,
        customerAddress: invoiceOrder.customer_address,
        lines: invoiceLines,
        description: invoiceOrder.description,
        teamCompany: invoiceOrder.team_company,
        teamOrgNr: invoiceOrder.team_org_nr,
        teamBankgiro: invoiceOrder.team_bankgiro,
        teamAddress: '',
        invoiceNumber,
      });

      setPendingPdf(pdf);
      setInvoiceOrderForSend(invoiceOrder);
      setPendingInvoiceNumber(invoiceNumber);
      setInvoiceOrder(null);
      setShowSendDialog(true);
    } catch (err: any) {
      toast.error(`Fel: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleJustDownload = async () => {
    if (!pendingPdf || !invoiceOrderForSend || !pendingInvoiceNumber) return;
    pendingPdf.save(`FAKTURA-${pendingInvoiceNumber}.pdf`);
    await finishInvoice(invoiceOrderForSend, pendingInvoiceNumber);
    toast.success(`Faktura ${pendingInvoiceNumber} nedladdad`);
    setShowSendDialog(false);
    setPendingPdf(null);
    setInvoiceOrderForSend(null);
    setPendingInvoiceNumber(null);
  };

  const handleSendAndDownload = async () => {
    if (!pendingPdf || !invoiceOrderForSend || !pendingInvoiceNumber) return;
    setIsSending(true);
    try {
      pendingPdf.save(`FAKTURA-${pendingInvoiceNumber}.pdf`);

      // Get PDF base64
      const pdfBase64 = pendingPdf.output('datauristring').split(',')[1];
      const recipientEmail = getInvoiceEmail(invoiceOrderForSend);

      const { data, error } = await supabase.functions.invoke('send-order-email', {
        body: {
          recipientEmail,
          recipientName: invoiceOrderForSend.team_company,
          orderNumber: pendingInvoiceNumber,
          customerAddress: invoiceOrderForSend.customer_address,
          customerName: invoiceOrderForSend.customer_name,
          customerPhone: invoiceOrderForSend.customer_phone,
          description: invoiceOrderForSend.description,
          pdfBase64,
          imageAttachments: [],
          isInvoice: true,
        },
      });

      if (error) throw new Error(error.message || 'Nätverksfel');
      if (data && !data.ok) throw new Error(data.error || 'Okänt fel');

      await finishInvoice(invoiceOrderForSend, pendingInvoiceNumber);
      toast.success(`Faktura ${pendingInvoiceNumber} skickad till ${recipientEmail}`);
    } catch (err: any) {
      toast.error(`Kunde inte skicka: ${err.message}`);
    } finally {
      setIsSending(false);
      setShowSendDialog(false);
      setPendingPdf(null);
      setInvoiceOrderForSend(null);
      setPendingInvoiceNumber(null);
    }
  };

  const handleCreditInvoice = async (order: OrderRow, overrideInvoiceNumber?: string) => {
    const originalInvoiceNumber = overrideInvoiceNumber || order.invoice_number;
    if (!originalInvoiceNumber) {
      setCreditPromptOrder(order);
      setManualInvoiceNumber('');
      return;
    }
    const creditNumber = `${originalInvoiceNumber}K`;
    const today = new Date().toISOString().split('T')[0];

    try {
      // 1. Generate credit PDF (in-memory)
      const pdf = generateInvoicePDF({
        date: today,
        orderNumber: order.order_number,
        customerAddress: order.customer_address,
        lines: order.line_items as any[],
        description: order.description,
        teamCompany: order.team_company,
        teamOrgNr: order.team_org_nr,
        teamBankgiro: order.team_bankgiro,
        teamAddress: '',
        invoiceNumber: creditNumber,
        isCredit: true,
        creditOfInvoiceNumber: originalInvoiceNumber,
      });

      // 2. Save credit row to DB FIRST (order_number = null to avoid any unique conflicts)
      const negativeLines = (order.line_items as any[]).map((l: any) => ({
        ...l,
        unit_price: -Math.abs(l.unit_price),
        sum: -Math.abs(l.sum),
      }));
      const { error: insertErr } = await supabase.from('orders').insert({
        order_number: null as any,
        date: today,
        customer_address: order.customer_address,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        team_id: order.team_id,
        team_company: order.team_company,
        team_org_nr: order.team_org_nr,
        team_bankgiro: order.team_bankgiro,
        team_email: order.team_email,
        distance_km: order.distance_km,
        windows_count: order.windows_count,
        doors_count: order.doors_count,
        facade_type: order.facade_type,
        line_items: negativeLines,
        description: `Kreditering av faktura ${originalInvoiceNumber}`,
        total_amount: -Math.abs(order.total_amount),
        status: 'credited',
        invoice_number: creditNumber,
        credited_from_order_id: order.id,
      } as any);
      if (insertErr) throw insertErr;

      // 3. Mark original as credited
      const { error: updErr } = await supabase
        .from('orders')
        .update({ status: 'credited' } as any)
        .eq('id', order.id);
      if (updErr) throw updErr;

      // 4. Save PDF to disk
      pdf.save(`KREDITFAKTURA-${creditNumber}.pdf`);

      // 5. Now (and only now) send email
      const pdfBase64 = pdf.output('datauristring').split(',')[1];
      const recipientEmail = getInvoiceEmail(order);
      try {
        const { data: emailData, error: emailError } = await supabase.functions.invoke('send-order-email', {
          body: {
            recipientEmail,
            recipientName: order.team_company,
            orderNumber: creditNumber,
            customerAddress: order.customer_address,
            customerName: order.customer_name,
            customerPhone: order.customer_phone,
            description: `Kreditering av faktura ${originalInvoiceNumber}`,
            pdfBase64,
            imageAttachments: [],
            isInvoice: true,
            isCredit: true,
            creditOfInvoiceNumber: originalInvoiceNumber,
          },
        });
        if (emailError) throw new Error(emailError.message);
        if (emailData && !emailData.ok) throw new Error(emailData.error || 'Okänt fel');
        toast.success(`Kreditfaktura ${creditNumber} skapad och skickad till ${recipientEmail}`);
      } catch (e: any) {
        console.warn('Kreditfaktura-mail misslyckades', e);
        toast.warning(`Kreditfaktura ${creditNumber} skapad, men mail misslyckades: ${e.message}`);
      }

      await fetchOrders();
      setCreditedOrder(order);
    } catch (err: any) {
      toast.error(`Kunde inte kreditera: ${err.message}`);
    }
  };

  const handleCreateNewInvoiceAfterCredit = () => {
    if (!creditedOrder) return;
    // Re-open invoice dialog with original lines
    setInvoiceLines((creditedOrder.line_items as any[]).map(l => ({ ...l })));
    setInvoiceOrder(creditedOrder);
    setCreditedOrder(null);
  };

  const invoiceTotal = invoiceLines.reduce((s: number, l: any) => s + l.sum, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            Orderhistorik
            <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading}>
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
            <p className="text-muted-foreground text-center py-8">Inga ordrar sparade ännu.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Ordernr</th>
                    <th className="text-left p-2">Datum</th>
                    <th className="text-left p-2">Kundadress</th>
                    <th className="text-left p-2">Montör</th>
                    <th className="text-right p-2">Totalt</th>
                    <th className="text-left p-2">Fakturanr</th>
                    <th className="text-center p-2">Status</th>
                    <th className="text-right p-2">Åtgärder</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{order.order_number ? `#${order.order_number}` : '—'}</td>
                      <td className="p-2">{order.date}</td>
                      <td className="p-2">{order.customer_address}</td>
                      <td className="p-2">{order.team_company}</td>
                      <td className="p-2 text-right">{order.total_amount.toLocaleString('sv-SE')} kr</td>
                      <td className="p-2 font-mono text-xs">{order.invoice_number || ''}</td>
                      <td className="p-2 text-center">
                        {order.status === 'credited' ? (
                          <Badge variant="destructive">Krediterad</Badge>
                        ) : order.status === 'invoiced' ? (
                          <Badge variant="secondary">Fakturerad</Badge>
                        ) : (
                          <Badge className="bg-primary text-primary-foreground">Order</Badge>
                        )}
                      </td>
                      <td className="p-2 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => downloadOrderPDF(order)} title="Ladda ner A-ORDER PDF">
                            <Download className="h-4 w-4" />
                          </Button>
                          {order.status === 'order' && (
                            <Button variant="outline" size="sm" onClick={() => openInvoiceDialog(order)} className="gap-1">
                              <FileText className="h-3.5 w-3.5" /> → Faktura
                            </Button>
                          )}
                          {order.status === 'invoiced' && (
                            <Button variant="outline" size="sm" onClick={() => handleCreditInvoice(order)} className="gap-1" title="Kreditera faktura">
                              <Undo2 className="h-3.5 w-3.5" /> Kreditera
                            </Button>
                          )}
                          {order.status === 'credited' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Find original order to re-invoice (positive lines)
                                const original = order.credited_from_order_id
                                  ? orders.find(o => o.id === order.credited_from_order_id)
                                  : null;
                                const source = original || order;
                                const positiveLines = (source.line_items as any[]).map((l: any) => ({
                                  ...l,
                                  unit_price: Math.abs(l.unit_price),
                                  sum: Math.abs(l.sum),
                                }));
                                setInvoiceLines(positiveLines);
                                setInvoiceOrder({ ...source, line_items: positiveLines });
                              }}
                              className="gap-1"
                              title="Skapa ny faktura"
                            >
                              <FileText className="h-3.5 w-3.5" /> → Ny faktura
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice line editing dialog */}
      <Dialog open={!!invoiceOrder} onOpenChange={(open) => !open && setInvoiceOrder(null)}>
        <DialogContent
          className="max-w-2xl p-0"
          style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
        >
          {/* Fixed header */}
          <div className="px-6 pt-6 pb-3" style={{ flexShrink: 0 }}>
            <DialogTitle>Konvertera till faktura — #{invoiceOrder?.order_number}</DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">Justera antal vid behov innan du genererar faktura-PDF.</p>
          </div>

          {/* Scrollable body */}
          <div className="px-6" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Benämning</th>
                  <th className="text-right p-2">Å-pris</th>
                  <th className="text-right p-2 w-24">Antal</th>
                  <th className="text-right p-2">Summa</th>
                </tr>
              </thead>
              <tbody>
                {invoiceLines.map((line, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="p-2">{line.name}</td>
                    <td className="p-2 text-right">{line.unit_price?.toLocaleString('sv-SE')}</td>
                    <td className="p-2 text-right">
                      <Input
                        type="number"
                        min={0}
                        className="w-20 ml-auto text-right"
                        value={line.quantity}
                        onChange={e => updateInvoiceLineQty(idx, Number(e.target.value))}
                      />
                    </td>
                    <td className="p-2 text-right font-medium">{line.sum?.toLocaleString('sv-SE')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Fixed footer */}
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{ flexShrink: 0, borderTop: '1px solid hsl(var(--border))', background: 'hsl(var(--background))' }}
          >
            <div className="text-lg font-bold text-primary">
              Totalt: {invoiceTotal.toLocaleString('sv-SE')} kr
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setInvoiceOrder(null)} disabled={saving}>Avbryt</Button>
              <Button onClick={handleGenerateInvoice} disabled={saving}>
                {saving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Genererar...</> : 'Generera faktura-PDF'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send invoice dialog */}
      <Dialog open={showSendDialog} onOpenChange={(open) => { if (!open && !isSending) { setShowSendDialog(false); setPendingPdf(null); setInvoiceOrderForSend(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Skicka faktura till montör?</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>Faktura <strong>#{invoiceOrderForSend?.order_number}</strong> är genererad.</p>
            <p>Skicka till: <strong>{invoiceOrderForSend ? getInvoiceEmail(invoiceOrderForSend) : ''}</strong></p>
            <p className="text-muted-foreground text-xs">CC: daniel@malke.se</p>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={handleJustDownload} disabled={isSending}>
              Bara ladda ner
            </Button>
            <Button onClick={handleSendAndDownload} disabled={isSending}>
              {isSending ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Skickar...</>
              ) : (
                <><Send className="h-4 w-4 mr-1" /> Skicka & ladda ner</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Credit follow-up dialog */}
      <Dialog open={!!creditedOrder} onOpenChange={(open) => !open && setCreditedOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Skapa ny faktura?</DialogTitle>
          </DialogHeader>
          <p className="text-sm">Vill du skapa en ny faktura för detta ärende?</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setCreditedOrder(null)}>Nej</Button>
            <Button onClick={handleCreateNewInvoiceAfterCredit}>Ja</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual invoice number prompt for legacy orders */}
      <Dialog open={!!creditPromptOrder} onOpenChange={(open) => !open && setCreditPromptOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ange fakturanummer att kreditera</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Denna order saknar sparat fakturanummer. Ange originalfakturans nummer manuellt (t.ex. <code>GVMO-012</code>).
              Kreditfakturan blir då <strong>[ditt nummer]K</strong>.
            </p>
            <Input
              autoFocus
              placeholder="GVMO-012"
              value={manualInvoiceNumber}
              onChange={e => setManualInvoiceNumber(e.target.value.toUpperCase())}
              onKeyDown={e => {
                if (e.key === 'Enter' && manualInvoiceNumber.trim() && creditPromptOrder) {
                  const order = creditPromptOrder;
                  const num = manualInvoiceNumber.trim();
                  setCreditPromptOrder(null);
                  handleCreditInvoice(order, num);
                }
              }}
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setCreditPromptOrder(null)}>Avbryt</Button>
            <Button
              disabled={!manualInvoiceNumber.trim()}
              onClick={() => {
                if (!creditPromptOrder) return;
                const order = creditPromptOrder;
                const num = manualInvoiceNumber.trim();
                setCreditPromptOrder(null);
                handleCreditInvoice(order, num);
              }}
            >
              Kreditera
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
