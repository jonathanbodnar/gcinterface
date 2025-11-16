import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MultiSelect } from '@/components/ui/multi-select';
import { Users, Plus, Upload, Loader2, Edit2, Package, HardHat, Mail, Phone, Building2, Star } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function Vendors() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [allMaterials, setAllMaterials] = useState<any[]>([]);
  const [materialOptions, setMaterialOptions] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [vendorDialog, setVendorDialog] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [vendorType, setVendorType] = useState<'MATERIAL_SUPPLIER' | 'SUBCONTRACTOR' | 'BOTH'>('MATERIAL_SUPPLIER');
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [vendorForm, setVendorForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    contactPerson: '',
    type: 'MATERIAL_SUPPLIER',
    trades: '',
    
    // Supplier fields
    alternates: '',
    isRequired: false,
    requiredFor: '',
    
    // Contractor fields
    services: '',
    crewSize: '',
    equipmentList: '',
    certifications: '',
    insurance: '',
    
    // Common fields
    serviceRadius: '',
    preferredRegions: '',
    paymentTerms: '',
    notes: '',
  });

  useEffect(() => {
    loadVendors();
    loadAllMaterials();
  }, []);

  const loadVendors = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/vendors`);
      setVendors(response.data);
    } catch (error) {
      console.error('Failed to load vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllMaterials = async () => {
    try {
      const response = await axios.get(`${API_URL}/materials`);
      setAllMaterials(response.data);
      setMaterialOptions(response.data.map((m: any) => ({
        value: m.id,
        label: `${m.name} (${m.trade})${m.category ? ' - ' + m.category : ''}`,
      })));
    } catch (error) {
      console.error('Failed to load materials:', error);
    }
  };

  const handleMaterialSearch = async (query: string) => {
    if (!query) {
      loadAllMaterials();
      return;
    }
    try {
      const response = await axios.get(`${API_URL}/materials/search?q=${encodeURIComponent(query)}`);
      setMaterialOptions(response.data.map((m: any) => ({
        value: m.id,
        label: `${m.name} (${m.trade})${m.category ? ' - ' + m.category : ''}`,
      })));
    } catch (error) {
      console.error('Failed to search materials:', error);
    }
  };

  const handleAddNewMaterial = async (materialName: string) => {
    try {
      const response = await axios.post(`${API_URL}/materials`, {
        name: materialName,
        trade: 'A',
        description: materialName,
        active: true,
      });
      loadAllMaterials();
      setSelectedMaterialIds([...selectedMaterialIds, response.data.id]);
    } catch (error) {
      console.error('Failed to add material:', error);
    }
  };

  const openVendorDialog = (vendor?: any) => {
    if (vendor) {
      setEditingVendor(vendor);
      setVendorType(vendor.type || 'MATERIAL_SUPPLIER');
      
      const materialIds = vendor.materials?.map((materialName: string) => {
        const mat = allMaterials.find(m => m.name === materialName || m.id === materialName);
        return mat?.id;
      }).filter(Boolean) || [];
      
      setSelectedMaterialIds(materialIds);
      
      setVendorForm({
        name: vendor.name || '',
        email: vendor.email || '',
        phone: vendor.phone || '',
        address: vendor.address || '',
        website: vendor.website || '',
        contactPerson: vendor.contactPerson || '',
        type: vendor.type || 'MATERIAL_SUPPLIER',
        trades: vendor.trades?.join(', ') || '',
        alternates: vendor.alternates?.join(', ') || '',
        isRequired: vendor.isRequired || false,
        requiredFor: vendor.requiredFor?.join(', ') || '',
        services: vendor.services?.join(', ') || '',
        crewSize: vendor.crewSize?.toString() || '',
        equipmentList: vendor.equipmentList?.join(', ') || '',
        certifications: vendor.certifications?.join(', ') || '',
        insurance: vendor.insurance ? JSON.stringify(vendor.insurance) : '',
        serviceRadius: vendor.serviceRadius?.toString() || '',
        preferredRegions: vendor.preferredRegions?.join(', ') || '',
        paymentTerms: vendor.paymentTerms || '',
        notes: vendor.notes || '',
      });
    } else {
      setEditingVendor(null);
      setVendorType('MATERIAL_SUPPLIER');
      setSelectedMaterialIds([]);
      setVendorForm({
        name: '',
        email: '',
        phone: '',
        address: '',
        website: '',
        contactPerson: '',
        type: 'MATERIAL_SUPPLIER',
        trades: '',
        alternates: '',
        isRequired: false,
        requiredFor: '',
        services: '',
        crewSize: '',
        equipmentList: '',
        certifications: '',
        insurance: '',
        serviceRadius: '',
        preferredRegions: '',
        paymentTerms: '',
        notes: '',
      });
    }
    setVendorDialog(true);
  };

  const saveVendor = async () => {
    setLoading(true);
    try {
      const materialNames = selectedMaterialIds.map(id => {
        const mat = allMaterials.find(m => m.id === id);
        return mat?.name;
      }).filter(Boolean);

      const baseData = {
        name: vendorForm.name,
        email: vendorForm.email,
        phone: vendorForm.phone,
        address: vendorForm.address,
        website: vendorForm.website,
        contactPerson: vendorForm.contactPerson,
        type: vendorType,
        trades: vendorForm.trades.split(',').map(t => t.trim()).filter(Boolean),
        serviceRadius: vendorForm.serviceRadius ? parseInt(vendorForm.serviceRadius) : null,
        preferredRegions: vendorForm.preferredRegions.split(',').map(r => r.trim()).filter(Boolean),
        paymentTerms: vendorForm.paymentTerms,
        notes: vendorForm.notes,
        active: true,
      };

      const supplierData = (vendorType === 'MATERIAL_SUPPLIER' || vendorType === 'BOTH') ? {
        materials: materialNames,
        alternates: vendorForm.alternates.split(',').map(a => a.trim()).filter(Boolean),
        isRequired: vendorForm.isRequired,
        requiredFor: vendorForm.requiredFor.split(',').map(r => r.trim()).filter(Boolean),
      } : {};

      const contractorData = (vendorType === 'SUBCONTRACTOR' || vendorType === 'BOTH') ? {
        services: vendorForm.services.split(',').map(s => s.trim()).filter(Boolean),
        crewSize: vendorForm.crewSize ? parseInt(vendorForm.crewSize) : null,
        equipmentList: vendorForm.equipmentList.split(',').map(e => e.trim()).filter(Boolean),
        certifications: vendorForm.certifications.split(',').map(c => c.trim()).filter(Boolean),
        insurance: vendorForm.insurance ? JSON.parse(vendorForm.insurance) : null,
      } : {};

      const data = { ...baseData, ...supplierData, ...contractorData };

      if (editingVendor) {
        await axios.put(`${API_URL}/vendors/${editingVendor.id}`, data);
      } else {
        await axios.post(`${API_URL}/vendors`, data);
      }
      setVendorDialog(false);
      loadVendors();
    } catch (error) {
      console.error('Failed to save vendor:', error);
      alert('Failed to save vendor');
    } finally {
      setLoading(false);
    }
  };

  const getVendorTypeBadge = (type: string) => {
    switch (type) {
      case 'MATERIAL_SUPPLIER':
        return <Badge variant="default" className="gap-1"><Package className="w-3 h-3" />Supplier</Badge>;
      case 'SUBCONTRACTOR':
        return <Badge variant="secondary" className="gap-1"><HardHat className="w-3 h-3" />Contractor</Badge>;
      case 'BOTH':
        return <Badge className="gap-1"><Package className="w-3 h-3" /><HardHat className="w-3 h-3" />Both</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Vendor Management</h1>
            <p className="text-muted-foreground mt-2">Manage suppliers and subcontractors</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Import from Excel
            </Button>
            <Button onClick={() => openVendorDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Vendor
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{vendors.length}</div>
              <p className="text-xs text-muted-foreground">Total Vendors</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {vendors.filter(v => v.type === 'MATERIAL_SUPPLIER' || v.type === 'BOTH').length}
              </div>
              <p className="text-xs text-muted-foreground">Suppliers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {vendors.filter(v => v.type === 'SUBCONTRACTOR' || v.type === 'BOTH').length}
              </div>
              <p className="text-xs text-muted-foreground">Contractors</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {(vendors.reduce((sum, v) => sum + (v.rating || 0), 0) / vendors.length || 0).toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground">Avg Rating</p>
            </CardContent>
          </Card>
        </div>

        {/* Vendors Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Vendors ({vendors.length})</CardTitle>
            <CardDescription>Suppliers and subcontractors</CardDescription>
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
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Trades</TableHead>
                    <TableHead>Materials/Services</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No vendors found. Click "Add Vendor" to create one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    vendors.map((vendor) => (
                      <TableRow key={vendor.id}>
                        <TableCell className="font-medium">{vendor.name}</TableCell>
                        <TableCell>{getVendorTypeBadge(vendor.type)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                            {vendor.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {vendor.email}
                              </span>
                            )}
                            {vendor.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {vendor.phone}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {vendor.trades?.slice(0, 3).map((trade: string) => (
                              <Badge key={trade} variant="secondary" className="text-xs">{trade}</Badge>
                            ))}
                            {vendor.trades?.length > 3 && (
                              <Badge variant="secondary" className="text-xs">+{vendor.trades.length - 3}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {vendor.type === 'MATERIAL_SUPPLIER' || vendor.type === 'BOTH' 
                            ? `${vendor.materials?.length || 0} materials`
                            : `${vendor.services?.length || 0} services`}
                        </TableCell>
                        <TableCell>
                          {vendor.rating ? (
                            <span className="flex items-center gap-1 text-sm">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              {vendor.rating.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={vendor.active ? 'default' : 'secondary'}>
                            {vendor.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openVendorDialog(vendor)}>
                            <Edit2 className="w-4 h-4" />
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

        {/* Vendor Dialog - Same as before but standalone */}
        <Dialog open={vendorDialog} onOpenChange={setVendorDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingVendor ? 'Edit' : 'Create'} Vendor</DialogTitle>
              <DialogDescription>
                Add or update vendor/contractor information
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              {/* Vendor Type Selection */}
              <div className="grid gap-2">
                <Label>Vendor Type</Label>
                <div className="flex gap-2">
                  {(['MATERIAL_SUPPLIER', 'SUBCONTRACTOR', 'BOTH'] as const).map((type) => (
                    <Button
                      key={type}
                      type="button"
                      variant={vendorType === type ? 'default' : 'outline'}
                      onClick={() => {
                        setVendorType(type);
                        setVendorForm({ ...vendorForm, type });
                      }}
                      className="flex-1"
                    >
                      {type === 'MATERIAL_SUPPLIER' && <Package className="w-4 h-4 mr-2" />}
                      {type === 'SUBCONTRACTOR' && <HardHat className="w-4 h-4 mr-2" />}
                      {type === 'BOTH' && <><Package className="w-4 h-4 mr-1" /><HardHat className="w-4 h-4 mr-1" /></>}
                      {type.replace('_', ' ')}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Basic Information - Same as AdminCenter */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="vendorName">Company Name *</Label>
                    <Input
                      id="vendorName"
                      value={vendorForm.name}
                      onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                      placeholder="ABC Supply Co."
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="contactPerson">Contact Person</Label>
                    <Input
                      id="contactPerson"
                      value={vendorForm.contactPerson}
                      onChange={(e) => setVendorForm({ ...vendorForm, contactPerson: e.target.value })}
                      placeholder="John Smith"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="vendorEmail">Email</Label>
                    <Input
                      id="vendorEmail"
                      type="email"
                      value={vendorForm.email}
                      onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                      placeholder="contact@vendor.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="vendorPhone">Phone</Label>
                    <Input
                      id="vendorPhone"
                      value={vendorForm.phone}
                      onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={vendorForm.website}
                      onChange={(e) => setVendorForm({ ...vendorForm, website: e.target.value })}
                      placeholder="www.vendor.com"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="vendorAddress">Address</Label>
                  <Input
                    id="vendorAddress"
                    value={vendorForm.address}
                    onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                    placeholder="123 Main St, City, State ZIP"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="vendorTrades">Trades (comma-separated)</Label>
                    <Input
                      id="vendorTrades"
                      value={vendorForm.trades}
                      onChange={(e) => setVendorForm({ ...vendorForm, trades: e.target.value })}
                      placeholder="M, E, P"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="paymentTerms">Payment Terms</Label>
                    <Input
                      id="paymentTerms"
                      value={vendorForm.paymentTerms}
                      onChange={(e) => setVendorForm({ ...vendorForm, paymentTerms: e.target.value })}
                      placeholder="Net 30"
                    />
                  </div>
                </div>
              </div>

              {/* Supplier-Specific Fields */}
              {(vendorType === 'MATERIAL_SUPPLIER' || vendorType === 'BOTH') && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Supplier Details
                  </h3>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="vendorMaterials">Materials Supplied</Label>
                      <MultiSelect
                        options={materialOptions}
                        selected={selectedMaterialIds}
                        onChange={setSelectedMaterialIds}
                        onSearch={handleMaterialSearch}
                        onAddNew={handleAddNewMaterial}
                        placeholder="Search and select materials..."
                      />
                      <p className="text-xs text-muted-foreground">
                        Search from materials database or add new materials on-the-fly
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="alternates">Product Alternates (comma-separated)</Label>
                      <Input
                        id="alternates"
                        value={vendorForm.alternates}
                        onChange={(e) => setVendorForm({ ...vendorForm, alternates: e.target.value })}
                        placeholder="Brand A, Brand B alternatives"
                      />
                      <p className="text-xs text-muted-foreground">Material alternates for value engineering</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isRequired"
                          checked={vendorForm.isRequired}
                          onChange={(e) => setVendorForm({ ...vendorForm, isRequired: e.target.checked })}
                          className="w-4 h-4 rounded border-input"
                        />
                        <Label htmlFor="isRequired" className="cursor-pointer">
                          Plan-Required Vendor
                        </Label>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="requiredFor">Required For (if checked)</Label>
                        <Input
                          id="requiredFor"
                          value={vendorForm.requiredFor}
                          onChange={(e) => setVendorForm({ ...vendorForm, requiredFor: e.target.value })}
                          placeholder="Specific materials"
                          disabled={!vendorForm.isRequired}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Contractor-Specific Fields */}
              {(vendorType === 'SUBCONTRACTOR' || vendorType === 'BOTH') && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <HardHat className="w-4 h-4" />
                    Contractor Details
                  </h3>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="services">Services Provided (comma-separated)</Label>
                      <Input
                        id="services"
                        value={vendorForm.services}
                        onChange={(e) => setVendorForm({ ...vendorForm, services: e.target.value })}
                        placeholder="Drywall Installation, Taping, Painting, Tile Work"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="crewSize">Crew Size</Label>
                        <Input
                          id="crewSize"
                          type="number"
                          value={vendorForm.crewSize}
                          onChange={(e) => setVendorForm({ ...vendorForm, crewSize: e.target.value })}
                          placeholder="5"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="equipmentList">Equipment (comma-separated)</Label>
                        <Input
                          id="equipmentList"
                          value={vendorForm.equipmentList}
                          onChange={(e) => setVendorForm({ ...vendorForm, equipmentList: e.target.value })}
                          placeholder="Lifts, Tools, Vehicles"
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="certifications">Certifications (comma-separated)</Label>
                      <Input
                        id="certifications"
                        value={vendorForm.certifications}
                        onChange={(e) => setVendorForm({ ...vendorForm, certifications: e.target.value })}
                        placeholder="OSHA, Trade License, EPA Certified"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="insurance">Insurance (JSON)</Label>
                      <Textarea
                        id="insurance"
                        value={vendorForm.insurance}
                        onChange={(e) => setVendorForm({ ...vendorForm, insurance: e.target.value })}
                        placeholder='{"liability": 2000000, "workers_comp": 1000000, "expiry": "2025-12-31"}'
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">Format: liability, workers compensation, expiry date</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Location & Service Area */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Location & Service Area
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="serviceRadius">Service Radius (miles)</Label>
                    <Input
                      id="serviceRadius"
                      type="number"
                      value={vendorForm.serviceRadius}
                      onChange={(e) => setVendorForm({ ...vendorForm, serviceRadius: e.target.value })}
                      placeholder="50"
                    />
                    <p className="text-xs text-muted-foreground">Distance from vendor location for proximity filtering</p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="preferredRegions">Preferred Regions (comma-separated)</Label>
                    <Input
                      id="preferredRegions"
                      value={vendorForm.preferredRegions}
                      onChange={(e) => setVendorForm({ ...vendorForm, preferredRegions: e.target.value })}
                      placeholder="North County, Downtown, East Bay"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={vendorForm.notes}
                  onChange={(e) => setVendorForm({ ...vendorForm, notes: e.target.value })}
                  placeholder="Additional information about this vendor"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setVendorDialog(false)}>
                Cancel
              </Button>
              <Button onClick={saveVendor} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {editingVendor ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
