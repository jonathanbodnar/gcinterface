import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DollarSign, Percent, Plus, Edit2, Loader2, Save } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function RulesMarkups() {
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
  const [loading, setLoading] = useState(false);

  const trades = ['M', 'E', 'P', 'A', 'S', 'F'];
  const tradeLabels: Record<string, string> = {
    M: 'Mechanical',
    E: 'Electrical',
    P: 'Plumbing',
    A: 'Architectural',
    S: 'Structural',
    F: 'Fire Protection',
  };

  useEffect(() => {
    loadMaterialRules();
    loadTradeMarkups();
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

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Rules & Markups</h1>
          <p className="text-muted-foreground mt-2">Configure material rules and trade markups</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="material-rules">
              <DollarSign className="w-4 h-4 mr-2" />
              Material Rules
            </TabsTrigger>
            <TabsTrigger value="trade-markups">
              <Percent className="w-4 h-4 mr-2" />
              Trade Markups
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
                      <TableHead>Description</TableHead>
                      <TableHead>Markup %</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trades.map((trade) => {
                      const existing = tradeMarkups.find(tm => tm.trade === trade);
                      return (
                        <TableRow key={trade}>
                          <TableCell><Badge>{trade}</Badge></TableCell>
                          <TableCell className="font-medium">{tradeLabels[trade]}</TableCell>
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
                <Label htmlFor="material">Material Name/Pattern</Label>
                <Input
                  id="material"
                  value={materialRuleForm.material}
                  onChange={(e) => setMaterialRuleForm({ ...materialRuleForm, material: e.target.value })}
                  placeholder="e.g., 2x4 Stud, Drywall Sheet, or pattern like '2x*'"
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
                  <Label htmlFor="laborHours">Labor Hours per Unit</Label>
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
      </div>
    </Layout>
  );
}
