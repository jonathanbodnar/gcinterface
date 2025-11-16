import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MultiSelect } from '@/components/ui/multi-select';
import { DollarSign, Percent, Users, Mail, Plus, Edit2, Upload, Loader2, Save, Package, HardHat, ExternalLink, Building2 } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function AdminCenter() {
  const [activeTab, setActiveTab] = useState('material-rules');
  
  // Materials database
  const [allMaterials, setAllMaterials] = useState<any[]>([]);
  const [materialOptions, setMaterialOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedMaterialForView, setSelectedMaterialForView] = useState<any>(null);
  const [materialViewDialog, setMaterialViewDialog] = useState(false);
  
  // Material Rules
  const [materialRules, setMaterialRules] = useState<any[]>([]);
  const [materialRuleDialog, setMaterialRuleDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [materialRuleForm, setMaterialRuleForm] = useState({
    material: '',
    trade: '',
    unitCost: '',
    laborHours: '',
    wasteFactor: '',
  });

  // Trade Markups
  const [tradeMarkups, setTradeMarkups] = useState<any[]>([]);
  const [markupForm, setMarkupForm] = useState<Record<string, string>>({});

  // Vendors
  const [vendors, setVendors] = useState<any[]>([]);
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

  // Email Templates
  const [emailTemplates, setEmailTemplates] = useState<any[]>([]);
  const [templateDialog, setTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [templateForm, setTemplateForm] = useState({
    type: 'RFQ',
    subject: '',
    body: '',
  });

  const [loading, setLoading] = useState(false);

  // Load data
  useEffect(() => {
    loadAllMaterials();
    loadMaterialRules();
    loadTradeMarkups();
    loadVendors();
    loadEmailTemplates();
  }, []);

  const loadAllMaterials = async () => {
    try {
      const response = await axios.get(`${API_URL}/materials`);
      setAllMaterials(response.data);
      setMaterialOptions(response.data.map((m: any) => ({
        value: m.id,
        label: `${m.name} (${m.trade}) - ${m.category || 'No category'}`,
      })));
    } catch (error) {
      console.error('Failed to load materials:', error);
    }
  };

  const loadMaterialRules = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/material-rules`);
      setMaterialRules(response.data);
    } catch (error) {
      console.error('Failed to load material rules:', error);
    }
  };

  const loadTradeMarkups = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/trade-markups`);
      setTradeMarkups(response.data);
      const form: Record<string, string> = {};
      response.data.forEach((tm: any) => {
        form[tm.trade] = tm.markup.toString();
      });
      setMarkupForm(form);
    } catch (error) {
      console.error('Failed to load trade markups:', error);
    }
  };

  const loadVendors = async () => {
    try {
      const response = await axios.get(`${API_URL}/vendors`);
      setVendors(response.data);
    } catch (error) {
      console.error('Failed to load vendors:', error);
    }
  };

  const loadEmailTemplates = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/email-templates`);
      setEmailTemplates(response.data);
    } catch (error) {
      console.error('Failed to load email templates:', error);
    }
  };

  const viewMaterialDetails = async (materialId: string) => {
    try {
      const response = await axios.get(`${API_URL}/materials/${materialId}`);
      setSelectedMaterialForView(response.data);
      setMaterialViewDialog(true);
    } catch (error) {
      console.error('Failed to load material details:', error);
    }
  };

  // Material Rules handlers
  const openMaterialRuleDialog = (rule?: any) => {
    if (rule) {
      setEditingRule(rule);
      setMaterialRuleForm({
        material: rule.material || '',
        trade: rule.trade || '',
        unitCost: rule.unitCost?.toString() || '',
        laborHours: rule.laborHours?.toString() || '',
        wasteFactor: rule.wasteFactor?.toString() || '',
      });
    } else {
      setEditingRule(null);
      setMaterialRuleForm({
        material: '',
        trade: '',
        unitCost: '',
        laborHours: '',
        wasteFactor: '',
      });
    }
    setMaterialRuleDialog(true);
  };

  const saveMaterialRule = async () => {
    setLoading(true);
    try {
      const data = {
        material: materialRuleForm.material,
        trade: materialRuleForm.trade,
        unitCost: parseFloat(materialRuleForm.unitCost),
        laborHours: parseFloat(materialRuleForm.laborHours),
        wasteFactor: parseFloat(materialRuleForm.wasteFactor) || 0,
        active: true,
      };

      if (editingRule) {
        await axios.put(`${API_URL}/admin/material-rules/${editingRule.id}`, data);
      } else {
        await axios.post(`${API_URL}/admin/material-rules`, data);
      }
      setMaterialRuleDialog(false);
      loadMaterialRules();
    } catch (error) {
      console.error('Failed to save material rule:', error);
      alert('Failed to save material rule');
    } finally {
      setLoading(false);
    }
  };

  // Trade Markup handlers
  const saveTradeMarkup = async (trade: string) => {
    const markup = parseFloat(markupForm[trade] || '0');
    if (isNaN(markup)) return;

    setLoading(true);
    try {
      await axios.post(`${API_URL}/admin/trade-markups`, { trade, markup });
      loadTradeMarkups();
    } catch (error) {
      console.error('Failed to save trade markup:', error);
      alert('Failed to save trade markup');
    } finally {
      setLoading(false);
    }
  };

  // Vendor handlers
  const openVendorDialog = (vendor?: any) => {
    if (vendor) {
      setEditingVendor(vendor);
      setVendorType(vendor.type || 'MATERIAL_SUPPLIER');
      
      // Get material IDs from material names
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
        
        // Supplier fields
        alternates: vendor.alternates?.join(', ') || '',
        isRequired: vendor.isRequired || false,
        requiredFor: vendor.requiredFor?.join(', ') || '',
        
        // Contractor fields
        services: vendor.services?.join(', ') || '',
        crewSize: vendor.crewSize?.toString() || '',
        equipmentList: vendor.equipmentList?.join(', ') || '',
        certifications: vendor.certifications?.join(', ') || '',
        insurance: vendor.insurance ? JSON.stringify(vendor.insurance) : '',
        
        // Common fields
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
      // Get material names from selected IDs
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

      // Add supplier-specific fields
      const supplierData = (vendorType === 'MATERIAL_SUPPLIER' || vendorType === 'BOTH') ? {
        materials: materialNames,
        alternates: vendorForm.alternates.split(',').map(a => a.trim()).filter(Boolean),
        isRequired: vendorForm.isRequired,
        requiredFor: vendorForm.requiredFor.split(',').map(r => r.trim()).filter(Boolean),
      } : {};

      // Add contractor-specific fields
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

  // Email Template handlers
  const openTemplateDialog = (template?: any) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateForm({
        type: template.type || 'RFQ',
        subject: template.subject || '',
        body: template.body || '',
      });
    } else {
      setEditingTemplate(null);
      setTemplateForm({
        type: 'RFQ',
        subject: '',
        body: '',
      });
    }
    setTemplateDialog(true);
  };

  const saveEmailTemplate = async () => {
    setLoading(true);
    try {
      const data = {
        type: templateForm.type,
        subject: templateForm.subject,
        body: templateForm.body,
        active: true,
      };

      if (editingTemplate) {
        await axios.put(`${API_URL}/admin/email-templates/${editingTemplate.id}`, data);
      } else {
        await axios.post(`${API_URL}/admin/email-templates`, data);
      }
      setTemplateDialog(false);
      loadEmailTemplates();
    } catch (error) {
      console.error('Failed to save email template:', error);
      alert('Failed to save email template');
    } finally {
      setLoading(false);
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
        label: `${m.name} (${m.trade}) - ${m.category || 'No category'}`,
      })));
    } catch (error) {
      console.error('Failed to search materials:', error);
    }
  };

  const handleAddNewMaterial = async (materialName: string) => {
    try {
      // Create a basic material entry
      const response = await axios.post(`${API_URL}/materials`, {
        name: materialName,
        trade: 'A', // Default to Architectural
        description: materialName,
        active: true,
      });
      loadAllMaterials();
      setSelectedMaterialIds([...selectedMaterialIds, response.data.id]);
    } catch (error) {
      console.error('Failed to add material:', error);
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
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Admin Center</h1>
          <p className="text-muted-foreground mt-2">Configure system settings and rules</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="materials">
              <Package className="w-4 h-4 mr-2" />
              Materials
            </TabsTrigger>
            <TabsTrigger value="material-rules">
              <DollarSign className="w-4 h-4 mr-2" />
              Rules
            </TabsTrigger>
            <TabsTrigger value="trade-markups">
              <Percent className="w-4 h-4 mr-2" />
              Markups
            </TabsTrigger>
            <TabsTrigger value="vendors">
              <Users className="w-4 h-4 mr-2" />
              Vendors
            </TabsTrigger>
            <TabsTrigger value="email-templates">
              <Mail className="w-4 h-4 mr-2" />
              Templates
            </TabsTrigger>
          </TabsList>

          {/* Materials Database Tab */}
          <TabsContent value="materials" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Materials Database</CardTitle>
                    <CardDescription>
                      All materials from imported projects ({allMaterials.length} materials)
                    </CardDescription>
                  </div>
                  <Button variant="outline" onClick={loadAllMaterials}>
                    <Loader2 className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material Name</TableHead>
                      <TableHead>Trade</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Times Used</TableHead>
                      <TableHead>Suppliers</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allMaterials.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No materials yet. Import a project to auto-populate materials.
                        </TableCell>
                      </TableRow>
                    ) : (
                      allMaterials.slice(0, 100).map((material) => (
                        <TableRow key={material.id} className="cursor-pointer hover:bg-muted/50">
                          <TableCell className="font-medium">{material.name}</TableCell>
                          <TableCell><Badge>{material.trade}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{material.category || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{material.timesUsed || 0}x</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {material.commonSuppliers?.length || 0} vendors
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => viewMaterialDetails(material.id)}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {allMaterials.length > 100 && (
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    Showing first 100 of {allMaterials.length} materials
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Material Rules Tab - UNCHANGED */}
          <TabsContent value="material-rules" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Material Rules</CardTitle>
                    <CardDescription>Configure cost per unit and labor rates for materials</CardDescription>
                  </div>
                  <Button onClick={() => openMaterialRuleDialog()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Rule
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Trade</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Labor Hours</TableHead>
                      <TableHead>Waste Factor</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materialRules.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No material rules configured. Click "Add Rule" to create one.
                        </TableCell>
                      </TableRow>
                    ) : (
                      materialRules.map((rule) => (
                        <TableRow key={rule.id}>
                          <TableCell className="font-medium">{rule.material}</TableCell>
                          <TableCell><Badge>{rule.trade}</Badge></TableCell>
                          <TableCell>${rule.unitCost?.toFixed(2)}</TableCell>
                          <TableCell>{rule.laborHours?.toFixed(2)} hrs</TableCell>
                          <TableCell>{(rule.wasteFactor * 100)?.toFixed(1)}%</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => openMaterialRuleDialog(rule)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trade Markups Tab - UNCHANGED */}
          <TabsContent value="trade-markups" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Trade Markups</CardTitle>
                <CardDescription>Set markup percentages by trade</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Trade</TableHead>
                      <TableHead>Markup %</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trades.map((trade) => {
                      const existing = tradeMarkups.find(tm => tm.trade === trade);
                      return (
                        <TableRow key={trade}>
                          <TableCell className="font-medium">{tradeLabels[trade] || trade}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                step="0.1"
                                value={markupForm[trade] || existing?.markup || '0'}
                                onChange={(e) => setMarkupForm({ ...markupForm, [trade]: e.target.value })}
                                className="w-24"
                              />
                              <span className="text-muted-foreground">%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => saveTradeMarkup(trade)}
                              disabled={loading}
                            >
                              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vendors Tab - Updated with Material Multi-Select */}
          <TabsContent value="vendors" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Vendor Management</CardTitle>
                    <CardDescription>Manage suppliers and subcontractors</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline">
                      <Upload className="w-4 h-4 mr-2" />
                      Bulk Import
                    </Button>
                    <Button onClick={() => openVendorDialog()}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Vendor
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Trades</TableHead>
                      <TableHead>Materials/Services</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendors.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No vendors found. Click "Add Vendor" to create one.
                        </TableCell>
                      </TableRow>
                    ) : (
                      vendors.map((vendor) => (
                        <TableRow key={vendor.id}>
                          <TableCell className="font-medium">{vendor.name}</TableCell>
                          <TableCell>{getVendorTypeBadge(vendor.type)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {vendor.email || vendor.phone || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {vendor.trades?.slice(0, 2).map((trade: string) => (
                                <Badge key={trade} variant="secondary" className="text-xs">{trade}</Badge>
                              ))}
                              {vendor.trades?.length > 2 && (
                                <Badge variant="secondary" className="text-xs">+{vendor.trades.length - 2}</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {vendor.type === 'MATERIAL_SUPPLIER' || vendor.type === 'BOTH' 
                              ? `${vendor.materials?.length || 0} materials`
                              : `${vendor.services?.length || 0} services`}
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Templates Tab - UNCHANGED */}
          <TabsContent value="email-templates" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Email Templates</CardTitle>
                    <CardDescription>Customize RFQ, award, and non-award email templates</CardDescription>
                  </div>
                  <Button onClick={() => openTemplateDialog()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Template
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Preview</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emailTemplates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No email templates configured. Click "Add Template" to create one.
                        </TableCell>
                      </TableRow>
                    ) : (
                      emailTemplates.map((template) => (
                        <TableRow key={template.id}>
                          <TableCell><Badge>{template.type}</Badge></TableCell>
                          <TableCell className="font-medium">{template.subject}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {template.body?.substring(0, 50)}...
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => openTemplateDialog(template)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Material View Dialog */}
        <Dialog open={materialViewDialog} onOpenChange={setMaterialViewDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedMaterialForView?.name}</DialogTitle>
              <DialogDescription>
                Material details and vendor information
              </DialogDescription>
            </DialogHeader>
            {selectedMaterialForView && (
              <div className="grid gap-6 py-4">
                {/* Material Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Trade</Label>
                    <div><Badge>{selectedMaterialForView.trade}</Badge></div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Category</Label>
                    <div className="text-sm">{selectedMaterialForView.category || 'N/A'}</div>
                  </div>
                  {selectedMaterialForView.sku && (
                    <div>
                      <Label className="text-muted-foreground">SKU</Label>
                      <div className="text-sm font-mono">{selectedMaterialForView.sku}</div>
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground">Times Used</Label>
                    <div className="text-sm">{selectedMaterialForView.timesUsed || 0} projects</div>
                  </div>
                </div>

                {/* Specifications */}
                {selectedMaterialForView.specs && (
                  <div>
                    <Label className="text-muted-foreground mb-2 block">Specifications</Label>
                    <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-40">
                      {JSON.stringify(selectedMaterialForView.specs, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Suppliers */}
                <div>
                  <Label className="mb-2 block">Vendors That Supply This Material</Label>
                  {selectedMaterialForView.suppliers?.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No vendors configured for this material yet.</p>
                  ) : (
                    <div className="grid gap-2">
                      {selectedMaterialForView.suppliers?.map((vendor: any) => (
                        <Card key={vendor.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold">{vendor.name}</h4>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                  {getVendorTypeBadge(vendor.type)}
                                  {vendor.rating && (
                                    <span>★ {vendor.rating.toFixed(1)}</span>
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
                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="matUnitCost">Unit Cost ($)</Label>
                      <Input
                        id="matUnitCost"
                        type="number"
                        step="0.01"
                        defaultValue={selectedMaterialForView.unitCost || ''}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="matLaborHours">Labor Hours</Label>
                      <Input
                        id="matLaborHours"
                        type="number"
                        step="0.01"
                        defaultValue={selectedMaterialForView.laborHours || ''}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="matWasteFactor">Waste Factor (%)</Label>
                      <Input
                        id="matWasteFactor"
                        type="number"
                        step="0.1"
                        defaultValue={(selectedMaterialForView.wasteFactor * 100) || '7'}
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

        {/* Material Rule Dialog - UNCHANGED */}
        <Dialog open={materialRuleDialog} onOpenChange={setMaterialRuleDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingRule ? 'Edit' : 'Create'} Material Rule</DialogTitle>
              <DialogDescription>
                Configure cost per unit and labor rates for materials
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="material">Material Name</Label>
                <Input
                  id="material"
                  value={materialRuleForm.material}
                  onChange={(e) => setMaterialRuleForm({ ...materialRuleForm, material: e.target.value })}
                  placeholder="e.g., 2x4 Stud, Drywall Sheet"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="trade">Trade</Label>
                  <Input
                    id="trade"
                    value={materialRuleForm.trade}
                    onChange={(e) => setMaterialRuleForm({ ...materialRuleForm, trade: e.target.value })}
                    placeholder="M, E, P, A"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="unitCost">Unit Cost ($)</Label>
                  <Input
                    id="unitCost"
                    type="number"
                    step="0.01"
                    value={materialRuleForm.unitCost}
                    onChange={(e) => setMaterialRuleForm({ ...materialRuleForm, unitCost: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="laborHours">Labor Hours</Label>
                  <Input
                    id="laborHours"
                    type="number"
                    step="0.01"
                    value={materialRuleForm.laborHours}
                    onChange={(e) => setMaterialRuleForm({ ...materialRuleForm, laborHours: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="wasteFactor">Waste Factor (%)</Label>
                  <Input
                    id="wasteFactor"
                    type="number"
                    step="0.1"
                    value={materialRuleForm.wasteFactor}
                    onChange={(e) => setMaterialRuleForm({ ...materialRuleForm, wasteFactor: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMaterialRuleDialog(false)}>
                Cancel
              </Button>
              <Button onClick={saveMaterialRule} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {editingRule ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Vendor Dialog - WITH MATERIAL MULTI-SELECT */}
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

              {/* Basic Information */}
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

        {/* Email Template Dialog - UNCHANGED */}
        <Dialog open={templateDialog} onOpenChange={setTemplateDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? 'Edit' : 'Create'} Email Template</DialogTitle>
              <DialogDescription>
                Customize email templates for RFQ, awards, and non-awards
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="templateType">Template Type</Label>
                <select
                  id="templateType"
                  value={templateForm.type}
                  onChange={(e) => setTemplateForm({ ...templateForm, type: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="RFQ">RFQ</option>
                  <option value="AWARD">Award</option>
                  <option value="NON_AWARD">Non-Award</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="templateSubject">Subject</Label>
                <Input
                  id="templateSubject"
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                  placeholder="Email subject line"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="templateBody">Body</Label>
                <Textarea
                  id="templateBody"
                  value={templateForm.body}
                  onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
                  rows={12}
                  placeholder="Email body content. Use {{variable}} for placeholders."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTemplateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={saveEmailTemplate} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {editingTemplate ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}