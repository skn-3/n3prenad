import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck, ShieldAlert } from 'lucide-react';
import { listOrders } from '@/utils/ordersGateway';

export default function OrdersGatewayTest() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runTest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const rows = await listOrders({ limit: 1 });
      setResult(JSON.stringify(rows, null, 2));
    } catch (err) {
      setError((err as Error).message || 'Okänt fel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {error ? (
            <ShieldAlert className="h-5 w-5 text-destructive" />
          ) : (
            <ShieldCheck className="h-5 w-5 text-primary" />
          )}
          orders-gateway — testverktyg
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Anropar edge function <code>orders-gateway</code> med{' '}
          <code>listOrders(&#123; limit: 1 &#125;)</code>. Verifierar att shared-secret
          och service-role-anrop funkar innan vi migrerar något befintligt anrop.
        </p>
        <Button onClick={runTest} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Kör testanrop
        </Button>
        {error && (
          <div className="rounded border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            <strong>Fel:</strong> {error}
          </div>
        )}
        {result && (
          <pre className="rounded bg-muted p-3 text-xs overflow-auto max-h-96">
            {result}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}