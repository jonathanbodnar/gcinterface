import { useState } from 'react';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Package, Wrench, Zap, Droplet, Building, Trash2, Plus, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface Material {
  id: string;
  description: string;
  quantity: number;
  uom: string;
  trade: string;
  confidence?: number;
  category?: string;
  unitCost?: number;
  wasteFactor?: number;
}

interface MaterialsPanelProps {
  materials: Material[];
  currentPage?: number;
  projectId?: string;
  onMaterialHover?: (materialId: string | null) => void;
  onMaterialClick?: (materialId: string) => void;
  selectedMaterialId?: string | null;
  onBomChange?: () => void;
}

const tradeIcons: Record<string, any> = {
  M: Wrench,
  P: Droplet,
  E: Zap,
  A: Building,
};

const tradeLabels: Record<string, string> = {
  M: 'Mechanical',
  P: 'Plumbing',
  E: 'Electrical',
  A: 'Architectural',
};

const UOM_OPTIONS = ['SF', 'LF', 'EA', 'SY', 'CY', 'CF', 'GAL', 'LB', 'TON', 'HR', 'LS', 'SET', 'PC', 'BOX', 'BAG', 'ROLL'];
const CATEGORY_OPTIONS = ['General', 'Flooring', 'Plumbing', 'HVAC', 'Electrical', 'Drywall', 'Painting', 'Doors', 'Windows', 'Insulation', 'Fixtures', 'Roofing', 'Concrete', 'Structural'];

export default function MaterialsPanel({
  materials,
  currentPage,
  projectId,
  onMaterialHover,
  onMaterialClick,
  selectedMaterialId,
  onBomChange,
}: MaterialsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrade, setSelectedTrade] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [collapsedTrades, setCollapsedTrades] = useState<Set<string>>(new Set());
  const [newItem, setNewItem] = useState({
    description: '',
    category: 'General',
    quantity: '',
    uom: 'EA',
    unitCost: '',
    wasteFactor: '',
  });

  const materialsByTrade = materials.reduce((groups, material) => {
    const trade = material.trade || 'A';
    if (!groups[trade]) groups[trade] = [];
    groups[trade].push(material);
    return groups;
  }, {} as Record<string, Material[]>);

  const filteredGroups = Object.entries(materialsByTrade).reduce((result, [trade, items]) => {
    if (selectedTrade && trade !== selectedTrade) return result;
    const filtered = items.filter(item =>
      !searchQuery || item.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filtered.length > 0) result[trade] = filtered;
    return result;
  }, {} as Record<string, Material[]>);

  const totalMaterials = Object.values(filteredGroups).reduce((sum, items) => sum + items.length, 0);
  const trades = Object.keys(materialsByTrade);

  const toggleTrade = (trade: string) => {
    setCollapsedTrades(prev => {
      const next = new Set(prev);
      if (next.has(trade)) next.delete(trade);
      else next.add(trade);
      return next;
    });
  };

  const handleAdd = async () => {
    if (!projectId || !newItem.description.trim() || !newItem.quantity) return;
    setAdding(true);
    try {
      await axios.post(`${API_URL}/bom`, {
        projectId,
        description: newItem.description.trim(),
        category: newItem.category,
        quantity: parseFloat(newItem.quantity),
        uom: newItem.uom,
        unitCost: newItem.unitCost ? parseFloat(newItem.unitCost) : 0,
        wasteFactor: newItem.wasteFactor ? parseFloat(newItem.wasteFactor) / 100 : 0,
      });
      setNewItem({ description: '', category: 'General', quantity: '', uom: 'EA', unitCost: '', wasteFactor: '' });
      setShowAddForm(false);
      onBomChange?.();
    } catch (err) {
      console.error('Failed to add material:', err);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!window.confirm('Remove this material from the BOM?')) return;
    setDeleting(itemId);
    try {
      await axios.delete(`${API_URL}/bom/${itemId}`);
      onBomChange?.();
    } catch (err) {
      console.error('Failed to delete material:', err);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="flex flex-col h-full border-l bg-background">
      <CardHeader className="border-b py-3 px-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">
              {currentPage ? `Materials — Page ${currentPage}` : 'Project Materials'}
            </CardTitle>
            <CardDescription>{totalMaterials} items</CardDescription>
          </div>
          <Package className="w-5 h-5 text-muted-foreground" />
        </div>
      </CardHeader>

      <div className="p-3 space-y-2 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search materials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          <Button variant={selectedTrade === '' ? 'default' : 'outline'} size="sm" className="h-7 text-xs" onClick={() => setSelectedTrade('')}>
            All
          </Button>
          {trades.map(trade => {
            const Icon = tradeIcons[trade] || Package;
            return (
              <Button
                key={trade}
                variant={selectedTrade === trade ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setSelectedTrade(trade)}
              >
                <Icon className="w-3 h-3" />
                {trade}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {Object.entries(filteredGroups).map(([trade, items]) => {
          const Icon = tradeIcons[trade] || Package;
          const collapsed = collapsedTrades.has(trade);
          return (
            <div key={trade} className="space-y-1">
              <button
                onClick={() => toggleTrade(trade)}
                className="flex items-center gap-2 text-sm font-semibold w-full hover:bg-muted/50 rounded px-1 py-0.5"
              >
                {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                <Icon className="w-4 h-4" />
                <span>{tradeLabels[trade] || trade}</span>
                <Badge variant="outline" className="ml-auto text-xs">{items.length}</Badge>
              </button>

              {!collapsed && (
                <div className="space-y-1 ml-1">
                  {items.map((material) => (
                    <div
                      key={material.id}
                      className={cn(
                        'group flex items-start gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors hover:bg-muted/50',
                        selectedMaterialId === material.id && 'bg-primary/10 ring-1 ring-primary/30'
                      )}
                      onMouseEnter={() => onMaterialHover?.(material.id)}
                      onMouseLeave={() => onMaterialHover?.(null)}
                      onClick={() => onMaterialClick?.(material.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs leading-tight truncate">{material.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {material.quantity.toFixed(1)} {material.uom}
                          {material.unitCost ? ` · $${material.unitCost.toFixed(2)}/${material.uom}` : ''}
                        </p>
                      </div>
                      {projectId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive flex-shrink-0"
                          onClick={(e) => { e.stopPropagation(); handleDelete(material.id); }}
                          disabled={deleting === material.id}
                        >
                          {deleting === material.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {totalMaterials === 0 && !showAddForm && (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-xs">{searchQuery ? 'No materials match your search' : 'No materials yet'}</p>
          </div>
        )}
      </div>

      {/* Add Material */}
      {projectId && (
        <div className="border-t p-3">
          {showAddForm ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold">Add Material</p>
              <Input
                placeholder="Description *"
                value={newItem.description}
                onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))}
                className="h-8 text-sm"
                autoFocus
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newItem.category}
                  onChange={e => setNewItem(p => ({ ...p, category: e.target.value }))}
                  className="h-8 text-sm rounded-md border border-input bg-background px-2"
                >
                  {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                  value={newItem.uom}
                  onChange={e => setNewItem(p => ({ ...p, uom: e.target.value }))}
                  className="h-8 text-sm rounded-md border border-input bg-background px-2"
                >
                  {UOM_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="number"
                  placeholder="Qty *"
                  value={newItem.quantity}
                  onChange={e => setNewItem(p => ({ ...p, quantity: e.target.value }))}
                  className="h-8 text-sm"
                />
                <Input
                  type="number"
                  placeholder="Unit $"
                  value={newItem.unitCost}
                  onChange={e => setNewItem(p => ({ ...p, unitCost: e.target.value }))}
                  className="h-8 text-sm"
                />
                <Input
                  type="number"
                  placeholder="Waste %"
                  value={newItem.wasteFactor}
                  onChange={e => setNewItem(p => ({ ...p, wasteFactor: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 h-8" onClick={handleAdd} disabled={adding || !newItem.description.trim() || !newItem.quantity}>
                  {adding ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                  Add
                </Button>
                <Button size="sm" variant="outline" className="h-8" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="w-full h-8" onClick={() => setShowAddForm(true)}>
              <Plus className="w-3 h-3 mr-1" /> Add Material
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
