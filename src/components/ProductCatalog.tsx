import { useState } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const categories = [
  'Alla', 'Etablering', 'Rivning', 'Montering Fönster', 'Montering Dörr',
  'Bleck & Material', 'Tillbehör', 'Tillägg', 'Övrigt',
];

export default function ProductCatalog() {
  const { products, updateProduct, addProduct, toggleActive, resetToDefaults } = useProducts();
  const [filter, setFilter] = useState('Alla');
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState('Tillägg');

  const filtered = filter === 'Alla' ? products : products.filter(p => p.category === filter);

  const handleAdd = () => {
    if (!newName || !newPrice) return;
    addProduct({
      id: `custom-${Date.now()}`,
      name: newName,
      price: parseFloat(newPrice),
      category: newCategory,
      isActive: true,
    });
    setNewName('');
    setNewPrice('');
    toast.success('Produkt tillagd');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Produktkatalog</h2>
        <Button variant="outline" size="sm" onClick={() => { resetToDefaults(); toast.info('Återställd till standard'); }}>
          <RotateCcw className="h-4 w-4 mr-1" /> Återställ
        </Button>
      </div>

      {/* Category filter dropdown */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Kategori:</span>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat} {cat !== 'Alla' ? `(${products.filter(p => p.category === cat).length})` : `(${products.length})`}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Product list */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted">
                <th className="text-left p-3">Benämning</th>
                <th className="text-left p-3">Kategori</th>
                <th className="text-right p-3">Pris (kr)</th>
                <th className="text-center p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product, i) => (
                <tr key={product.id} className={`border-b ${!product.isActive ? 'opacity-50' : ''} ${i % 2 === 0 ? 'bg-muted/30' : ''}`}>
                  <td className="p-3">{product.name}</td>
                  <td className="p-3 text-muted-foreground text-xs">{product.category}</td>
                  <td className="p-3">
                    <Input
                      type="number"
                      step="0.01"
                      className="w-28 ml-auto text-right h-8"
                      value={product.price}
                      onChange={e => updateProduct(product.id, { price: parseFloat(e.target.value) || 0 })}
                    />
                  </td>
                  <td className="p-3 text-center">
                    <Button
                      variant={product.isActive ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleActive(product.id)}
                      className="text-xs h-7"
                    >
                      {product.isActive ? 'Aktiv' : 'Inaktiv'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Add new */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lägg till ny produkt</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 items-end flex-wrap">
            <div className="flex-1 min-w-[180px]">
              <Input placeholder="Benämning" value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
            <div className="w-28">
              <Input type="number" placeholder="Pris" value={newPrice} onChange={e => setNewPrice(e.target.value)} />
            </div>
            <Select value={newCategory} onValueChange={setNewCategory}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.filter(c => c !== 'Alla').map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-1" /> Lägg till
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
