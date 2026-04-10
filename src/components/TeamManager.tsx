import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Team } from '@/types/order';
import { defaultTeams } from '@/data/teams';
import { Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

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

  const updateField = (id: string, field: keyof Team, value: string | boolean) => {
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
                <th className="text-left p-3">Bankgiro</th>
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
                    <Input className="h-8 text-sm w-28" value={team.bankgiro} onChange={e => updateField(team.id, 'bankgiro', e.target.value)} />
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
