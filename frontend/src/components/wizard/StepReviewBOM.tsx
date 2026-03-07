import { useState, useEffect, useRef, useCallback } from 'react';
import { useWizard } from '../../contexts/ProjectWizardContext';
import { takeoffApi } from '../../services/takeoffApi';
import axios from 'axios';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Loader2,
  Search,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Plus,
  Check,
  X,
  FileText,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const CATEGORY_COLORS: Record<string, string> = {
  Flooring: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  Plumbing: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  HVAC: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  Electrical: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  Drywall: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  Painting: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  Doors: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  Windows: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  Insulation: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  Fixtures: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
};

function getCategoryColor(cat: string) {
  return CATEGORY_COLORS[cat] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
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
  _deleted?: boolean;
  _edited?: boolean;
}

interface EditState {
  idx: number;
  field: string;
  value: string;
}

export default function StepReviewBOM() {
  const { projectId, takeoffJobId, takeoffFileId } = useWizard();
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [originalMaterials, setOriginalMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<EditState | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showAddRow, setShowAddRow] = useState(false);
  const [showPlanViewer, setShowPlanViewer] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const [newItem, setNewItem] = useState<Partial<MaterialItem>>({
    description: '',
    category: '',
    qty: 0,
    uom: 'EA',
    unitPrice: 0,
  });

  useEffect(() => {
    loadMaterials();
  }, [takeoffJobId, projectId]);

  useEffect(() => {
    if (takeoffJobId && projectId) {
      autoImport();
    }
  }, [takeoffJobId, projectId]);

  useEffect(() => {
    if (editing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editing]);

  const loadMaterials = async () => {
    setLoading(true);
    try {
      if (takeoffJobId) {
        const data = await takeoffApi.getMaterials(takeoffJobId);
        const items = (data?.items || []).map((m: MaterialItem) => ({ ...m, _deleted: false, _edited: false }));
        setMaterials(items);
        setOriginalMaterials(JSON.parse(JSON.stringify(items)));
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
      await axios.post(`${API_URL}/projects/import/${takeoffJobId}`, { projectId });
    } catch {
      // May already be imported
    } finally {
      setImporting(false);
    }
  };

  const loadPdfUrl = async () => {
    if (pdfUrl) {
      setShowPlanViewer(true);
      return;
    }
    setPdfError(null);
    setPdfLoading(true);
    setShowPlanViewer(true);
    try {
      // Primary: get file URL from gcinterface backend (queries takeoff DB directly)
      if (takeoffJobId) {
        try {
          const res = await axios.get(`${API_URL}/projects/takeoff-file/${takeoffJobId}`);
          if (res.data?.storageUrl) {
            setPdfUrl(res.data.storageUrl);
            return;
          }
        } catch {
          // endpoint failed, try fallbacks
        }
      }

      // Fallback: try takeoff API file endpoint
      let fileId = takeoffFileId;
      if (!fileId && takeoffJobId) {
        try {
          const jobStatus = await takeoffApi.getJobStatus(takeoffJobId);
          fileId = jobStatus?.fileId || null;
        } catch { /* continue */ }
      }
      if (fileId) {
        try {
          const fileInfo = await takeoffApi.getFileInfo(fileId);
          if (fileInfo?.downloadUrl) {
            setPdfUrl(fileInfo.downloadUrl);
            return;
          }
        } catch { /* continue */ }
      }

      // Fallback: try plan pages from the project
      if (projectId) {
        try {
          const res = await axios.get(`${API_URL}/projects/${projectId}`);
          const planPages = res.data?.planPages;
          if (planPages?.length > 0) {
            setPdfUrl(planPages[0].pdfUrl);
            return;
          }
        } catch { /* continue */ }
      }

      setPdfError('Could not load PDF. No file URL found for this project.');
    } catch (err: any) {
      console.error('Failed to load PDF:', err);
      setPdfError(err?.message || 'Failed to load PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const toggleExpand = (idx: number) => {
    const next = new Set(expanded);
    next.has(idx) ? next.delete(idx) : next.add(idx);
    setExpanded(next);
  };

  const startEdit = (idx: number, field: string, currentValue: string | number) => {
    setEditing({ idx, field, value: String(currentValue) });
  };

  const commitEdit = useCallback(() => {
    if (!editing) return;
    const { idx, field, value } = editing;

    setMaterials(prev => {
      const updated = [...prev];
      const item = { ...updated[idx], _edited: true };

      if (field === 'qty' || field === 'unitPrice') {
        const num = parseFloat(value) || 0;
        (item as any)[field] = num;
        item.totalPrice = item.qty * item.unitPrice;
      } else {
        (item as any)[field] = value;
      }

      updated[idx] = item;
      return updated;
    });

    setHasChanges(true);
    setEditing(null);
  }, [editing]);

  const cancelEdit = () => setEditing(null);

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  const deleteItem = (idx: number) => {
    setMaterials(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], _deleted: true };
      return updated;
    });
    setHasChanges(true);
  };

  const restoreItem = (idx: number) => {
    setMaterials(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], _deleted: false };
      return updated;
    });
  };

  const addItem = () => {
    if (!newItem.description) return;

    const item: MaterialItem = {
      sku: `CUSTOM-${Date.now()}`,
      description: newItem.description || '',
      category: newItem.category || 'Other',
      qty: newItem.qty || 0,
      uom: newItem.uom || 'EA',
      unitPrice: newItem.unitPrice || 0,
      totalPrice: (newItem.qty || 0) * (newItem.unitPrice || 0),
      _deleted: false,
      _edited: true,
    };

    setMaterials(prev => [...prev, item]);
    setNewItem({ description: '', category: '', qty: 0, uom: 'EA', unitPrice: 0 });
    setShowAddRow(false);
    setHasChanges(true);
  };

  const resetChanges = () => {
    setMaterials(JSON.parse(JSON.stringify(originalMaterials)));
    setHasChanges(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeMaterials = materials.filter(m => !m._deleted);

  // Build category list with counts
  const categoryMap = new Map<string, number>();
  activeMaterials.forEach(m => {
    const cat = m.category || 'Other';
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
  });
  const categories = [...categoryMap.entries()].sort((a, b) => b[1] - a[1]);
  const totalValue = activeMaterials.reduce((s, m) => s + (m.totalPrice || 0), 0);
  const deletedCount = materials.filter(m => m._deleted).length;
  const editedCount = materials.filter(m => m._edited && !m._deleted).length;

  // Filter
  const filtered = materials.filter(m => {
    if (m._deleted) return false;
    const matchCategory = !activeCategory || m.category === activeCategory;
    const matchSearch =
      !search ||
      m.description?.toLowerCase().includes(search.toLowerCase()) ||
      m.sku?.toLowerCase().includes(search.toLowerCase()) ||
      m.category?.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  const fmtCurrencyFull = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  const fmtQty = (n: number) =>
    new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(n);

  const renderEditableCell = (
    globalIdx: number,
    field: string,
    value: string | number,
    display: React.ReactNode,
    className?: string,
  ) => {
    const isEditing = editing?.idx === globalIdx && editing?.field === field;

    if (isEditing) {
      return (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <Input
            ref={editInputRef}
            value={editing.value}
            onChange={e => setEditing({ ...editing, value: e.target.value })}
            onKeyDown={handleEditKeyDown}
            onBlur={commitEdit}
            className="h-7 text-sm w-full min-w-[60px]"
          />
        </div>
      );
    }

    return (
      <div
        className={`group/edit cursor-text hover:bg-primary/5 rounded px-1 -mx-1 py-0.5 inline-flex items-center gap-1 ${className || ''}`}
        onClick={e => {
          e.stopPropagation();
          startEdit(globalIdx, field, value);
        }}
      >
        {display}
        <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover/edit:opacity-100 flex-shrink-0" />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Bill of Materials</h2>
          <p className="text-muted-foreground">
            {activeMaterials.length} items across {categories.length} categories &middot; {fmtCurrency(totalValue)} estimated
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={loadPdfUrl}
            disabled={pdfLoading || (!takeoffFileId && !takeoffJobId && !projectId)}
          >
            {pdfLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
            View Plans
          </Button>
          {hasChanges && (
            <>
              <Button variant="ghost" size="sm" onClick={resetChanges}>
                <X className="w-4 h-4 mr-1" /> Reset
              </Button>
              <Badge variant="secondary">
                {editedCount > 0 && `${editedCount} edited`}
                {editedCount > 0 && deletedCount > 0 && ', '}
                {deletedCount > 0 && `${deletedCount} removed`}
              </Badge>
            </>
          )}
        </div>
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
                <Badge
                  variant="secondary"
                  className={!activeCategory ? 'bg-primary-foreground/20 text-primary-foreground' : ''}
                >
                  {activeMaterials.length}
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
                    <Badge
                      variant="secondary"
                      className={`ml-2 flex-shrink-0 ${activeCategory === cat ? 'bg-primary-foreground/20 text-primary-foreground' : ''}`}
                    >
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
          {/* Search + Actions */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search materials by name, SKU, or category..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button size="sm" onClick={() => setShowAddRow(!showAddRow)}>
              <Plus className="w-4 h-4 mr-1" /> Add Item
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold">{filtered.length}</div>
              <div className="text-xs text-muted-foreground">Items</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold">{activeCategory ? 1 : categories.length}</div>
              <div className="text-xs text-muted-foreground">
                {activeCategory ? 'Category' : 'Categories'}
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold">
                {fmtCurrency(filtered.reduce((s, m) => s + (m.totalPrice || 0), 0))}
              </div>
              <div className="text-xs text-muted-foreground">Est. Value</div>
            </div>
          </div>

          {/* Add Row */}
          {showAddRow && (
            <Card className="border-dashed border-primary/50">
              <CardContent className="p-4">
                <div className="flex items-end gap-3 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                    <Input
                      value={newItem.description}
                      onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))}
                      placeholder="Material description"
                    />
                  </div>
                  <div className="w-32">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                    <Input
                      value={newItem.category}
                      onChange={e => setNewItem(p => ({ ...p, category: e.target.value }))}
                      placeholder="Category"
                    />
                  </div>
                  <div className="w-20">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Qty</label>
                    <Input
                      type="number"
                      value={newItem.qty || ''}
                      onChange={e => setNewItem(p => ({ ...p, qty: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="w-20">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">UOM</label>
                    <Input
                      value={newItem.uom}
                      onChange={e => setNewItem(p => ({ ...p, uom: e.target.value }))}
                    />
                  </div>
                  <div className="w-24">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Unit Price</label>
                    <Input
                      type="number"
                      value={newItem.unitPrice || ''}
                      onChange={e => setNewItem(p => ({ ...p, unitPrice: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <Button size="sm" onClick={addItem} disabled={!newItem.description}>
                    <Check className="w-4 h-4 mr-1" /> Add
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAddRow(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

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
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          {search ? 'No materials match your search' : 'No materials found'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((item) => {
                        const globalIdx = materials.indexOf(item);
                        const isExpanded = expanded.has(globalIdx);
                        const isEdited = item._edited;

                        return (
                          <TableRow
                            key={globalIdx}
                            className={`cursor-pointer hover:bg-muted/50 ${isEdited ? 'bg-yellow-50/50 dark:bg-yellow-950/20' : ''}`}
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
                              {renderEditableCell(
                                globalIdx,
                                'description',
                                item.description,
                                <>
                                  <span className="font-medium">{item.description}</span>
                                  {isEdited && <Badge variant="outline" className="ml-2 text-[10px] py-0 px-1">edited</Badge>}
                                </>,
                              )}
                              {item.sku && (
                                <div className="text-xs text-muted-foreground mt-0.5">{item.sku}</div>
                              )}
                              {isExpanded && item.specifications && (
                                <div className="mt-3 p-3 bg-muted/30 rounded-md text-xs space-y-1">
                                  {Object.entries(item.specifications).map(([k, v]) => (
                                    <div key={k} className="flex gap-2">
                                      <span className="text-muted-foreground capitalize font-medium min-w-[100px]">
                                        {k}:
                                      </span>
                                      <span>{String(v)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge className={getCategoryColor(item.category)}>
                                {item.category || 'Other'}
                              </Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right">
                              {renderEditableCell(
                                globalIdx,
                                'qty',
                                item.qty,
                                <span className="font-medium">{fmtQty(item.qty)}</span>,
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {renderEditableCell(
                                globalIdx,
                                'uom',
                                item.uom,
                                <span className="text-muted-foreground">{item.uom}</span>,
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right">
                              {renderEditableCell(
                                globalIdx,
                                'unitPrice',
                                item.unitPrice,
                                <span>{fmtCurrencyFull(item.unitPrice)}</span>,
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right font-semibold">
                              {fmtCurrency(item.totalPrice)}
                            </TableCell>
                            <TableCell className="w-10 px-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={e => {
                                  e.stopPropagation();
                                  deleteItem(globalIdx);
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
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

          {/* Deleted items recovery */}
          {deletedCount > 0 && (
            <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
              <span>{deletedCount} item{deletedCount > 1 ? 's' : ''} removed.</span>
              {materials
                .map((m, i) => ({ m, i }))
                .filter(({ m }) => m._deleted)
                .map(({ m, i }) => (
                  <button
                    key={i}
                    onClick={() => restoreItem(i)}
                    className="text-primary hover:underline text-xs"
                  >
                    Restore &ldquo;{m.description.substring(0, 30)}{m.description.length > 30 ? '...' : ''}&rdquo;
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* PDF Viewer Dialog */}
      <Dialog open={showPlanViewer} onOpenChange={setShowPlanViewer}>
        <DialogContent className="max-w-[90vw] w-[90vw] h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle>Uploaded Plans</DialogTitle>
            <DialogDescription>Review your uploaded construction documents</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 px-6 pb-6">
            {pdfLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="w-10 h-10 animate-spin text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading PDF...</p>
                </div>
              </div>
            ) : pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full h-full rounded-md border"
                title="Plan PDF Viewer"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>{pdfError || 'No PDF available for this project'}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                      setPdfUrl(null);
                      setPdfError(null);
                      loadPdfUrl();
                    }}
                  >
                    Retry
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
