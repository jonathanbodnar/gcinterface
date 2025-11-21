import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Mail, Phone, MapPin, Star, Package, DollarSign, Edit2, Plus, Upload, Loader2, TrendingUp } from 'lucide-react';
import axios from 'axios';
import { cn } from '@/lib/utils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function VendorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<any>(null);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceDialog, setPriceDialog] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [priceForm, setPriceForm] = useState({ unitCost: '', leadTimeDays: '', minimumOrder: '' });

  useEffect(() => {
    loadVendorData();
  }, [id]);

  const loadVendorData = async () => {
    setLoading(true);
    try {
      // Load vendor details
      const vendorResponse = await axios.get(`${API_URL}/vendors/${id}`);
      setVendor(vendorResponse.data);

      // Load vendor's pricing catalog
      const catalogResponse = await axios.get(`${API_URL}/pricing/vendors/${id}/catalog`);
      setCatalog(catalogResponse.data.catalog || []);
    } catch (error) {
      console.error('Failed to load vendor:', error);
    } finally {
      setLoading(false);
    }
  };

  const openPriceDialog = (material: any) => {
    setSelectedMaterial(material);
    setPriceForm({
      unitCost: material.unitCost?.toString() || '',
      leadTimeDays: material.leadTimeDays?.toString() || '',
      minimumOrder: material.minimumOrder?.toString() || '',
    });
    setPriceDialog(true);
  };

  const savePrice = async () => {
    if (!selectedMaterial) return;

    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/pricing/vendors/${id}/materials/${selectedMaterial.materialId || selectedMaterial.material?.id}`,
        {
          unitCost: parseFloat(priceForm.unitCost),
          uom: selectedMaterial.uom || selectedMaterial.material?.uom,
          leadTimeDays: priceForm.leadTimeDays ? parseInt(priceForm.leadTimeDays) : null,
          minimumOrder: priceForm.minimumOrder ? parseFloat(priceForm.minimumOrder) : null,
        }
      );
      
      alert('Price updated successfully!');
      setPriceDialog(false);
      loadVendorData();
    } catch (error) {
      console.error('Failed to update price:', error);
      alert('Failed to update price');
    } finally {
      setLoading(false);
    }
  };

  const handleCatalogUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/vendors/${id}/upload-materials`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      alert(`Success! ${response.data.materialsCreated} materials added, ${response.data.materialsLinked} linked`);
      loadVendorData();
    } catch (error) {
      console.error('Failed to upload catalog:', error);
      alert('Failed to upload catalog');
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  const getVendorTypeBadge = (type: string) => {
    switch (type) {
      case 'MATERIAL_SUPPLIER':
        return <Badge variant="default" className="gap-1"><Package className="w-3 h-3" />Supplier</Badge>;
      case 'SUBCONTRACTOR':
        return <Badge variant="secondary" className="gap-1">Contractor</Badge>;
      case 'BOTH':
        return <Badge className="gap-1">Both</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  if (loading && !vendor) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!vendor) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Vendor not found</p>
          <Button className="mt-4" onClick={() => navigate('/vendors')}>
            Back to Vendors
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/vendors')} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Vendors
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">{vendor.name}</h1>
              <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                {vendor.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    {vendor.email}
                  </span>
                )}
                {vendor.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    {vendor.phone}
                  </span>
                )}
                {vendor.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {vendor.address}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getVendorTypeBadge(vendor.type)}
              {vendor.rating && (
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{vendor.rating.toFixed(1)}</span>
                </div>
              )}
              <Button size="sm" onClick={() => navigate(`/vendors?edit=${id}`)}>
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Vendor
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{catalog.length}</div>
              <p className="text-xs text-muted-foreground">Materials in Catalog</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{vendor.trades?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Trades</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {catalog.length > 0 
                  ? `$${(catalog.reduce((sum: number, c: any) => sum + (c.unitCost || 0), 0) / catalog.length).toFixed(2)}`
                  : '$0'}
              </div>
              <p className="text-xs text-muted-foreground">Avg Price</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {catalog.filter((c: any) => c.lastQuoteDate).length}
              </div>
              <p className="text-xs text-muted-foreground">Recently Quoted</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="catalog" className="w-full">
          <TabsList>
            <TabsTrigger value="catalog">
              <Package className="w-4 h-4 mr-2" />
              Material Catalog
            </TabsTrigger>
            <TabsTrigger value="details">
              Details
            </TabsTrigger>
            <TabsTrigger value="performance">
              <TrendingUp className="w-4 h-4 mr-2" />
              Performance
            </TabsTrigger>
          </TabsList>

          {/* Catalog Tab */}
          <TabsContent value="catalog" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Material Catalog & Pricing</CardTitle>
                    <CardDescription>{catalog.length} materials with vendor-specific pricing</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" asChild>
                      <label htmlFor="catalog-upload" className="cursor-pointer">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Catalog
                        <input
                          id="catalog-upload"
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          className="hidden"
                          onChange={handleCatalogUpload}
                        />
                      </label>
                    </Button>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Material
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {catalog.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No materials in catalog yet</p>
                    <p className="text-sm mt-2">Upload a CSV/Excel file to add materials and pricing</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead>Trade</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead>UOM</TableHead>
                        <TableHead>Lead Time</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {catalog.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.material?.name || 'Unknown'}</TableCell>
                          <TableCell><Badge>{item.material?.trade || 'N/A'}</Badge></TableCell>
                          <TableCell className="text-right font-semibold text-green-600">
                            ${item.unitCost.toFixed(2)}
                          </TableCell>
                          <TableCell>{item.uom}</TableCell>
                          <TableCell>
                            {item.leadTimeDays ? `${item.leadTimeDays} days` : '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item.lastQuoteDate 
                              ? new Date(item.lastQuoteDate).toLocaleDateString()
                              : new Date(item.updatedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => openPriceDialog(item)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Vendor Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Type</Label>
                    <div>{getVendorTypeBadge(vendor.type)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Contact Person</Label>
                    <div className="text-sm">{vendor.contactPerson || '-'}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Website</Label>
                    <div className="text-sm">{vendor.website || '-'}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Service Radius</Label>
                    <div className="text-sm">{vendor.serviceRadius ? `${vendor.serviceRadius} miles` : '-'}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Payment Terms</Label>
                    <div className="text-sm">{vendor.paymentTerms || '-'}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Rating</Label>
                    <div className="text-sm">{vendor.rating ? `${vendor.rating.toFixed(1)} / 5.0` : '-'}</div>
                  </div>
                </div>

                {vendor.trades && vendor.trades.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground mb-2 block">Trades</Label>
                    <div className="flex flex-wrap gap-2">
                      {vendor.trades.map((trade: string) => (
                        <Badge key={trade} variant="secondary">{trade}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {vendor.services && vendor.services.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground mb-2 block">Services</Label>
                    <div className="flex flex-wrap gap-2">
                      {vendor.services.map((service: string) => (
                        <Badge key={service} variant="outline">{service}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {vendor.notes && (
                  <div>
                    <Label className="text-muted-foreground">Notes</Label>
                    <p className="text-sm mt-1">{vendor.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Vendor Performance</CardTitle>
                <CardDescription>Metrics and analytics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Quotes Submitted</p>
                      <p className="text-2xl font-bold">
                        {catalog.filter((c: any) => c.lastQuoteDate).length}
                      </p>
                    </div>
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Avg Quote Response Time</p>
                      <p className="text-2xl font-bold">2.3 days</p>
                    </div>
                    <Clock className="w-8 h-8 text-muted-foreground" />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Price Competitiveness</p>
                      <p className="text-2xl font-bold text-green-600">Good</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Price Dialog */}
        <Dialog open={priceDialog} onOpenChange={setPriceDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Material Price</DialogTitle>
              <DialogDescription>
                {selectedMaterial?.material?.name || selectedMaterial?.description}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="unitCost">Unit Cost ($)</Label>
                <Input
                  id="unitCost"
                  type="number"
                  step="0.01"
                  value={priceForm.unitCost}
                  onChange={(e) => setPriceForm({ ...priceForm, unitCost: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="leadTime">Lead Time (days)</Label>
                  <Input
                    id="leadTime"
                    type="number"
                    value={priceForm.leadTimeDays}
                    onChange={(e) => setPriceForm({ ...priceForm, leadTimeDays: e.target.value })}
                    placeholder="5"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="minOrder">Minimum Order</Label>
                  <Input
                    id="minOrder"
                    type="number"
                    value={priceForm.minimumOrder}
                    onChange={(e) => setPriceForm({ ...priceForm, minimumOrder: e.target.value })}
                    placeholder="100"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPriceDialog(false)}>
                Cancel
              </Button>
              <Button onClick={savePrice} disabled={loading || !priceForm.unitCost}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save Price
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
