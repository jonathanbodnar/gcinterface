import { useState, useEffect } from 'react';
import { useWizard } from '../../contexts/ProjectWizardContext';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Send, FileText, Plus, Clock, CheckCircle2, XCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function StepSendRFQs() {
  const { projectId } = useWizard();
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [bomItems, setBomItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (projectId) loadData();
  }, [projectId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rfqRes, bomRes] = await Promise.all([
        axios.get(`${API_URL}/rfq?projectId=${projectId}`),
        axios.get(`${API_URL}/bom?projectId=${projectId}`),
      ]);
      setRfqs(rfqRes.data || []);
      setBomItems(bomRes.data?.items || []);
    } catch (err) {
      console.error('Failed to load RFQ data:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendRFQ = async (rfqId: string) => {
    setSending(rfqId);
    try {
      await axios.post(`${API_URL}/rfq/${rfqId}/send`);
      loadData();
    } catch (err) {
      console.error('Failed to send RFQ:', err);
      alert('Failed to send RFQ');
    } finally {
      setSending(null);
    }
  };

  const createRFQsForSelectedVendors = async () => {
    setCreating(true);
    try {
      const vendorsRes = await axios.get(`${API_URL}/projects/${projectId}/selected-vendors`);
      const selectedVendors = vendorsRes.data?.vendors || [];
      const materialIds = bomItems.map((item: any) => item.id);

      for (const vendor of selectedVendors) {
        await axios.post(`${API_URL}/rfq/create`, {
          projectId,
          vendorId: vendor.id,
          materialIds,
        });
      }

      loadData();
    } catch (err) {
      console.error('Failed to create RFQs:', err);
      alert('Failed to create RFQs. Make sure you have selected vendors in the previous step.');
    } finally {
      setCreating(false);
    }
  };

  const downloadPDF = async (rfqId: string, rfqNumber: string) => {
    try {
      const response = await axios.get(`${API_URL}/rfq/${rfqId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${rfqNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download PDF');
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'DRAFT': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'SENT': return <Send className="w-4 h-4 text-blue-600" />;
      case 'RESPONDED': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      default: return <XCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!projectId) {
    return <div className="text-center py-16 text-muted-foreground">Complete previous steps first</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Send RFQs</h2>
          <p className="text-muted-foreground">Create and send requests for quotes to your selected vendors</p>
        </div>
        <Button onClick={createRFQsForSelectedVendors} disabled={creating}>
          {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          Create RFQs
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{rfqs.length}</div><p className="text-xs text-muted-foreground">Total RFQs</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{rfqs.filter((r: any) => r.status === 'SENT').length}</div><p className="text-xs text-muted-foreground">Sent</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{rfqs.filter((r: any) => r.status === 'RESPONDED').length}</div><p className="text-xs text-muted-foreground">Responded</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{rfqs.filter((r: any) => r.status === 'DRAFT').length}</div><p className="text-xs text-muted-foreground">Drafts</p></CardContent></Card>
      </div>

      {/* RFQ Table */}
      <Card>
        <CardHeader>
          <CardTitle>Requests for Quotes</CardTitle>
          <CardDescription>{rfqs.length} RFQs for this project</CardDescription>
        </CardHeader>
        <CardContent>
          {rfqs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No RFQs created yet. Click "Create RFQs" above.</p>
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rfqs.map((rfq: any) => (
                  <TableRow key={rfq.id}>
                    <TableCell className="font-mono text-sm">{rfq.rfqNumber}</TableCell>
                    <TableCell>{rfq.vendor?.name}</TableCell>
                    <TableCell>{rfq._count?.items || 0} items</TableCell>
                    <TableCell>
                      <Badge variant={rfq.status === 'SENT' ? 'default' : 'secondary'} className="gap-1">
                        {statusIcon(rfq.status)} {rfq.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {rfq.sentAt ? new Date(rfq.sentAt).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => downloadPDF(rfq.id, rfq.rfqNumber)}>
                          <FileText className="w-4 h-4 mr-1" /> PDF
                        </Button>
                        {(rfq.status === 'DRAFT' || rfq.status === 'SENT') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendRFQ(rfq.id)}
                            disabled={sending === rfq.id}
                          >
                            {sending === rfq.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
                            {rfq.status === 'DRAFT' ? 'Send' : 'Resend'}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
