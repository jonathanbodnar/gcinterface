import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FileText, ArrowLeft, Plus, Trophy, Mail, Loader2, CheckCircle2, Award as AwardIcon } from 'lucide-react';
import axios from 'axios';
import { cn } from '@/lib/utils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function Contracts() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialog, setCreateDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [selectedQuote, setSelectedQuote] = useState<string>('');
  const [scopeOfWork, setScopeOfWork] = useState('');

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load contracts
      const contractsResponse = await axios.get(`${API_URL}/subcontracts?projectId=${projectId}`);
      setContracts(contractsResponse.data || []);

      // Load accepted quotes
      const quotesResponse = await axios.get(`${API_URL}/quotes?projectId=${projectId}`);
      const acceptedQuotes = quotesResponse.data?.filter((q: any) => q.status === 'ACCEPTED') || [];
      setQuotes(acceptedQuotes);
    } catch (error) {
      console.error('Failed to load contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    if (quotes.length === 0) {
      alert('No accepted quotes. Please select a winning quote first.');
      navigate(`/quotes/${projectId}`);
      return;
    }
    setSelectedQuote(quotes[0]?.id || '');
    setScopeOfWork('');
    setCreateDialog(true);
  };

  const createContract = async () => {
    if (!selectedQuote || !scopeOfWork.trim()) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/subcontracts/create`, {
        quoteId: selectedQuote,
        scopeOfWork,
      });
      alert('Subcontract created successfully!');
      setCreateDialog(false);
      loadData();
    } catch (error) {
      console.error('Failed to create contract:', error);
      alert('Failed to create contract');
    } finally {
      setLoading(false);
    }
  };

  const viewContractDetails = async (contractId: string) => {
    try {
      const response = await axios.get(`${API_URL}/subcontracts/${contractId}`);
      setSelectedContract(response.data);
      setDetailDialog(true);
    } catch (error) {
      console.error('Failed to load contract details:', error);
    }
  };

  const awardContract = async (contractId: string) => {
    if (!confirm('Are you sure you want to award this subcontract? Award and non-award emails will be sent.')) {
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/subcontracts/${contractId}/award`);
      alert('Subcontract awarded successfully! Emails have been sent.');
      setDetailDialog(false);
      loadData();
      
      // Update project status
      await axios.post(`${API_URL}/projects/${projectId}/advance-status`);
    } catch (error) {
      console.error('Failed to award contract:', error);
      alert('Failed to award contract');
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'AWARDED':
        return 'default';
      case 'DRAFT':
        return 'secondary';
      case 'SENT_FOR_REVIEW':
        return 'outline';
      case 'DECLINED':
      case 'CANCELLED':
        return 'secondary';
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
              <h1 className="text-4xl font-bold tracking-tight">Subcontracts & Awards</h1>
              <p className="text-muted-foreground mt-2">Generate and manage subcontracts</p>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Generate Subcontract
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{contracts.length}</div>
              <p className="text-xs text-muted-foreground">Total Contracts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{contracts.filter(c => c.status === 'AWARDED').length}</div>
              <p className="text-xs text-muted-foreground">Awarded</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{contracts.filter(c => c.status === 'DRAFT').length}</div>
              <p className="text-xs text-muted-foreground">Drafts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                ${contracts.reduce((sum, c) => sum + (c.contractAmount || 0), 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Total Value</p>
            </CardContent>
          </Card>
        </div>

        {/* Contracts Table */}
        <Card>
          <CardHeader>
            <CardTitle>Subcontracts</CardTitle>
            <CardDescription>All subcontracts for this project</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : contracts.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-4">No subcontracts yet</p>
                <Button onClick={openCreateDialog}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Subcontract
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contract #</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Trade</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Awarded Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((contract) => (
                    <TableRow key={contract.id} className="cursor-pointer" onClick={() => viewContractDetails(contract.id)}>
                      <TableCell className="font-mono text-sm">{contract.contractNumber}</TableCell>
                      <TableCell className="font-medium">{contract.vendor?.name}</TableCell>
                      <TableCell><Badge>{contract.trade}</Badge></TableCell>
                      <TableCell className="text-right font-semibold">
                        ${contract.contractAmount?.toLocaleString() || 0}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(contract.status) as any}>
                          {contract.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {contract.awardedAt ? new Date(contract.awardedAt).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {contract.status === 'DRAFT' && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              awardContract(contract.id);
                            }}
                          >
                            <Trophy className="w-4 h-4 mr-2" />
                            Award
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

        {/* Create Contract Dialog */}
        <Dialog open={createDialog} onOpenChange={setCreateDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Generate Subcontract</DialogTitle>
              <DialogDescription>
                Create a subcontract from an accepted quote
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="quoteSelect">Select Accepted Quote</Label>
                <select
                  id="quoteSelect"
                  value={selectedQuote}
                  onChange={(e) => setSelectedQuote(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {quotes.map((quote) => (
                    <option key={quote.id} value={quote.id}>
                      {quote.vendor?.name} - ${quote.totalAmount?.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="scopeOfWork">Scope of Work</Label>
                <Textarea
                  id="scopeOfWork"
                  value={scopeOfWork}
                  onChange={(e) => setScopeOfWork(e.target.value)}
                  rows={10}
                  placeholder="Describe the scope of work for this subcontract...&#10;&#10;Example:&#10;- Furnish and install all plumbing fixtures&#10;- Provide all materials per specifications&#10;- Complete rough-in and final connections&#10;- Obtain all necessary permits"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={createContract} disabled={loading || !scopeOfWork.trim()}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Generate Contract
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Contract Detail Dialog */}
        <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Subcontract: {selectedContract?.contractNumber}</DialogTitle>
              <DialogDescription>
                {selectedContract?.vendor?.name}
              </DialogDescription>
            </DialogHeader>
            {selectedContract && (
              <div className="grid gap-6 py-4">
                {/* Contract Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Vendor</Label>
                    <div className="font-medium">{selectedContract.vendor?.name}</div>
                    <div className="text-sm text-muted-foreground">{selectedContract.vendor?.email}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Trade</Label>
                    <div><Badge>{selectedContract.trade}</Badge></div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Contract Amount</Label>
                    <div className="text-2xl font-bold text-green-600">
                      ${selectedContract.contractAmount?.toLocaleString() || 0}
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div>
                      <Badge variant={getStatusVariant(selectedContract.status) as any} className="mt-1">
                        {selectedContract.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Scope of Work */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">Scope of Work</Label>
                  <div className="bg-muted p-4 rounded-md whitespace-pre-wrap text-sm">
                    {selectedContract.scopeOfWork}
                  </div>
                </div>

                {/* Materials */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">
                    Materials Included ({selectedContract.materials?.length || 0})
                  </Label>
                  {Array.isArray(selectedContract.materials) && selectedContract.materials.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedContract.materials.map((item: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell>{item.description}</TableCell>
                            <TableCell className="text-right">{item.quantity?.toFixed(2)}</TableCell>
                            <TableCell className="text-right">${item.unitPrice?.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground">No materials listed</p>
                  )}
                </div>

                {/* Award Info */}
                {selectedContract.awardedAt && (
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-semibold">Awarded</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Awarded on {new Date(selectedContract.awardedAt).toLocaleString()}
                      {selectedContract.awardedByUser && ` by ${selectedContract.awardedByUser.name}`}
                    </p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailDialog(false)}>
                Close
              </Button>
              {selectedContract?.status === 'DRAFT' && (
                <Button onClick={() => awardContract(selectedContract.id)}>
                  <Trophy className="w-4 h-4 mr-2" />
                  Award Contract
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
