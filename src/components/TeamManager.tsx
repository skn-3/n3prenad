import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Team } from '@/types/order';
import { defaultTeams } from '@/data/teams';
import { Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

const STORAGE_KEY = 'smartklimat-teams';

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : defaultTeams;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
  }, [teams]);

  return { teams, setTeams };
}

export default function TeamManager() {
  const { teams, setTeams } = useTeams();

  // Hitta dubblerade fakturaprefix (case-insensitive, ignorera tomma)
  const prefixCounts = teams.reduce<Record<string, number>>((acc, t) => {
    const p = (t.invoicePrefix || '').trim().toUpperCase();
    if (!p) return acc;
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {});
  const duplicatePrefixes = Object.entries(prefixCounts)
    .filter(([, n]) => n > 1)
    .map(([p]) => p);

  const updateField = (id: string, field: keyof Team, value: string | boolean | number) => {
    setTeams(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const addTeam = () => {
    const newTeam: Team = {
      id: `team-${Date.now()}`,
      name: '',
      companyName: '',
      orgNr: '',
      address: '',
      email: '',
      bankgiro: '',
      isActive: true,
      invoicePrefix: '',
      nextInvoiceNumber: 1,
    };
    setTeams(prev => [...prev, newTeam]);
    toast.success('Nytt team tillagt');
  };

  const removeTeam = (id: string) => {
    setTeams(prev => prev.filter(t => t.id !== id));
    toast.info('Team borttaget');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5" /> Montageteam
        </h2>
        <Button onClick={addTeam} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Lägg till team
        </Button>
      </div>

      {duplicatePrefixes.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <strong>Dubblerat fakturaprefix:</strong>{' '}
            {duplicatePrefixes.join(', ')}. Varje team måste ha ett unikt prefix,
            annars hamnar fakturanummer på fel team.
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted">
                <th className="text-left p-3">Namn</th>
                <th className="text-left p-3">Företagsnamn</th>
                <th className="text-left p-3">Org.nr</th>
                <th className="text-left p-3">Adress</th>
                <th className="text-left p-3">E-post</th>
                <th className="text-left p-3">Faktura-epost</th>
                <th className="text-left p-3">Bankgiro</th>
                <th className="text-left p-3">Fakturaprefix</th>
                <th className="text-left p-3">Nästa fakturanr</th>
                <th className="text-center p-3 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {teams.map(team => (
                <tr key={team.id} className="border-b">
                  <td className="p-2">
                    <Input className="h-8 text-sm" value={team.name} onChange={e => updateField(team.id, 'name', e.target.value)} />
                  </td>
                  <td className="p-2">
                    <Input className="h-8 text-sm" value={team.companyName} onChange={e => updateField(team.id, 'companyName', e.target.value)} />
                  </td>
                  <td className="p-2">
                    <Input className="h-8 text-sm w-32" value={team.orgNr} onChange={e => updateField(team.id, 'orgNr', e.target.value)} />
                  </td>
                  <td className="p-2">
                    <Input className="h-8 text-sm" value={team.address} onChange={e => updateField(team.id, 'address', e.target.value)} />
                  </td>
                  <td className="p-2">
                    <Input className="h-8 text-sm" value={team.email} onChange={e => updateField(team.id, 'email', e.target.value)} />
                  </td>
                  <td className="p-2">
                    <Input className="h-8 text-sm" placeholder="(samma som e-post)" value={team.invoiceEmail || ''} onChange={e => updateField(team.id, 'invoiceEmail', e.target.value)} />
                  </td>
                  <td className="p-2">
                    <Input className="h-8 text-sm w-28" value={team.bankgiro} onChange={e => updateField(team.id, 'bankgiro', e.target.value)} />
                  </td>
                  <td className="p-2">
                    <Input
                      className={`h-8 text-sm w-24 ${
                        team.invoicePrefix &&
                        duplicatePrefixes.includes(team.invoicePrefix.trim().toUpperCase())
                          ? 'border-destructive focus-visible:ring-destructive'
                          : ''
                      }`}
                      placeholder="GVMO"
                      value={team.invoicePrefix || ''}
                      onChange={e => updateField(team.id, 'invoicePrefix', e.target.value.toUpperCase())}
                    />
                  </td>
                  <td className="p-2">
                    <Input className="h-8 text-sm w-20" type="number" min={1} value={team.nextInvoiceNumber ?? 1} onChange={e => updateField(team.id, 'nextInvoiceNumber', Math.max(1, Number(e.target.value)))} />
                  </td>
                  <td className="p-2 text-center">
                    <Button variant="ghost" size="icon" onClick={() => removeTeam(team.id)} className="h-8 w-8">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
