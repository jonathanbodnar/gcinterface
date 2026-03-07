import { useState, useEffect } from 'react';
import { useWizard } from '../../contexts/ProjectWizardContext';
import { takeoffApi } from '../../services/takeoffApi';
import axios from 'axios';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, ChevronDown, ChevronRight } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const CATEGORY_COLORS: Record<string, string> = {
  Flooring: 'bg-blue-100 text-blue-800',
  Plumbing: 'bg-cyan-100 text-cyan-800',
  HVAC: 'bg-orange-100 text-orange-800',
  Electrical: 'bg-yellow-100 text-yellow-800',
  Drywall: 'bg-green-100 text-green-800',
  Painting: 'bg-purple-100 text-purple-800',
  Doors: 'bg-pink-100 text-pink-800',
  Windows: 'bg-indigo-100 text-indigo-800',
  Insulation: 'bg-amber-100 text-amber-800',
  Fixtures: 'bg-teal-100 text-teal-800',
};

function getCategoryColor(cat: string) {
  return CATEGORY_COLORS[cat] || 'bg-gray-100 text-gray-800';
}

interface MaterialItem {
  sku: string;
  description: string;
  qty: number;
  uom: string;
  unitPrice: number;
  totalPrice: number;
  category: string;
  specifications?: Record<string, any>;
}

export default function StepReviewBOM() {
  const { projectId, takeoffJobId, takeoffData, setProjectId } = useWizard();
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadMaterials();
  }, [takeoffJobId, projectId]);

  useEffect(() => {
    if (takeoffJobId && projectId) {
      autoImport();
    }
  }, [takeoffJobId, projectId]);

  const loadMaterials = async () => {
    setLoading(true);
    try {
      if (takeoffJobId) {
        const data = await takeoffApi.getMaterials(takeoffJobId);
        setMaterials(data?.items || []);
      }
    } catch (err) {
      console.error('Failed to load materials:', err);
    } finally {
      setLoading(false);
    }
  };

  const autoImport = async () => {
    if (!takeoffJobId || !projectId || importing) return;
    setImporting(true);
    try {
      await axios.post(`${API_URL}/projects/import/${takeoffJobId}`, {
        projectId,
      });
    } catch {
      // May already be imported
    } finally {
      setImporting(false);
    }
  };

  const toggleExpand = (idx: number) => {
    const next = new Set(expanded);
    next.has(idx) ? next.delete(idx) : next.add(idx);
    setExpanded(next);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Build category list with counts
  const categoryMap = new Map<string, number>();
  materials.forEach((m) => {
    const cat = m.category || 'Other';
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
  });
  const categories = [...categoryMap.entries()].sort((a, b) => b[1] - a[1]);
  const totalValue = materials.reduce((s, m) => s + (m.totalPrice || 0), 0);

  // Filter
  const filtered = materials.filter((m) => {
    const matchCategory = !activeCategory || m.category === activeCategory;
    const matchSearch = !search ||
      m.description?.toLowerCase().includes(search.toLowerCase()) ||
      m.sku?.toLowerCase().includes(search.toLowerCase()) ||
      m.category?.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Bill of Materials</h2>
        <p className="text-muted-foreground">
          {materials.length} items across {categories.length} categories &middot; {fmtCurrency(totalValue)} estimated
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Category Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <Card>
            <CardContent className="p-3">
              <button
                onClick={() => setActiveCategory(null)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  !activeCategory ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                <span>All Materials</span>
                <Badge variant="secondary" className={!activeCategory ? 'bg-primary-foreground/20 text-primary-foreground' : ''}>
                  {materials.length}
                </Badge>
              </button>
              <div className="mt-1 space-y-0.5">
                {categories.map(([cat, count]) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                      activeCategory === cat ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                    }`}
                  >
                    <span className="truncate">{cat}</span>
                    <Badge variant="secondary" className={`ml-2 flex-shrink-0 ${activeCategory === cat ? 'bg-primary-foreground/20 text-primary-foreground' : ''}`}>
                      {count}
                    </Badge>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Materials List */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search materials by name, SKU, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold">{filtered.length}</div>
              <div className="text-xs text-muted-foreground">Items</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold">{activeCategory ? 1 : categories.length}</div>
              <div className="text-xs text-muted-foreground">{activeCategory ? 'Category' : 'Categories'}</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold">{fmtCurrency(filtered.reduce((s, m) => s + (m.totalPrice || 0), 0))}</div>
              <div className="text-xs text-muted-foreground">Est. Value</div>
            </div>
          </div>

          {/* Materials Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead className="min-w-[250px]">Description</TableHead>
                      <TableHead className="whitespace-nowrap">Category</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Qty</TableHead>
                      <TableHead className="whitespace-nowrap">UOM</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Unit Price</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {search ? 'No materials match your search' : 'No materials found'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((item, idx) => {
                        const globalIdx = materials.indexOf(item);
                        const isExpanded = expanded.has(globalIdx);
                        return (
                          <TableRow
                            key={globalIdx}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => toggleExpand(globalIdx)}
                          >
                            <TableCell className="w-10 px-3">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{item.description}</div>
                              {item.sku && <div className="text-xs text-muted-foreground">{item.sku}</div>}
                              {isExpanded && item.specifications && (
                                <div className="mt-3 p-3 bg-muted/30 rounded-md text-xs space-y-1">
                                  {Object.entries(item.specifications).map(([k, v]) => (
                                    <div key={k} className="flex gap-2">
                                      <span className="text-muted-foreground capitalize font-medium min-w-[100px]">{k}:</span>
                                      <span>{String(v)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge className={getCategoryColor(item.category)}>
                                {item.category}
                              </Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right font-medium">
                              {new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(item.qty)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-muted-foreground">{item.uom}</TableCell>
                            <TableCell className="whitespace-nowrap text-right">
                              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.unitPrice)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right font-semibold">
                              {fmtCurrency(item.totalPrice)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
