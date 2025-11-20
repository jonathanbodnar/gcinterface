import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { TrendingUp, ArrowLeft, Upload, FileText, DollarSign, Loader2, Trophy, Star } from 'lucide-react';
import axios from 'axios';
import { cn } from '@/lib/utils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function QuoteComparison() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [comparison, setComparison] = useState<any>(null);
  const [bidLeveling, setBidLeveling] = useState<any>(null);
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [selectedRFQ, setSelectedRFQ] = useState<string>('');
  const [quoteText, setQuoteText] = useState('');
  const [activeTab, setActiveTab] = useState('quotes');

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load quotes
      const quotesResponse = await axios.get(`${API_URL}/quotes?projectId=${projectId}`);
      setQuotes(quotesResponse.data || []);

      // Load RFQs
      const rfqResponse = await axios.get(`${API_URL}/rfq?projectId=${projectId}`);
      setRfqs(rfqResponse.data || []);

      // Load comparison if quotes exist
      if (quotesResponse.data?.length > 0) {
        const compResponse = await axios.get(`${API_URL}/quotes/compare/${projectId}`);
        setComparison(compResponse.data);

        const levelResponse = await axios.get(`${API_URL}/quotes/level/${projectId}`);
        setBidLeveling(levelResponse.data);
      }
    } catch (error) {
      console.error('Failed to load quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const openUploadDialog = () => {
    if (rfqs.length === 0) {
      alert('No RFQs found. Please create RFQs first.');
      return;
    }
    setQuoteText('');
    setSelectedRFQ(rfqs[0]?.id || '');
    setUploadDialog(true);
  };

  const uploadQuote = async () => {
    if (!selectedRFQ || !quoteText.trim()) {
      alert('Please select an RFQ and enter quote data');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/quotes/parse/${selectedRFQ}`, {
        emailBody: quoteText,
      });
      alert('Quote uploaded and parsed successfully!');
      setUploadDialog(false);
      loadData();
    } catch (error) {
      console.error('Failed to upload quote:', error);
      alert('Failed to parse quote');
    } finally {
      setLoading(false);
    }
  };

  const selectWinner = async (quoteId: string) => {
    if (!confirm('Are you sure you want to select this quote as the winner?')) {
      return;
    }

    try {
      await axios.post(`${API_URL}/quotes/${quoteId}/select-winner`);
      alert('Quote accepted! Other quotes have been rejected.');
      loadData();
    } catch (error) {
      console.error('Failed to select winner:', error);
      alert('Failed to select winner');
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return 'default';
      case 'REJECTED':
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
              <h1 className="text-4xl font-bold tracking-tight">Quote Comparison</h1>
              <p className="text-muted-foreground mt-2">Compare vendor quotes and level bids</p>
            </div>
            <Button onClick={openUploadDialog}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Quote
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{quotes.length}</div>
              <p className="text-xs text-muted-foreground">Quotes Received</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{rfqs.length}</div>
              <p className="text-xs text-muted-foreground">RFQs Sent</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {quotes.length > 0 ? Math.round((quotes.length / rfqs.length) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">Response Rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {bidLeveling?.potentialSavings ? `$${bidLeveling.potentialSavings.toLocaleString()}` : '$0'}
              </div>
              <p className="text-xs text-muted-foreground">Potential Savings</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="quotes">
              <FileText className="w-4 h-4 mr-2" />
              All Quotes
            </TabsTrigger>
            <TabsTrigger value="comparison">
              <TrendingUp className="w-4 h-4 mr-2" />
              Side-by-Side
            </TabsTrigger>
            <TabsTrigger value="leveling">
              <DollarSign className="w-4 h-4 mr-2" />
              Bid Leveling
            </TabsTrigger>
          </TabsList>

          {/* All Quotes Tab */}
          <TabsContent value="quotes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Received Quotes ({quotes.length})</CardTitle>
                <CardDescription>All quotes from vendors</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : quotes.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground mb-4">No quotes received yet</p>
                    <Button onClick={openUploadDialog}>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload First Quote
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Quote Number</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                        <TableHead>VE Offered</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quotes.map((quote) => (
                        <TableRow key={quote.id}>
                          <TableCell className="font-medium">{quote.vendor?.name}</TableCell>
                          <TableCell className="font-mono text-sm">{quote.quoteNumber}</TableCell>
                          <TableCell>{quote._count?.items || 0} items</TableCell>
                          <TableCell className="text-right font-semibold">
                            ${quote.totalAmount?.toLocaleString() || 0}
                          </TableCell>
                          <TableCell>
                            {quote.hasVE ? (
                              <Badge variant="default" className="gap-1">
                                <Star className="w-3 h-3" />
                                Yes
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">No</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(quote.status) as any}>
                              {quote.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {quote.status !== 'ACCEPTED' && quote.status !== 'REJECTED' && (
                              <Button
                                size="sm"
                                onClick={() => selectWinner(quote.id)}
                              >
                                <Trophy className="w-4 h-4 mr-2" />
                                Select
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
          </TabsContent>

          {/* Comparison Tab */}
          <TabsContent value="comparison" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Side-by-Side Comparison</CardTitle>
                <CardDescription>Compare all quotes item by item</CardDescription>
              </CardHeader>
              <CardContent>
                {!comparison || quotes.length < 2 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Need at least 2 quotes to compare</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Material</TableHead>
                          {comparison.vendors?.map((vendor: string) => (
                            <TableHead key={vendor} className="text-center">{vendor}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {comparison.items?.map((item: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{item.description}</TableCell>
                            {item.quotes?.map((quote: any, qIdx: number) => (
                              <TableCell
                                key={qIdx}
                                className={cn(
                                  "text-center",
                                  quote.isLowest && "bg-green-50 dark:bg-green-950 font-semibold"
                                )}
                              >
                                {quote.price ? `$${quote.price.toLocaleString()}` : '-'}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bid Leveling Tab */}
          <TabsContent value="leveling" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Bid Leveling</CardTitle>
                <CardDescription>Lowest price per item across all vendors</CardDescription>
              </CardHeader>
              <CardContent>
                {!bidLeveling ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <DollarSign className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No quotes available for bid leveling</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-primary/10 p-4 rounded-lg">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-sm text-muted-foreground">Lowest Total</p>
                          <p className="text-3xl font-bold text-primary">
                            ${bidLeveling.lowestTotal?.toLocaleString() || 0}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{bidLeveling.lowestVendor}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Highest Total</p>
                          <p className="text-3xl font-bold">
                            ${bidLeveling.highestTotal?.toLocaleString() || 0}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{bidLeveling.highestVendor}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Potential Savings</p>
                          <p className="text-3xl font-bold text-green-600">
                            ${bidLeveling.potentialSavings?.toLocaleString() || 0}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {bidLeveling.savingsPercent?.toFixed(1)}% below highest
                          </p>
                        </div>
                      </div>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Material</TableHead>
                          <TableHead>Lowest Price</TableHead>
                          <TableHead>Vendor</TableHead>
                          <TableHead className="text-right">Savings vs Highest</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bidLeveling.leveledItems?.map((item: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{item.description}</TableCell>
                            <TableCell className="font-semibold text-green-600">
                              ${item.lowestPrice?.toLocaleString() || 0}
                            </TableCell>
                            <TableCell>
                              <Badge variant="default">{item.lowestVendor}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {item.savings > 0 ? (
                                <span className="text-green-600">
                                  -${item.savings.toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Upload Quote Dialog */}
        <Dialog open={uploadDialog} onOpenChange={setUploadDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload Vendor Quote</DialogTitle>
              <DialogDescription>
                Paste the quote email content or upload Excel file
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="rfqSelect">Select RFQ</Label>
                <select
                  id="rfqSelect"
                  value={selectedRFQ}
                  onChange={(e) => setSelectedRFQ(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {rfqs.map((rfq) => (
                    <option key={rfq.id} value={rfq.id}>
                      {rfq.rfqNumber} - {rfq.vendor?.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="quoteText">Quote Data</Label>
                <Textarea
                  id="quoteText"
                  value={quoteText}
                  onChange={(e) => setQuoteText(e.target.value)}
                  rows={12}
                  placeholder="Paste email content or type quote data...&#10;&#10;Example:&#10;Item 1: VCT Flooring - $3.50/SF - Total: $13,440&#10;Item 2: Paint - $2.00/SF - Total: $8,400&#10;..."
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  The system will attempt to parse item descriptions and prices from the text
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadDialog(false)}>
                Cancel
              </Button>
              <Button onClick={uploadQuote} disabled={loading || !quoteText.trim()}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Parse & Upload
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}