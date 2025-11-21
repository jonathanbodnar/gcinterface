import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Package, Wrench, Zap, Droplet, Building } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Material {
  id: string;
  description: string;
  quantity: number;
  uom: string;
  trade: string;
  confidence?: number;
  category?: string;
}

interface MaterialsPanelProps {
  materials: Material[];
  currentPage: number;
  onMaterialHover?: (materialId: string | null) => void;
  onMaterialClick?: (materialId: string) => void;
  selectedMaterialId?: string | null;
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

const tradeColors: Record<string, string> = {
  M: 'bg-red-100 text-red-800 border-red-300',
  P: 'bg-blue-100 text-blue-800 border-blue-300',
  E: 'bg-green-100 text-green-800 border-green-300',
  A: 'bg-yellow-100 text-yellow-800 border-yellow-300',
};

export default function MaterialsPanel({
  materials,
  currentPage,
  onMaterialHover,
  onMaterialClick,
  selectedMaterialId,
}: MaterialsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrade, setSelectedTrade] = useState<string>('');

  // Group materials by trade
  const materialsByTrade = materials.reduce((groups, material) => {
    const trade = material.trade || 'A';
    if (!groups[trade]) groups[trade] = [];
    groups[trade].push(material);
    return groups;
  }, {} as Record<string, Material[]>);

  // Filter materials
  const filteredGroups = Object.entries(materialsByTrade).reduce((result, [trade, items]) => {
    if (selectedTrade && trade !== selectedTrade) return result;
    
    const filtered = items.filter(item =>
      !searchQuery || 
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    if (filtered.length > 0) {
      result[trade] = filtered;
    }
    return result;
  }, {} as Record<string, Material[]>);

  const totalMaterials = Object.values(filteredGroups).reduce((sum, items) => sum + items.length, 0);
  const trades = Object.keys(materialsByTrade);

  return (
    <div className="flex flex-col h-full border-l bg-background">
      {/* Header */}
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Materials on Page {currentPage}</CardTitle>
            <CardDescription>{totalMaterials} items</CardDescription>
          </div>
          <Package className="w-5 h-5 text-muted-foreground" />
        </div>
      </CardHeader>

      {/* Filters */}
      <div className="p-4 space-y-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search materials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex gap-1 flex-wrap">
          <Button
            variant={selectedTrade === '' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTrade('')}
          >
            All
          </Button>
          {trades.map(trade => {
            const Icon = tradeIcons[trade] || Package;
            return (
              <Button
                key={trade}
                variant={selectedTrade === trade ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTrade(trade)}
                className="gap-1"
              >
                <Icon className="w-3 h-3" />
                {trade}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Materials List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.entries(filteredGroups).map(([trade, items]) => {
          const Icon = tradeIcons[trade] || Package;
          return (
            <div key={trade} className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Icon className="w-4 h-4" />
                <span>{tradeLabels[trade] || trade}</span>
                <Badge variant="outline" className="ml-auto">{items.length}</Badge>
              </div>
              
              <div className="space-y-2">
                {items.map((material) => (
                  <Card
                    key={material.id}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      selectedMaterialId === material.id && "ring-2 ring-primary",
                      tradeColors[trade] && "border-l-4"
                    )}
                    onMouseEnter={() => onMaterialHover?.(material.id)}
                    onMouseLeave={() => onMaterialHover?.(null)}
                    onClick={() => onMaterialClick?.(material.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm leading-tight mb-1">
                            {material.description}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-semibold">
                              {material.quantity.toFixed(0)} {material.uom}
                            </span>
                            {material.confidence && (
                              <span className="text-xs">
                                • {Math.round(material.confidence * 100)}% confidence
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs whitespace-nowrap">
                          {trade}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}

        {totalMaterials === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              {searchQuery ? 'No materials match your search' : 'No materials on this page'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
