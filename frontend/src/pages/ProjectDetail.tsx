import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Package, DollarSign, Users, Activity, FileText, Loader2, TrendingUp, AlertCircle, Trophy } from 'lucide-react';
import axios from 'axios';
import { cn } from '@/lib/utils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [bom, setBom] = useState<any>(null);
  const [labor, setLabor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bom');
  const [editStatusDialog, setEditStatusDialog] = useState(false);
  const [statusForm, setStatusForm] = useState({
    projectOutcome: 'PENDING',
    dueDate: '',
    awardedAmount: '',
    lostReason: '',
    currentStage: 'COLLECTING_BIDS',
  });

  useEffect(() => {
    loadProjectData();
  }, [id]);

  const loadProjectData = async () => {
    setLoading(true);
    try {
      // Load project details
      const projectResponse = await axios.get(`${API_URL}/projects/${id}`);
      setProject(projectResponse.data.project);

      // Load BOM
      const bomResponse = await axios.get(`${API_URL}/bom?projectId=${id}`);
      setBom(bomResponse.data);

      // Load labor
      try {
        const laborResponse = await axios.get(`${API_URL}/labor/calculate/${id}`);
        setLabor(laborResponse.data);
      } catch (error) {
        console.log('Labor not available yet');
      }
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      SCOPE_DIAGNOSIS: 'bg-yellow-100 text-yellow-800',
      BOM_GENERATION: 'bg-blue-100 text-blue-800',
      VENDOR_MATCHING: 'bg-purple-100 text-purple-800',
      RFQ_SENT: 'bg-indigo-100 text-indigo-800',
      QUOTE_COMPARISON: 'bg-pink-100 text-pink-800',
      AWARD_PENDING: 'bg-orange-100 text-orange-800',
      AWARDED: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
          <p className="text-lg font-semibold">Project not found</p>
          <Button className="mt-4" onClick={() => navigate('/projects')}>
            Back to Projects
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
          <Button variant="ghost" size="sm" onClick={() => navigate('/projects')} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">{project.name}</h1>
              <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                <span>{project.location}</span>
                {project.totalSF && <span>• {project.totalSF.toLocaleString()} SF</span>}
                {project.clientName && <span>• {project.clientName}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={cn('text-sm', getStatusColor(project.status))}>
                {project.status?.replace('_', ' ')}
              </Badge>
              {project.projectOutcome && (
                <Badge variant={project.projectOutcome === 'AWARDED' ? 'default' : project.projectOutcome === 'LOST' ? 'secondary' : 'outline'}>
                  {project.projectOutcome}
                </Badge>
              )}
              <Button size="sm" variant="outline" onClick={() => {
                setStatusForm({
                  projectOutcome: project.projectOutcome || 'PENDING',
                  dueDate: project.dueDate || '',
                  awardedAmount: project.awardedAmount?.toString() || '',
                  lostReason: project.lostReason || '',
                  currentStage: project.currentStage || 'COLLECTING_BIDS',
                });
                setEditStatusDialog(true);
              }}>
                Update Status
              </Button>
            </div>
          </div>
        </div>

        {/* Project Status Info Bar */}
        {(project.dueDate || project.currentStage || project.rfqsSent > 0) && (
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-4 gap-4 text-sm">
                {project.dueDate && (
                  <div>
                    <p className="text-muted-foreground">Due Date</p>
                    <p className="font-semibold">{new Date(project.dueDate).toLocaleDateString()}</p>
                  </div>
                )}
                {project.currentStage && (
                  <div>
                    <p className="text-muted-foreground">Current Stage</p>
                    <p className="font-semibold">{project.currentStage.replace('_', ' ')}</p>
                  </div>
                )}
                {project.rfqsSent > 0 && (
                  <div>
                    <p className="text-muted-foreground">RFQs Sent / Quotes Received</p>
                    <p className="font-semibold">{project.rfqsSent} / {project.quotesReceived || 0}</p>
                    {project.responseRate !== null && (
                      <p className="text-xs text-muted-foreground">{project.responseRate.toFixed(0)}% response rate</p>
                    )}
                  </div>
                )}
                {project.awardedAmount && (
                  <div>
                    <p className="text-muted-foreground">Awarded Amount</p>
                    <p className="font-semibold text-green-600">${project.awardedAmount.toLocaleString()}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">{bom?.summary?.totalItems || 0}</div>
                  <p className="text-xs text-muted-foreground">BOM Items</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-green-600" />
                <div>
                  <div className="text-2xl font-bold">
                    ${(bom?.summary?.totalCost || 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">Estimated Cost</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold">
                    {(bom?.summary?.averageConfidence * 100 || 0).toFixed(0)}%
                  </div>
                  <p className="text-xs text-muted-foreground">Confidence</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-orange-600" />
                <div>
                  <div className="text-2xl font-bold">
                    {Object.keys(bom?.summary?.byTrade || {}).length}
                  </div>
                  <p className="text-xs text-muted-foreground">Trades</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <Button onClick={() => navigate(`/projects/${id}/plans`)}>
                <FileText className="w-4 h-4 mr-2" />
                View Plans
              </Button>
              <Button onClick={() => navigate(`/vendor-matching/${id}`)}>
                <Users className="w-4 h-4 mr-2" />
                Match Vendors
              </Button>
              <Button variant="outline" onClick={() => navigate(`/rfq/${id}`)}>
                Manage RFQs
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                Export to PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="bom">
              <Package className="w-4 h-4 mr-2" />
              Bill of Materials
            </TabsTrigger>
            <TabsTrigger value="labor">
              <DollarSign className="w-4 h-4 mr-2" />
              Labor & Costs
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Activity className="w-4 h-4 mr-2" />
              Activity
            </TabsTrigger>
          </TabsList>

          {/* BOM Tab */}
          <TabsContent value="bom" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Bill of Materials</CardTitle>
                    <CardDescription>
                      {bom?.summary?.totalItems || 0} items • Avg confidence: {(bom?.summary?.averageConfidence * 100 || 0).toFixed(0)}%
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    Regenerate BOM
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {bom?.items?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No BOM items yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>CSI</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Trade</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead>UOM</TableHead>
                        <TableHead className="text-right">Unit Cost</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Confidence</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bom?.items?.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-xs">{item.csiDivision}</TableCell>
                          <TableCell className="font-medium">{item.description}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.material?.trade || 'N/A'}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{item.finalQty?.toFixed(2)}</TableCell>
                          <TableCell>{item.uom}</TableCell>
                          <TableCell className="text-right">
                            {item.unitCost ? `$${item.unitCost.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {item.totalCost ? `$${item.totalCost.toLocaleString()}` : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 bg-secondary rounded-full h-2">
                                <div
                                  className={cn(
                                    "h-2 rounded-full",
                                    item.confidence >= 0.9 ? "bg-green-600" :
                                    item.confidence >= 0.8 ? "bg-blue-600" :
                                    "bg-yellow-600"
                                  )}
                                  style={{ width: `${(item.confidence || 0) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-10">
                                {((item.confidence || 0) * 100).toFixed(0)}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* BOM Summary by Trade */}
            {bom?.summary?.byTrade && Object.keys(bom.summary.byTrade).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Summary by Trade</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    {Object.entries(bom.summary.byTrade).map(([trade, data]: [string, any]) => (
                      <Card key={trade}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <Badge>{trade}</Badge>
                              <p className="text-2xl font-bold mt-2">
                                ${data.totalCost?.toLocaleString() || 0}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {data.items} items
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Labor Tab */}
          <TabsContent value="labor" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Labor Breakdown</CardTitle>
                <CardDescription>Estimated labor hours and costs by trade</CardDescription>
              </CardHeader>
              <CardContent>
                {!labor ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <DollarSign className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Labor calculation not available yet</p>
                    <Button variant="outline" className="mt-4" onClick={loadProjectData}>
                      Calculate Labor
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Trade</TableHead>
                          <TableHead className="text-right">Labor Hours</TableHead>
                          <TableHead className="text-right">Labor Cost</TableHead>
                          <TableHead className="text-right">Material Cost</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {labor.breakdown?.map((trade: any) => (
                          <TableRow key={trade.trade}>
                            <TableCell><Badge>{trade.trade}</Badge></TableCell>
                            <TableCell className="text-right">{trade.laborHours?.toFixed(2)} hrs</TableCell>
                            <TableCell className="text-right">${trade.laborCost?.toLocaleString()}</TableCell>
                            <TableCell className="text-right">${trade.materialCost?.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-semibold">
                              ${trade.totalCost?.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="bg-muted p-4 rounded-lg">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Labor Hours</p>
                          <p className="text-2xl font-bold">{labor.summary?.totalLaborHours?.toFixed(0)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Labor Cost</p>
                          <p className="text-2xl font-bold">${labor.summary?.totalLaborCost?.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Grand Total</p>
                          <p className="text-2xl font-bold">${labor.summary?.grandTotal?.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Activity</CardTitle>
                <CardDescription>Timeline of project events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 border-l-2 border-primary pl-4 py-2">
                    <Activity className="w-5 h-5 text-primary mt-1" />
                    <div>
                      <p className="font-semibold">Project Created</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(project.createdAt).toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Created by {project.createdBy?.name || 'System'}
                      </p>
                    </div>
                  </div>
                  {bom?.items?.length > 0 && (
                    <div className="flex items-start gap-4 border-l-2 border-blue-600 pl-4 py-2">
                      <Package className="w-5 h-5 text-blue-600 mt-1" />
                      <div>
                        <p className="font-semibold">BOM Generated</p>
                        <p className="text-sm text-muted-foreground">
                          {bom.items.length} items • ${bom.summary.totalCost.toLocaleString()} total
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Status Dialog */}
        <Dialog open={editStatusDialog} onOpenChange={setEditStatusDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Update Project Status</DialogTitle>
              <DialogDescription>Set outcome, stage, and timeline</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Project Outcome</Label>
                  <select
                    value={statusForm.projectOutcome}
                    onChange={(e) => setStatusForm({ ...statusForm, projectOutcome: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="AWARDED">Awarded</option>
                    <option value="LOST">Lost</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label>Current Stage</Label>
                  <select
                    value={statusForm.currentStage}
                    onChange={(e) => setStatusForm({ ...statusForm, currentStage: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="COLLECTING_BIDS">Collecting Bids</option>
                    <option value="REVIEWING_BIDS">Reviewing Bids</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="ON_HOLD">On Hold</option>
                  </select>
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={statusForm.dueDate}
                  onChange={(e) => setStatusForm({ ...statusForm, dueDate: e.target.value })}
                />
              </div>

              {statusForm.projectOutcome === 'AWARDED' && (
                <div className="grid gap-2">
                  <Label>Awarded Amount ($)</Label>
                  <Input
                    type="number"
                    value={statusForm.awardedAmount}
                    onChange={(e) => setStatusForm({ ...statusForm, awardedAmount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              )}

              {statusForm.projectOutcome === 'LOST' && (
                <div className="grid gap-2">
                  <Label>Reason Lost</Label>
                  <Textarea
                    value={statusForm.lostReason}
                    onChange={(e) => setStatusForm({ ...statusForm, lostReason: e.target.value })}
                    placeholder="Pricing too high, schedule conflict, etc."
                    rows={3}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditStatusDialog(false)}>
                Cancel
              </Button>
              <Button onClick={async () => {
                try {
                  await axios.put(`${API_URL}/projects/${id}`, {
                    projectOutcome: statusForm.projectOutcome,
                    dueDate: statusForm.dueDate || null,
                    awardedAmount: statusForm.awardedAmount ? parseFloat(statusForm.awardedAmount) : null,
                    lostReason: statusForm.lostReason || null,
                    currentStage: statusForm.currentStage,
                  });
                  setEditStatusDialog(false);
                  loadProjectData();
                } catch (error) {
                  console.error('Failed to update status:', error);
                  alert('Failed to update status');
                }
              }}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
