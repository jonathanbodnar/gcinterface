import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, ArrowLeft, Plus, Mail, Send, Loader2, CheckCircle2, Clock, XCircle, Calendar } from 'lucide-react';
import axios from 'axios';
import { cn } from '@/lib/utils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function RFQManagement() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<any[]>([]);
  const [bomItems, setBomItems] = useState<any[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [createDialog, setCreateDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState(false);
  const [selectedRFQ, setSelectedRFQ] = useState<any>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load RFQs
      const rfqResponse = await axios.get(`${API_URL}/rfq?projectId=${projectId}`);
      setRfqs(rfqResponse.data || []);

      // Load BOM items
      const bomResponse = await axios.get(`${API_URL}/bom?projectId=${projectId}`);
      setBomItems(bomResponse.data.items || []);

      // Load selected vendors from project
      try {
        const vendorsResponse = await axios.get(`${API_URL}/projects/${projectId}/selected-vendors`);
        setSelectedVendors(vendorsResponse.data.vendors || []);
      } catch (error) {
        console.log('No selected vendors yet');
      }
    } catch (error) {
      console.error('Failed to load RFQ data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setSelectedMaterials(new Set());
    setCreateDialog(true);
  };

  const toggleMaterial = (materialId: string) => {
    const newSelected = new Set(selectedMaterials);
    if (newSelected.has(materialId)) {
      newSelected.delete(materialId);
    } else {
      newSelected.add(materialId);
    }
    setSelectedMaterials(newSelected);
  };

  const createRFQsForVendors = async () => {
    if (selectedVendors.length === 0) {
      alert('No vendors selected. Please go to Vendor Matching first.');
      return;
    }

    const materialIds = Array.from(selectedMaterials);
    if (materialIds.length === 0) {
      alert('Please select at least one material');
      return;
    }

    setLoading(true);
    try {
      // Create RFQ for each selected vendor
      for (const vendor of selectedVendors) {
        await axios.post(`${API_URL}/rfq/create`, {
          projectId,
          vendorId: vendor.id,
          materialIds,
        });
      }
      
      alert(`Created ${selectedVendors.length} RFQ(s) successfully`);
      setCreateDialog(false);
      loadData();
    } catch (error) {
      console.error('Failed to create RFQs:', error);
      alert('Failed to create RFQs');
    } finally {
      setLoading(false);
    }
  };

  const viewRFQDetails = async (rfqId: string) => {
    try {
      const response = await axios.get(`${API_URL}/rfq/${rfqId}`);
      setSelectedRFQ(response.data);
      setDetailDialog(true);
    } catch (error) {
      console.error('Failed to load RFQ details:', error);
    }
  };

  const sendRFQ = async (rfqId: string) => {
    setSending(true);
    try {
      await axios.post(`${API_URL}/rfq/${rfqId}/send`);
      alert('RFQ sent successfully!');
      loadData();
      setDetailDialog(false);
    } catch (error) {
      console.error('Failed to send RFQ:', error);
      alert('Failed to send RFQ');
    } finally {
      setSending(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'SENT':
        return <Send className="w-4 h-4 text-blue-600" />;
      case 'RESPONDED':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'EXPIRED':
      case 'CANCELLED':
        return <XCircle className="w-4 h-4 text-gray-600" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'secondary';
      case 'SENT':
        return 'default';
      case 'RESPONDED':
        return 'default';
      default:
        return 'outline';
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${projectId}`)} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Project
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">RFQ Management</h1>
              <p className="text-muted-foreground mt-2">Create and track requests for quotes</p>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Create RFQs
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{rfqs.length}</div>
              <p className="text-xs text-muted-foreground">Total RFQs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{rfqs.filter(r => r.status === 'SENT').length}</div>
              <p className="text-xs text-muted-foreground">Sent</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{rfqs.filter(r => r.status === 'RESPONDED').length}</div>
              <p className="text-xs text-muted-foreground">Responded</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{rfqs.filter(r => r.status === 'DRAFT').length}</div>
              <p className="text-xs text-muted-foreground">Drafts</p>
            </CardContent>
          </Card>
        </div>

        {/* RFQs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Request for Quotes</CardTitle>
            <CardDescription>All RFQs for this project</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : rfqs.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-4">No RFQs created yet</p>
                <Button onClick={openCreateDialog}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First RFQ
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>RFQ Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rfqs.map((rfq) => (
                    <TableRow key={rfq.id} className="cursor-pointer" onClick={() => viewRFQDetails(rfq.id)}>
                      <TableCell className="font-mono text-sm">{rfq.rfqNumber}</TableCell>
                      <TableCell className="font-medium">{rfq.vendor?.name}</TableCell>
                      <TableCell>{rfq._count?.items || 0} items</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(rfq.status) as any} className="gap-1">
                          {getStatusIcon(rfq.status)}
                          {rfq.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {rfq.sentAt ? new Date(rfq.sentAt).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {rfq.dueDate ? new Date(rfq.dueDate).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {rfq.status === 'DRAFT' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              sendRFQ(rfq.id);
                            }}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Send
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create RFQ Dialog */}
        <Dialog open={createDialog} onOpenChange={setCreateDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create RFQs</DialogTitle>
              <DialogDescription>
                Select materials to include in the RFQs. One RFQ will be created for each selected vendor.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              {selectedVendors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No vendors selected for this project.</p>
                  <Button variant="outline" className="mt-4" onClick={() => navigate(`/vendor-matching/${projectId}`)}>
                    Go to Vendor Matching
                  </Button>
                </div>
              ) : (
                <>
                  <div>
                    <Label className="text-base font-semibold mb-3 block">
                      Selected Vendors ({selectedVendors.length})
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedVendors.map((vendor) => (
                        <Badge key={vendor.id} variant="secondary">
                          {vendor.name}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {selectedVendors.length} RFQ{selectedVendors.length !== 1 ? 's' : ''} will be created
                    </p>
                  </div>

                  <div>
                    <Label className="text-base font-semibold mb-3 block">
                      Select Materials to Include
                    </Label>
                    <div className="border rounded-md max-h-96 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Trade</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead>UOM</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bomItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <input
                                  type="checkbox"
                                  checked={selectedMaterials.has(item.id)}
                                  onChange={() => toggleMaterial(item.id)}
                                  className="w-4 h-4 rounded"
                                />
                              </TableCell>
                              <TableCell className="font-medium">{item.description}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{item.material?.trade || 'N/A'}</Badge>
                              </TableCell>
                              <TableCell className="text-right">{item.finalQty?.toFixed(2)}</TableCell>
                              <TableCell>{item.uom}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-sm text-muted-foreground">
                        {selectedMaterials.size} of {bomItems.length} materials selected
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedMaterials(new Set())}
                        >
                          Clear All
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedMaterials(new Set(bomItems.map(i => i.id)))}
                        >
                          Select All
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={createRFQsForVendors}
                disabled={loading || selectedMaterials.size === 0 || selectedVendors.length === 0}
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Create {selectedVendors.length} RFQ{selectedVendors.length !== 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* RFQ Detail Dialog */}
        <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>RFQ Details: {selectedRFQ?.rfqNumber}</DialogTitle>
              <DialogDescription>
                {selectedRFQ?.vendor?.name}
              </DialogDescription>
            </DialogHeader>
            {selectedRFQ && (
              <div className="grid gap-6 py-4">
                {/* RFQ Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Vendor</Label>
                    <div className="font-medium">{selectedRFQ.vendor?.name}</div>
                    <div className="text-sm text-muted-foreground">{selectedRFQ.vendor?.email}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div>
                      <Badge variant={getStatusVariant(selectedRFQ.status) as any} className="gap-1 mt-1">
                        {getStatusIcon(selectedRFQ.status)}
                        {selectedRFQ.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Sent Date</Label>
                    <div className="text-sm">
                      {selectedRFQ.sentAt ? new Date(selectedRFQ.sentAt).toLocaleString() : 'Not sent yet'}
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Due Date</Label>
                    <div className="text-sm">
                      {selectedRFQ.dueDate ? new Date(selectedRFQ.dueDate).toLocaleDateString() : 'Not set'}
                    </div>
                  </div>
                </div>

                {/* Materials Table */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">
                    Materials ({selectedRFQ.items?.length || 0})
                  </Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead>UOM</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedRFQ.items?.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.description}</TableCell>
                          <TableCell className="text-right">{item.quantity.toFixed(2)}</TableCell>
                          <TableCell>{item.uom}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Email Preview */}
                {selectedRFQ.emailBody && (
                  <div>
                    <Label className="text-base font-semibold mb-3 block">Email Preview</Label>
                    <div className="bg-muted p-4 rounded-md text-sm">
                      <div dangerouslySetInnerHTML={{ __html: selectedRFQ.emailBody }} />
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailDialog(false)}>
                Close
              </Button>
              {selectedRFQ?.status === 'DRAFT' && (
                <Button onClick={() => sendRFQ(selectedRFQ.id)} disabled={sending}>
                  {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Send RFQ
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}