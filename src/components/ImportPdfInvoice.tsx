import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileUp, Loader2, CheckCircle2, AlertCircle, Trash2, Pencil, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { defaultTeams } from '@/data/teams';
import { toast } from 'sonner';

type LineItem = { name: string; unit_price: number; quantity: number; sum: number };
type ParsedInvoice = {
  invoice_number: string;
  date: string;
  customer_address: string;
  recipient_company: string;
  recipient_org_nr: string;
  total_amount: number;
  moms: number;
  team_prefix: string;
  line_items: LineItem[];
};
type Status = 'pending' | 'parsing' | 'ready' | 'saving' | 'saved' | 'error' | 'duplicate';
type FileItem = {
  id: string;
  file: File;
  status: Status;
  error?: string;
  parsed?: ParsedInvoice;
  editing?: boolean;
  duplicateId?: string;
};

function mapTeamPrefix(prefix: string): string {
  const p = (prefix || '').toUpperCase();
  if (p === 'GVMO') return 'gvmo';
  if (p === 'SAMY') return 'samy';
  if (p === 'JERK') return 'jerk';
  if (p === 'NBD' || p === 'AS' || p === 'ALEX') return 'alex';
  return '';
}

function extractOrderNumber(invoiceNumber: string): number | null {
  const m = invoiceNumber.match(/(\d+)\s*$/);
  return m ? parseInt(m[1], 10) : null;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const StatusBadge = ({ status }: { status: Status }) => {
  const map: Record<Status, { label: string; cls: string; icon?: any }> = {
    pending: { label: 'Väntar', cls: 'bg-muted text-muted-foreground' },
    parsing: { label: 'Bearbetar...', cls: 'bg-blue-500/10 text-blue-700', icon: Loader2 },
    ready: { label: 'Klar för granskning', cls: 'bg-amber-500/10 text-amber-700' },
    saving: { label: 'Sparar...', cls: 'bg-blue-500/10 text-blue-700', icon: Loader2 },
    saved: { label: 'Importerad', cls: 'bg-green-500/10 text-green-700', icon: CheckCircle2 },
    error: { label: 'Fel', cls: 'bg-destructive/10 text-destructive', icon: AlertCircle },
    duplicate: { label: 'Dublett hittad', cls: 'bg-amber-500/10 text-amber-700', icon: AlertCircle },
  };
  const m = map[status];
  const Icon = m.icon;
  return (
    <Badge variant="secondary" className={`${m.cls} gap-1`}>
      {Icon && <Icon className={`h-3 w-3 ${status === 'parsing' || status === 'saving' ? 'animate-spin' : ''}`} />}
      {m.label}
    </Badge>
  );
};

const ImportPdfInvoice = () => {
  const [items, setItems] = useState<FileItem[]>([]);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    const newItems: FileItem[] = arr.map(f => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file: f,
      status: 'pending',
    }));
    setItems(prev => [...prev, ...newItems]);
    for (const it of newItems) {
      void parseFile(it.id, it.file);
    }
  }, []);

  const updateItem = (id: string, patch: Partial<FileItem>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  };

  const parseFile = async (id: string, file: File) => {
    updateItem(id, { status: 'parsing', error: undefined });
    try {
      const base64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke('parse-invoice-pdf', {
        body: { pdf_base64: base64 },
      });
      if (error) throw new Error(error.message || 'Misslyckades att tolka PDF');
      if ((data as any)?.error) throw new Error((data as any).error);
      const parsed = (data as any)?.data as ParsedInvoice;
      if (!parsed) throw new Error('Ingen data returnerades');

      // duplicate check
      const { data: existing } = await supabase
        .from('orders')
        .select('id')
        .eq('invoice_number', parsed.invoice_number)
        .maybeSingle();

      if (existing) {
        updateItem(id, { status: 'duplicate', parsed, duplicateId: existing.id });
      } else {
        updateItem(id, { status: 'ready', parsed });
      }
    } catch (e: any) {
      console.error('parseFile error:', e);
      updateItem(id, { status: 'error', error: e?.message || 'Okänt fel' });
    }
  };

  const saveItem = async (id: string, force = false) => {
    const it = items.find(i => i.id === id);
    if (!it?.parsed) return false;
    updateItem(id, { status: 'saving', error: undefined });
    try {
      const p = it.parsed;
      if (!force) {
        const { data: existing } = await supabase
          .from('orders')
          .select('id')
          .eq('invoice_number', p.invoice_number)
          .maybeSingle();
        if (existing) {
          updateItem(id, { status: 'duplicate', duplicateId: existing.id });
          return false;
        }
      }

      const teamId = mapTeamPrefix(p.team_prefix);
      const team = defaultTeams.find(t => t.id === teamId);
      if (!team) throw new Error(`Okänt team-prefix: ${p.team_prefix}`);

      const orderNumber = extractOrderNumber(p.invoice_number);

      const { error } = await supabase.from('orders').insert({
        order_number: orderNumber,
        date: p.date,
        customer_address: p.customer_address,
        customer_name: p.recipient_company,
        team_id: team.id,
        team_company: team.companyName,
        team_org_nr: team.orgNr,
        team_bankgiro: team.bankgiro,
        team_email: team.email,
        line_items: p.line_items as any,
        total_amount: Math.round(p.total_amount),
        status: 'invoiced',
        invoice_number: p.invoice_number,
        invoice_sent_at: new Date().toISOString(),
        description: '',
        facade_type: 'tra',
      });
      if (error) throw error;
      updateItem(id, { status: 'saved' });
      toast.success(`Faktura ${p.invoice_number} importerad!`);
      return true;
    } catch (e: any) {
      console.error('saveItem error:', e);
      updateItem(id, { status: 'error', error: e?.message || 'Kunde inte spara' });
      toast.error(`Kunde inte spara: ${e?.message || 'fel'}`);
      return false;
    }
  };

  const importAll = async () => {
    const toImport = items.filter(i => i.status === 'ready');
    if (toImport.length === 0) {
      toast.info('Inga filer redo att importera');
      return;
    }
    setBatchProgress({ current: 0, total: toImport.length });
    let done = 0;
    for (const it of toImport) {
      await saveItem(it.id);
      done++;
      setBatchProgress({ current: done, total: toImport.length });
    }
    setBatchProgress(null);
    toast.success(`${done} av ${toImport.length} importerade`);
  };

  const updateParsedField = (id: string, field: keyof ParsedInvoice, value: any) => {
    setItems(prev => prev.map(i => {
      if (i.id !== id || !i.parsed) return i;
      return { ...i, parsed: { ...i.parsed, [field]: value } };
    }));
  };

  const updateLine = (id: string, idx: number, field: keyof LineItem, value: any) => {
    setItems(prev => prev.map(i => {
      if (i.id !== id || !i.parsed) return i;
      const lines = [...i.parsed.line_items];
      const v = field === 'name' ? value : Number(value) || 0;
      lines[idx] = { ...lines[idx], [field]: v };
      if (field === 'unit_price' || field === 'quantity') {
        lines[idx].sum = Math.round(lines[idx].unit_price * lines[idx].quantity);
      }
      return { ...i, parsed: { ...i.parsed, line_items: lines } };
    }));
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5 text-primary" />
            Importera befintliga fakturor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Ladda upp en eller flera faktura-PDF:er. AI:n extraherar alla rader och skapar ordrar automatiskt.
          </p>

          <div
            onDragOver={e => e.preventDefault()}
            onDrop={onDrop}
            className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors"
          >
            <FileUp className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm mb-3">Dra och släpp PDF-filer här, eller välj filer</p>
            <Input
              type="file"
              accept=".pdf,application/pdf"
              multiple
              onChange={e => e.target.files && addFiles(e.target.files)}
              className="max-w-xs mx-auto"
            />
          </div>

          {items.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {items.length} fil(er) {batchProgress && `· ${batchProgress.current} av ${batchProgress.total} importerade...`}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setItems([])} disabled={!!batchProgress}>
                  Rensa lista
                </Button>
                <Button onClick={importAll} disabled={!!batchProgress || items.every(i => i.status !== 'ready')}>
                  Importera alla
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {items.map(it => (
        <Card key={it.id}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3 min-w-0">
              <FileUp className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium truncate">{it.file.name}</span>
              <StatusBadge status={it.status} />
            </div>
            <div className="flex gap-2">
              {it.parsed && (it.status === 'ready' || it.status === 'duplicate') && (
                <Button variant="ghost" size="sm" onClick={() => updateItem(it.id, { editing: !it.editing })}>
                  {it.editing ? <Save className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => removeItem(it.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {it.status === 'error' && (
              <div className="text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> {it.error}
                <Button size="sm" variant="outline" className="ml-auto" onClick={() => parseFile(it.id, it.file)}>
                  Försök igen
                </Button>
              </div>
            )}

            {it.status === 'parsing' && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Skickar till AI för tolkning...
              </div>
            )}

            {it.parsed && (
              <div className="space-y-4">
                {it.status === 'duplicate' && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded text-sm flex items-center justify-between">
                    <span>⚠ Faktura {it.parsed.invoice_number} finns redan i systemet</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => removeItem(it.id)}>Hoppa över</Button>
                      <Button size="sm" onClick={() => saveItem(it.id, true)}>Importera ändå</Button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground text-xs">Fakturanummer</div>
                    {it.editing ? (
                      <Input value={it.parsed.invoice_number} onChange={e => updateParsedField(it.id, 'invoice_number', e.target.value)} />
                    ) : (
                      <Badge className="bg-green-500/10 text-green-700 border-green-500/30">{it.parsed.invoice_number}</Badge>
                    )}
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Datum</div>
                    {it.editing ? (
                      <Input type="date" value={it.parsed.date} onChange={e => updateParsedField(it.id, 'date', e.target.value)} />
                    ) : <div>{it.parsed.date}</div>}
                  </div>
                  <div className="col-span-2">
                    <div className="text-muted-foreground text-xs">Adress</div>
                    {it.editing ? (
                      <Input value={it.parsed.customer_address} onChange={e => updateParsedField(it.id, 'customer_address', e.target.value)} />
                    ) : <div className="font-bold">{it.parsed.customer_address}</div>}
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Montör/team</div>
                    {it.editing ? (
                      <Input value={it.parsed.team_prefix} onChange={e => updateParsedField(it.id, 'team_prefix', e.target.value)} />
                    ) : (
                      <div>
                        {it.parsed.team_prefix} → {defaultTeams.find(t => t.id === mapTeamPrefix(it.parsed!.team_prefix))?.name || <span className="text-destructive">okänt</span>}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Mottagare</div>
                    {it.editing ? (
                      <>
                        <Input className="mb-1" value={it.parsed.recipient_company} onChange={e => updateParsedField(it.id, 'recipient_company', e.target.value)} />
                        <Input value={it.parsed.recipient_org_nr} onChange={e => updateParsedField(it.id, 'recipient_org_nr', e.target.value)} />
                      </>
                    ) : (
                      <div>{it.parsed.recipient_company} <span className="text-muted-foreground">({it.parsed.recipient_org_nr})</span></div>
                    )}
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Benämning</TableHead>
                      <TableHead className="text-right w-24">À-pris</TableHead>
                      <TableHead className="text-right w-20">Antal</TableHead>
                      <TableHead className="text-right w-24">Summa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {it.parsed.line_items.map((l, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          {it.editing ? <Input value={l.name} onChange={e => updateLine(it.id, idx, 'name', e.target.value)} /> : l.name}
                        </TableCell>
                        <TableCell className="text-right">
                          {it.editing ? <Input type="number" value={l.unit_price} onChange={e => updateLine(it.id, idx, 'unit_price', e.target.value)} /> : l.unit_price.toLocaleString('sv-SE')}
                        </TableCell>
                        <TableCell className="text-right">
                          {it.editing ? <Input type="number" value={l.quantity} onChange={e => updateLine(it.id, idx, 'quantity', e.target.value)} /> : l.quantity}
                        </TableCell>
                        <TableCell className="text-right">{l.sum.toLocaleString('sv-SE')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="font-bold">
                    Totalt: {it.parsed.total_amount.toLocaleString('sv-SE')} kr
                  </div>
                  {it.status === 'ready' && (
                    <Button onClick={() => saveItem(it.id)}>
                      Spara som order
                    </Button>
                  )}
                  {it.status === 'saved' && (
                    <Badge className="bg-green-500/10 text-green-700">✓ Sparad i databasen</Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ImportPdfInvoice;