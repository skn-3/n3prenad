import { useState, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { OrderLine, FacadeType } from '@/types/order';
import { defaultTeams } from '@/data/teams';
import { generateAutoLines } from '@/utils/autoLines';
import { generateOrderPDF } from '@/utils/pdfGenerator';
import { peekOrderNumber, getNextOrderNumber } from '@/hooks/useOrderCounter';
import { useProducts } from '@/hooks/useProducts';
import { Plus, Trash2, Download, Send, Upload, X, ImageIcon, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const facadeLabels: Record<FacadeType, string> = {
  tra: 'Trä',
  sten: 'Sten/Betong',
  puts: 'Puts',
};

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
}

export default function OrderForm() {
  const { products } = useProducts();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [orderNumber, setOrderNumber] = useState(peekOrderNumber());
  const [customerAddress, setCustomerAddress] = useState('');
  const [facadeType, setFacadeType] = useState<FacadeType>('tra');
  const [windowCount, setWindowCount] = useState(0);
  const [doorCount, setDoorCount] = useState(0);
  const [teamId, setTeamId] = useState('');
  const [kmDistance, setKmDistance] = useState(0);
  const [description, setDescription] = useState('');
  const [manualLines, setManualLines] = useState<OrderLine[]>([]);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Accessories
  const accessories = useMemo(() => products.filter(p =>
    p.category === 'Tillbehör' && p.isActive
  ), [products]);

  const extras = useMemo(() => products.filter(p =>
    p.category === 'Tillägg' && p.isActive
  ), [products]);

  const [accessoryQuantities, setAccessoryQuantities] = useState<Record<string, number>>({});

  const autoLines = useMemo(() =>
    generateAutoLines({ windowCount, doorCount, facadeType, kmDistance }),
    [windowCount, doorCount, facadeType, kmDistance]
  );

  const accessoryLines: OrderLine[] = useMemo(() => {
    return Object.entries(accessoryQuantities)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const product = [...accessories, ...extras].find(p => p.id === id);
        if (!product) return null;
        return {
          id: `acc-${id}`,
          name: product.name,
          unitPrice: product.price,
          quantity: qty,
          sum: Math.round(product.price * qty),
        };
      })
      .filter(Boolean) as OrderLine[];
  }, [accessoryQuantities, accessories, extras]);

  const allLines = [...autoLines, ...accessoryLines, ...manualLines];
  const totalSum = allLines.reduce((s, l) => s + l.sum, 0);
  const totalUnits = windowCount + doorCount;
  const selectedTeam = defaultTeams.find(t => t.id === teamId);

  const setAllUnits = (productId: string) => {
    setAccessoryQuantities(prev => ({ ...prev, [productId]: totalUnits }));
  };

  const addManualLine = () => {
    setManualLines(prev => [...prev, {
      id: `manual-${Date.now()}`,
      name: '',
      unitPrice: 0,
      quantity: 1,
      sum: 0,
    }]);
  };

  const updateManualLine = (id: string, field: string, value: string | number) => {
    setManualLines(prev => prev.map(line => {
      if (line.id !== id) return line;
      const updated = { ...line, [field]: value };
      if (field === 'unitPrice' || field === 'quantity') {
        updated.sum = Math.round(updated.unitPrice * updated.quantity);
      }
      return updated;
    }));
  };

  const removeManualLine = (id: string) => {
    setManualLines(prev => prev.filter(l => l.id !== id));
  };

  // Image handling
  const addImages = useCallback((files: FileList | File[]) => {
    const newImages: UploadedImage[] = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .map(file => ({
        id: `img-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        preview: URL.createObjectURL(file),
      }));
    setImages(prev => [...prev, ...newImages]);
  }, []);

  const removeImage = (id: string) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter(i => i.id !== id);
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) addImages(e.dataTransfer.files);
  }, [addImages]);

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const downloadPDF = () => {
    if (!customerAddress) { toast.error('Ange kundadress'); return; }
    if (!teamId) { toast.error('Välj montör'); return; }

    const usedOrderNumber = orderNumber;
    if (usedOrderNumber === peekOrderNumber()) {
      getNextOrderNumber();
    }
    const team = defaultTeams.find(t => t.id === teamId)!;

    const pdf = generateOrderPDF({
      date,
      orderNumber: usedOrderNumber,
      customerAddress,
      lines: allLines,
      description,
      team,
    });

    pdf.save(`A-ORDER-${usedOrderNumber}-${customerAddress.replace(/\s+/g, '_')}.pdf`);
    toast.success(`PDF genererad — Order #${usedOrderNumber}`);
    setPdfDownloaded(true);
  };

  const handleSendToMontör = () => {
    if (!customerAddress) { toast.error('Ange kundadress'); return; }
    if (!teamId) { toast.error('Välj montör'); return; }
    setShowSendDialog(true);
  };

  const resetForm = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setOrderNumber(peekOrderNumber());
    setCustomerAddress('');
    setFacadeType('tra');
    setWindowCount(0);
    setDoorCount(0);
    setTeamId('');
    setKmDistance(0);
    setDescription('');
    setManualLines([]);
    setAccessoryQuantities({});
    images.forEach(img => URL.revokeObjectURL(img.preview));
    setImages([]);
    setPdfDownloaded(false);
    toast.info('Formuläret nollställt');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* Steg 1: Grundinfo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">1. Grundinfo</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Datum</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Ordernummer</Label>
            <Input
              type="number"
              min={1}
              value={orderNumber}
              onChange={e => setOrderNumber(Number(e.target.value))}
            />
          </div>
          <div className="md:col-span-1">
            <Label>Kundadress (gata + ort)</Label>
            <Input
              placeholder="Åkerbärsvägen 26 Nykvarn"
              value={customerAddress}
              onChange={e => setCustomerAddress(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Steg 2: Projekttyp */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">2. Projekttyp</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Antal fönster</Label>
              <Input type="number" min={0} value={windowCount || ''} onChange={e => setWindowCount(Number(e.target.value))} />
            </div>
            <div>
              <Label>Antal dörrar</Label>
              <Input type="number" min={0} value={doorCount || ''} onChange={e => setDoorCount(Number(e.target.value))} />
            </div>
          </div>
          <div>
            <Label>Fasadtyp</Label>
            <div className="flex gap-4 mt-2">
              {(Object.entries(facadeLabels) as [FacadeType, string][]).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="facade"
                    checked={facadeType === key}
                    onChange={() => setFacadeType(key)}
                    className="accent-primary"
                  />
                  <span className={facadeType === key ? 'font-semibold text-primary' : ''}>{label}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Steg 3: Montör + km */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">3. Välj montör</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Montör</Label>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger>
                <SelectValue placeholder="Välj montör..." />
              </SelectTrigger>
              <SelectContent>
                {defaultTeams.filter(t => t.isActive).map(team => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name} — {team.companyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Avstånd enkel väg (km)</Label>
            <Input type="number" min={0} value={kmDistance || ''} onChange={e => setKmDistance(Number(e.target.value))} />
            {kmDistance > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Bilersättning: {(6.63 * kmDistance * 2).toFixed(0)} kr | Restid: {(11.73 * kmDistance * 2).toFixed(0)} kr
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Steg 4: Automatiska rader */}
      {autoLines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">4. Automatiska rader</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-primary text-primary-foreground">
                    <th className="text-left p-2 rounded-tl-md">Benämning</th>
                    <th className="text-right p-2">Å-pris</th>
                    <th className="text-right p-2">Antal</th>
                    <th className="text-right p-2 rounded-tr-md">Summa</th>
                  </tr>
                </thead>
                <tbody>
                  {autoLines.map((line, i) => (
                    <tr key={line.id} className={i % 2 === 0 ? 'bg-muted/50' : ''}>
                      <td className="p-2">{line.name}</td>
                      <td className="text-right p-2">{line.unitPrice.toLocaleString('sv-SE')}</td>
                      <td className="text-right p-2">{line.quantity}</td>
                      <td className="text-right p-2 font-medium">{line.sum.toLocaleString('sv-SE')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Steg 5: Tillbehör */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">5. Tillbehör</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {accessories.map(item => (
              <div key={item.id} className="flex items-center gap-2">
                <div className="flex-1 text-sm">{item.name} <span className="text-muted-foreground">({item.price} kr)</span></div>
                <Input
                  type="number"
                  min={0}
                  className="w-20"
                  value={accessoryQuantities[item.id] || 0}
                  onChange={e => setAccessoryQuantities(prev => ({ ...prev, [item.id]: Number(e.target.value) }))}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAllUnits(item.id)}
                  disabled={totalUnits === 0}
                  className="text-xs whitespace-nowrap"
                >
                  Alla ({totalUnits})
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Steg 6: Tillval */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">6. Övriga tillval</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {extras.map(item => (
              <div key={item.id} className="flex items-center gap-2">
                <div className="flex-1 text-sm">{item.name} <span className="text-muted-foreground">({item.price} kr)</span></div>
                <Input
                  type="number"
                  min={0}
                  className="w-20"
                  value={accessoryQuantities[item.id] || 0}
                  onChange={e => setAccessoryQuantities(prev => ({ ...prev, [item.id]: Number(e.target.value) }))}
                />
              </div>
            ))}
          </div>
          {/* Manuella rader */}
          <div className="border-t pt-4 space-y-2">
            <p className="text-sm font-medium">Fria rader</p>
            {manualLines.map(line => (
              <div key={line.id} className="flex items-center gap-2">
                <Input
                  placeholder="Benämning"
                  className="flex-1"
                  value={line.name}
                  onChange={e => updateManualLine(line.id, 'name', e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Pris"
                  className="w-24"
                  value={line.unitPrice || ''}
                  onChange={e => updateManualLine(line.id, 'unitPrice', Number(e.target.value))}
                />
                <Input
                  type="number"
                  placeholder="Antal"
                  className="w-20"
                  value={line.quantity}
                  onChange={e => updateManualLine(line.id, 'quantity', Number(e.target.value))}
                />
                <span className="w-20 text-right text-sm font-medium">{line.sum} kr</span>
                <Button variant="ghost" size="icon" onClick={() => removeManualLine(line.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addManualLine}>
              <Plus className="h-4 w-4 mr-1" /> Lägg till rad
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Steg 7: Beskrivning */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">7. Beskrivning</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Monteringsinstruktioner, övrigt..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Steg 8: Bilder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ImageIcon className="h-5 w-5" /> 8. Bilder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Bilder bifogas i e-post till montör (inkluderas inte i PDF).
          </p>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Dra & släpp bilder här eller klicka för att välja</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => e.target.files && addImages(e.target.files)}
          />
          {images.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mt-4">
              {images.map(img => (
                <div key={img.id} className="relative group">
                  <img
                    src={img.preview}
                    alt={img.file.name}
                    className="w-full h-24 object-cover rounded-md border"
                  />
                  <button
                    onClick={() => removeImage(img.id)}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <p className="text-[10px] text-muted-foreground truncate mt-1">{img.file.name}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg p-4 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{allLines.length} rader</p>
            <p className="text-2xl font-bold text-primary">{totalSum.toLocaleString('sv-SE')} kr</p>
          </div>
          <div className="flex items-center gap-2">
            {pdfDownloaded && (
              <Button variant="outline" size="lg" onClick={resetForm} className="gap-2">
                <RefreshCw className="h-4 w-4" /> Ny order
              </Button>
            )}
            <Button size="lg" onClick={downloadPDF} className="gap-2">
              <Download className="h-5 w-5" /> Ladda ner PDF
            </Button>
            <Button
              size="lg"
              onClick={handleSendToMontör}
              className="gap-2"
              style={{ backgroundColor: '#F97316' }}
            >
              <Send className="h-5 w-5" /> Skicka till montör
            </Button>
          </div>
        </div>
      </div>

      {/* Send dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Skicka till montör</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            E-postfunktion kommer snart. Montör: <strong>{selectedTeam?.name ?? '—'}</strong>.
            Ladda ner PDF istället?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>Avbryt</Button>
            <Button onClick={() => { setShowSendDialog(false); downloadPDF(); }}>
              <Download className="h-4 w-4 mr-1" /> Ladda ner PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
