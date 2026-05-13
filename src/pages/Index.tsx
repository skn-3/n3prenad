import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import OrderForm from '@/components/OrderForm';
import ProductCatalog from '@/components/ProductCatalog';
import TeamManager from '@/components/TeamManager';
import OrderHistory from '@/components/OrderHistory';
import CaseQueue from '@/components/CaseQueue';
import ImportPdfInvoice from '@/components/ImportPdfInvoice';
import { FileText, Package, Users, History, ClipboardList, FileUp } from 'lucide-react';

interface Prefill {
  address?: string;
  name?: string;
  phone?: string;
  teamId?: string;
  caseId?: string;
  nonce?: number;
}

const Index = () => {
  const [tab, setTab] = useState<string>('order');
  const [prefill, setPrefill] = useState<Prefill>({});

  const handleCreateOrderFromCase = (c: any) => {
    const teamRaw: string = (c.team || '').trim();
    const teamId = teamRaw ? teamRaw.split(' ')[0].toLowerCase() : '';
    setPrefill({
      address: c.address || '',
      name: c.customer_name || '',
      phone: c.customer_phone || '',
      teamId,
      caseId: c.id,
      nonce: Date.now(),
    });
    setTab('order');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">S</span>
          </div>
          <div>
            <h1 className="text-lg font-bold">SmartKlimat</h1>
            <p className="text-xs text-muted-foreground">Montage & Ordersystem</p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="order" className="gap-2">
              <FileText className="h-4 w-4" />
              Ny order
            </TabsTrigger>
            <TabsTrigger value="cases" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Ärenden
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-4 w-4" />
              Produktkatalog
            </TabsTrigger>
            <TabsTrigger value="teams" className="gap-2">
              <Users className="h-4 w-4" />
              Montageteam
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              Orderhistorik
            </TabsTrigger>
            <TabsTrigger value="import" className="gap-2">
              <FileUp className="h-4 w-4" />
              Importera PDF
            </TabsTrigger>
          </TabsList>

          <TabsContent value="order">
            <OrderForm
              prefillAddress={prefill.address}
              prefillName={prefill.name}
              prefillPhone={prefill.phone}
              prefillTeamId={prefill.teamId}
              prefillCaseId={prefill.caseId}
              prefillNonce={prefill.nonce}
            />
          </TabsContent>
          <TabsContent value="cases">
            <CaseQueue
              onCreateOrder={handleCreateOrderFromCase}
              onGoToInvoicing={() => setTab('history')}
            />
          </TabsContent>
          <TabsContent value="products">
            <ProductCatalog />
          </TabsContent>
          <TabsContent value="teams">
            <TeamManager />
          </TabsContent>
          <TabsContent value="history">
            <OrderHistory />
          </TabsContent>
          <TabsContent value="import">
            <ImportPdfInvoice />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
