import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Package, Plus, Upload, Search, Loader2, ExternalLink, Mail, Star, TrendingUp } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function Materials() {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<any[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrade, setSelectedTrade] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  // Material detail dialog
  const [materialViewDialog, setMaterialViewDialog] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  
  // Add material dialog
  const [addMaterialDialog, setAddMaterialDialog] = useState(false);
  const [materialForm, setMaterialForm] = useState({
    name: '',
    description: '',
    trade: 'A',
    category: '',
    sku: '',
    manufacturer: '',
    model: '',
    uom: '',
    unitCost: '',
    laborHours: '',
    wasteFactor: '7',
  });

  useEffect(() => {
    loadMaterials();
  }, []);

  useEffect(() => {
    filterMaterials();
  }, [materials, searchQuery, selectedTrade]);

  const loadMaterials = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/materials`);
      setMaterials(response.data);
    } catch (error) {
      console.error('Failed to load materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterMaterials = () => {
    let filtered = materials;

    if (selectedTrade) {
      filtered = filtered.filter(m => m.trade === selectedTrade);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.name?.toLowerCase().includes(query) ||
        m.description?.toLowerCase().includes(query) ||
        m.category?.toLowerCase().includes(query) ||
        m.sku?.toLowerCase().includes(query)
      );
    }

    setFilteredMaterials(filtered);
  };

  const viewMaterialDetails = async (materialId: string) => {
    try {
      const [materialResponse, pricingResponse] = await Promise.all([
        axios.get(`${API_URL}/materials/${materialId}`),
        axios.get(`${API_URL}/pricing/materials/${materialId}`),
      ]);
      
      setSelectedMaterial({
        ...materialResponse.data,
        pricing: pricingResponse.data,
      });
      setMaterialViewDialog(true);
    } catch (error) {
      console.error('Failed to load material details:', error);
    }
  };

  const openAddMaterialDialog = () => {
    setMaterialForm({
      name: '',
      description: '',
      trade: 'A',
      category: '',
      sku: '',
      manufacturer: '',
      model: '',
      uom: '',
      unitCost: '',
      laborHours: '',
      wasteFactor: '7',
    });
    setAddMaterialDialog(true);
  };

  const saveMaterial = async () => {
    setLoading(true);
    try {
      const data = {
        name: materialForm.name,
        description: materialForm.description,
        trade: materialForm.trade,
        category: materialForm.category,
        sku: materialForm.sku,
        manufacturer: materialForm.manufacturer,
        model: materialForm.model,
        uom: materialForm.uom,
        unitCost: materialForm.unitCost ? parseFloat(materialForm.unitCost) : null,
        laborHours: materialForm.laborHours ? parseFloat(materialForm.laborHours) : null,
        wasteFactor: parseFloat(materialForm.wasteFactor) / 100,
      };

      await axios.post(`${API_URL}/materials`, data);
      setAddMaterialDialog(false);
      loadMaterials();
    } catch (error) {
      console.error('Failed to save material:', error);
      alert('Failed to save material');
    } finally {
      setLoading(false);
    }
  };

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    try {
      await axios.post(`${API_URL}/materials/import-csv`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      loadMaterials();
      alert('Materials imported successfully');
    } catch (error) {
      console.error('Failed to import CSV:', error);
      alert('Failed to import materials');
    } finally {
      setLoading(false);
      event.target.value = ''; // Reset file input
    }
  };

  const trades = ['M', 'E', 'P', 'A', 'S', 'F'];
  const tradeLabels: Record<string, string> = {
    M: 'Mechanical',
    E: 'Electrical',
    P: 'Plumbing',
    A: 'Architectural',
    S: 'Structural',
    F: 'Fire Protection',
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Materials Database</h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive database of all materials from imported projects
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <label htmlFor="csv-upload" className="cursor-pointer">
                <Upload className="w-4 h-4 mr-2" />
                Import CSV
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleCSVImport}
                />
              </label>
            </Button>
            <Button onClick={openAddMaterialDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add Material
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{materials.length}</div>
              <p className="text-xs text-muted-foreground">Total Materials</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{new Set(materials.map(m => m.trade)).size}</div>
              <p className="text-xs text-muted-foreground">Trades</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{new Set(materials.map(m => m.category)).size}</div>
              <p className="text-xs text-muted-foreground">Categories</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {materials.reduce((sum, m) => sum + (m.timesUsed || 0), 0)}
              </div>
              <p className="text-xs text-muted-foreground">Total Uses</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search materials..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={selectedTrade === '' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTrade('')}
                >
                  All
                </Button>
                {trades.map(trade => (
                  <Button
                    key={trade}
                    variant={selectedTrade === trade ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedTrade(trade)}
                  >
                    {trade}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Materials Table */}
        <Card>
          <CardHeader>
            <CardTitle>Materials ({filteredMaterials.length})</CardTitle>
            <CardDescription>
              Click any material to view details and vendors
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                      <TableHead>Material Name</TableHead>
                      <TableHead>Trade</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Vendor Prices</TableHead>
                      <TableHead>Times Used</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaterials.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        {searchQuery || selectedTrade
                          ? 'No materials match your filters'
                          : 'No materials yet. Import a project or add materials manually.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMaterials.map((material) => (
                      <TableRow
                        key={material.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => viewMaterialDetails(material.id)}
                      >
                        <TableCell className="font-medium">{material.name}</TableCell>
                        <TableCell><Badge>{material.trade}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {material.category || 'N/A'}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{material.sku || '-'}</TableCell>
                        <TableCell>
                          {material.unitCost ? `$${material.unitCost.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{material.timesUsed || 0}x</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              viewMaterialDetails(material.id);
                            }}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Material Detail Dialog */}
        <Dialog open={materialViewDialog} onOpenChange={setMaterialViewDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedMaterial?.name}</DialogTitle>
              <DialogDescription>
                Material details and vendor information
              </DialogDescription>
            </DialogHeader>
            {selectedMaterial && (
              <div className="grid gap-6 py-4">
                {/* Material Info */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Trade</Label>
                    <div><Badge>{selectedMaterial.trade}</Badge></div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Category</Label>
                    <div className="text-sm">{selectedMaterial.category || 'N/A'}</div>
                  </div>
                  {selectedMaterial.sku && (
                    <div>
                      <Label className="text-muted-foreground">SKU</Label>
                      <div className="text-sm font-mono">{selectedMaterial.sku}</div>
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground">Times Used</Label>
                    <div className="text-sm flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      {selectedMaterial.timesUsed || 0} projects
                    </div>
                  </div>
                  {selectedMaterial.manufacturer && (
                    <div>
                      <Label className="text-muted-foreground">Manufacturer</Label>
                      <div className="text-sm">{selectedMaterial.manufacturer}</div>
                    </div>
                  )}
                  {selectedMaterial.model && (
                    <div>
                      <Label className="text-muted-foreground">Model</Label>
                      <div className="text-sm">{selectedMaterial.model}</div>
                    </div>
                  )}
                </div>

                {selectedMaterial.description && (
                  <div>
                    <Label className="text-muted-foreground mb-2 block">Description</Label>
                    <p className="text-sm">{selectedMaterial.description}</p>
                  </div>
                )}

                {/* Specifications */}
                {selectedMaterial.specs && (
                  <div>
                    <Label className="text-muted-foreground mb-2 block">Specifications</Label>
                    <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-40">
                      {JSON.stringify(selectedMaterial.specs, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Suppliers */}
                <div className="border-t pt-4">
                  <Label className="mb-3 block text-base font-semibold">
                    Vendors That Supply This Material ({selectedMaterial.suppliers?.length || 0})
                  </Label>
                  {selectedMaterial.suppliers?.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No vendors configured for this material yet.</p>
                  ) : (
                    <div className="grid gap-3">
                      {selectedMaterial.suppliers?.map((vendor: any) => (
                        <Card key={vendor.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold">{vendor.name}</h4>
                                  <Badge variant="default" className="gap-1">
                                    <Package className="w-3 h-3" />
                                    {vendor.type?.replace('_', ' ')}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  {vendor.email && (
                                    <span className="flex items-center gap-1">
                                      <Mail className="w-4 h-4" />
                                      {vendor.email}
                                    </span>
                                  )}
                                  {vendor.rating && (
                                    <span className="flex items-center gap-1">
                                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                      {vendor.rating.toFixed(1)}/5.0
                                    </span>
                                  )}
                                  {vendor.trades && (
                                    <span className="flex gap-1">
                                      {vendor.trades.slice(0, 3).map((trade: string) => (
                                        <Badge key={trade} variant="outline" className="text-xs">{trade}</Badge>
                                      ))}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Button size="sm" variant="outline">
                                <Mail className="w-4 h-4 mr-2" />
                                Contact
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cost Configuration */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-4">Cost & Labor Configuration</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="matUnitCost">Unit Cost ($)</Label>
                      <Input
                        id="matUnitCost"
                        type="number"
                        step="0.01"
                        defaultValue={selectedMaterial.unitCost || ''}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="matUom">Unit of Measure</Label>
                      <Input
                        id="matUom"
                        defaultValue={selectedMaterial.uom || ''}
                        placeholder="EA, SF, LF"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="matLaborHours">Labor Hours</Label>
                      <Input
                        id="matLaborHours"
                        type="number"
                        step="0.01"
                        defaultValue={selectedMaterial.laborHours || ''}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="matWasteFactor">Waste Factor (%)</Label>
                      <Input
                        id="matWasteFactor"
                        type="number"
                        step="0.1"
                        defaultValue={(selectedMaterial.wasteFactor * 100) || '7'}
                        placeholder="7.0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setMaterialViewDialog(false)}>
                Close
              </Button>
              <Button>
                Save Configuration
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Material Dialog */}
        <Dialog open={addMaterialDialog} onOpenChange={setAddMaterialDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Add New Material</DialogTitle>
              <DialogDescription>
                Manually add a material to the database
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="matName">Material Name *</Label>
                  <Input
                    id="matName"
                    value={materialForm.name}
                    onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })}
                    placeholder="e.g., 2x4 Stud"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="matTrade">Trade *</Label>
                  <select
                    id="matTrade"
                    value={materialForm.trade}
                    onChange={(e) => setMaterialForm({ ...materialForm, trade: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {trades.map(trade => (
                      <option key={trade} value={trade}>{tradeLabels[trade]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="matDescription">Description</Label>
                <Input
                  id="matDescription"
                  value={materialForm.description}
                  onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })}
                  placeholder="Full material description"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="matCategory">Category</Label>
                  <Input
                    id="matCategory"
                    value={materialForm.category}
                    onChange={(e) => setMaterialForm({ ...materialForm, category: e.target.value })}
                    placeholder="Flooring, Plumbing, etc."
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="matSku">SKU</Label>
                  <Input
                    id="matSku"
                    value={materialForm.sku}
                    onChange={(e) => setMaterialForm({ ...materialForm, sku: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="matUomInput">Unit of Measure</Label>
                  <Input
                    id="matUomInput"
                    value={materialForm.uom}
                    onChange={(e) => setMaterialForm({ ...materialForm, uom: e.target.value })}
                    placeholder="EA, SF, LF"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="matManufacturer">Manufacturer</Label>
                  <Input
                    id="matManufacturer"
                    value={materialForm.manufacturer}
                    onChange={(e) => setMaterialForm({ ...materialForm, manufacturer: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="matModel">Model</Label>
                  <Input
                    id="matModel"
                    value={materialForm.model}
                    onChange={(e) => setMaterialForm({ ...materialForm, model: e.target.value })}
                  />
                </div>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-4 text-sm">Cost & Labor (Optional)</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="matCost">Unit Cost ($)</Label>
                    <Input
                      id="matCost"
                      type="number"
                      step="0.01"
                      value={materialForm.unitCost}
                      onChange={(e) => setMaterialForm({ ...materialForm, unitCost: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="matLabor">Labor Hours</Label>
                    <Input
                      id="matLabor"
                      type="number"
                      step="0.01"
                      value={materialForm.laborHours}
                      onChange={(e) => setMaterialForm({ ...materialForm, laborHours: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="matWaste">Waste Factor (%)</Label>
                    <Input
                      id="matWaste"
                      type="number"
                      step="0.1"
                      value={materialForm.wasteFactor}
                      onChange={(e) => setMaterialForm({ ...materialForm, wasteFactor: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddMaterialDialog(false)}>
                Cancel
              </Button>
              <Button onClick={saveMaterial} disabled={loading || !materialForm.name}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Create Material
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
