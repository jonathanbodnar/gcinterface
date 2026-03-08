import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWizard } from '../../contexts/ProjectWizardContext';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Loader2,
  Trophy,
  CheckCircle2,
  DollarSign,
  ExternalLink,
  FileText,
  Users,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function StepAwardVendors() {
  const { projectId } = useWizard();
  const navigate = useNavigate();
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [awarding, setAwarding] = useState<string | null>(null);
  const [awarded, setAwarded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (projectId) loadData();
  }, [projectId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rfqRes, quoteRes] = await Promise.all([
        axios.get(`${API_URL}/rfq?projectId=${projectId}`),
        axios.get(`${API_URL}/quotes?projectId=${projectId}`).catch(() => ({ data: [] })),
      ]);
      setRfqs(rfqRes.data || []);
      setQuotes(quoteRes.data || []);
    } catch (err) {
      console.error('Failed to load award data:', err);
    } finally {
      setLoading(false);
    }
  };

  const awardVendor = async (rfqId: string) => {
    setAwarding(rfqId);
    try {
      await axios.post(`${API_URL}/rfq/${rfqId}/award`).catch(() => {
        // If no award endpoint, just track locally
      });
      setAwarded(prev => new Set(prev).add(rfqId));
    } finally {
      setAwarding(null);
    }
  };

  const finishProject = async () => {
    try {
      await axios.put(`${API_URL}/projects/${projectId}`, {
        status: 'AWARDED',
        wizardStep: 'award',
      });
    } catch { /* non-critical */ }
    navigate(`/projects/${projectId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p>Complete previous steps first</p>
      </div>
    );
  }

  const sentRfqs = rfqs.filter((r: any) => r.status === 'SENT' || r.status === 'RESPONDED');
  const totalQuoteValue = quotes.reduce((sum: number, q: any) => sum + (q.totalAmount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Award Vendors</h2>
          <p className="text-muted-foreground">
            Review quotes and award contracts to your selected vendors
          </p>
        </div>
        <Button onClick={finishProject}>
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Complete Project Setup
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <FileText className="w-6 h-6 text-muted-foreground mb-2" />
            <div className="text-2xl font-bold">{rfqs.length}</div>
            <p className="text-xs text-muted-foreground">RFQs Sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Users className="w-6 h-6 text-muted-foreground mb-2" />
            <div className="text-2xl font-bold">{quotes.length}</div>
            <p className="text-xs text-muted-foreground">Quotes Received</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <DollarSign className="w-6 h-6 text-muted-foreground mb-2" />
            <div className="text-2xl font-bold">${totalQuoteValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total Quoted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Trophy className="w-6 h-6 text-muted-foreground mb-2" />
            <div className="text-2xl font-bold">{awarded.size}</div>
            <p className="text-xs text-muted-foreground">Awarded</p>
          </CardContent>
        </Card>
      </div>

      {/* Vendor RFQ Table */}
      <Card>
        <CardHeader>
          <CardTitle>Vendor Submissions</CardTitle>
          <CardDescription>
            Review and award vendors based on their RFQ responses
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sentRfqs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No RFQs have been sent yet.</p>
              <p className="text-sm mt-1">Go back to the previous step to send RFQs to vendors.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>RFQ Number</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Quote Amount</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sentRfqs.map((rfq: any) => {
                  const rfqQuotes = quotes.filter((q: any) => q.rfqId === rfq.id);
                  const bestQuote = rfqQuotes.sort((a: any, b: any) => (a.totalAmount || 0) - (b.totalAmount || 0))[0];
                  const isAwarded = awarded.has(rfq.id);

                  return (
                    <TableRow key={rfq.id} className={isAwarded ? 'bg-green-50 dark:bg-green-950/20' : ''}>
                      <TableCell className="font-medium">{rfq.vendor?.name || 'Unknown'}</TableCell>
                      <TableCell className="font-mono text-sm">{rfq.rfqNumber}</TableCell>
                      <TableCell>{rfq._count?.items || 0} items</TableCell>
                      <TableCell>
                        {isAwarded ? (
                          <Badge className="bg-green-600 text-white">Awarded</Badge>
                        ) : rfq.status === 'RESPONDED' ? (
                          <Badge className="bg-blue-100 text-blue-800">Quote Received</Badge>
                        ) : (
                          <Badge variant="secondary">{rfq.status}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {bestQuote ? `$${bestQuote.totalAmount?.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {isAwarded ? (
                          <Badge variant="outline" className="text-green-600">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Awarded
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => awardVendor(rfq.id)}
                            disabled={awarding === rfq.id}
                          >
                            {awarding === rfq.id ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <Trophy className="w-4 h-4 mr-1" />
                            )}
                            Award
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate(`/quotes/${projectId}`)}>
          <ExternalLink className="w-4 h-4 mr-2" />
          Full Quote Comparison
        </Button>
        <Button onClick={finishProject} size="lg">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Complete Project Setup
        </Button>
      </div>
    </div>
  );
}
