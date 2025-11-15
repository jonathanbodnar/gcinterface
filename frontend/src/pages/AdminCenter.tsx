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
import { DollarSign, Percent, Users, Mail, Plus, Edit2, Upload, Loader2, Save } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function AdminCenter() {
  const [activeTab, setActiveTab] = useState('material-rules');
  
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
  const [vendorForm, setVendorForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    trades: '',
    materials: '',
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
    loadMaterialRules();
    loadTradeMarkups();
    loadVendors();
    loadEmailTemplates();
  }, []);

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
      setVendorForm({
        name: vendor.name || '',
        email: vendor.email || '',
        phone: vendor.phone || '',
        address: vendor.address || '',
        trades: vendor.trades?.join(', ') || '',
        materials: vendor.materials?.join(', ') || '',
      });
    } else {
      setEditingVendor(null);
      setVendorForm({
        name: '',
        email: '',
        phone: '',
        address: '',
        trades: '',
        materials: '',
      });
    }
    setVendorDialog(true);
  };

  const saveVendor = async () => {
    setLoading(true);
    try {
      const data = {
        name: vendorForm.name,
        email: vendorForm.email,
        phone: vendorForm.phone,
        address: vendorForm.address,
        trades: vendorForm.trades.split(',').map(t => t.trim()).filter(Boolean),
        materials: vendorForm.materials.split(',').map(m => m.trim()).filter(Boolean),
        active: true,
      };

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
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Admin Center</h1>
          <p className="text-muted-foreground mt-2">Configure system settings and rules</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="material-rules">
              <DollarSign className="w-4 h-4 mr-2" />
              Material Rules
            </TabsTrigger>
            <TabsTrigger value="trade-markups">
              <Percent className="w-4 h-4 mr-2" />
              Trade Markups
            </TabsTrigger>
            <TabsTrigger value="vendors">
              <Users className="w-4 h-4 mr-2" />
              Vendors
            </TabsTrigger>
            <TabsTrigger value="email-templates">
              <Mail className="w-4 h-4 mr-2" />
              Email Templates
            </TabsTrigger>
          </TabsList>

          {/* Material Rules Tab */}
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

          {/* Trade Markups Tab */}
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

          {/* Vendors Tab */}
          <TabsContent value="vendors" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Vendor Management</CardTitle>
                    <CardDescription>Manage vendors and subcontractors</CardDescription>
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
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Trades</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendors.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No vendors found. Click "Add Vendor" to create one.
                        </TableCell>
                      </TableRow>
                    ) : (
                      vendors.map((vendor) => (
                        <TableRow key={vendor.id}>
                          <TableCell className="font-medium">{vendor.name}</TableCell>
                          <TableCell>{vendor.email}</TableCell>
                          <TableCell>{vendor.phone}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {vendor.trades?.slice(0, 3).map((trade: string) => (
                                <Badge key={trade} variant="secondary">{trade}</Badge>
                              ))}
                              {vendor.trades?.length > 3 && (
                                <Badge variant="secondary">+{vendor.trades.length - 3}</Badge>
                              )}
                            </div>
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

          {/* Email Templates Tab */}
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

        {/* Material Rule Dialog */}
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

        {/* Vendor Dialog */}
        <Dialog open={vendorDialog} onOpenChange={setVendorDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingVendor ? 'Edit' : 'Create'} Vendor</DialogTitle>
              <DialogDescription>
                Add or update vendor information
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="vendorName">Vendor Name</Label>
                <Input
                  id="vendorName"
                  value={vendorForm.name}
                  onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="vendorEmail">Email</Label>
                  <Input
                    id="vendorEmail"
                    type="email"
                    value={vendorForm.email}
                    onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="vendorPhone">Phone</Label>
                  <Input
                    id="vendorPhone"
                    value={vendorForm.phone}
                    onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vendorAddress">Address</Label>
                <Input
                  id="vendorAddress"
                  value={vendorForm.address}
                  onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
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
                  <Label htmlFor="vendorMaterials">Materials (comma-separated)</Label>
                  <Input
                    id="vendorMaterials"
                    value={vendorForm.materials}
                    onChange={(e) => setVendorForm({ ...vendorForm, materials: e.target.value })}
                    placeholder="Drywall, Studs, Paint"
                  />
                </div>
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

        {/* Email Template Dialog */}
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