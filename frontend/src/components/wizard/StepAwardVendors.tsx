import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWizard } from '../../contexts/ProjectWizardContext';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Loader2,
  Trophy,
  CheckCircle2,
  DollarSign,
  FileText,
  Users,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  ArrowLeft,
  Clock,
  Eye,
  Pencil,
  Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function StepAwardVendors() {
  const { projectId, setStep } = useWizard();
  const navigate = useNavigate();
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [quoteDetails, setQuoteDetails] = useState<Record<string, any>>({});
  const [bomStatuses, setBomStatuses] = useState<any[]>([]);
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [awarding, setAwarding] = useState<string | null>(null);
  const [expandedQuote, setExpandedQuote] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'compare' | 'unquoted'>('overview');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [savingItem, setSavingItem] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) loadData();
  }, [projectId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rfqRes, quoteRes, bomStatusRes] = await Promise.all([
        axios.get(`${API_URL}/rfq?projectId=${projectId}`),
        axios.get(`${API_URL}/quotes?projectId=${projectId}`).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/bom/status?projectId=${projectId}`).catch(() => ({ data: [] })),
      ]);
      setRfqs(rfqRes.data || []);
      setBomStatuses(bomStatusRes.data || []);

      let quoteList = quoteRes.data || [];

      const detailPromises = quoteList.map((q: any) =>
        axios.get(`${API_URL}/quotes/${q.id}`).catch(() => ({ data: null }))
      );
      const detailResults = await Promise.all(detailPromises);
      const details: Record<string, any> = {};
      detailResults.forEach((res) => {
        if (res.data) details[res.data.id] = res.data;
      });
      setQuoteDetails(details);

      const quotesWithTotals = quoteList.map((q: any) => {
        const detail = details[q.id];
        if (detail?.items?.length > 0) {
          const lineItemTotal = detail.items.reduce(
            (sum: number, item: any) => sum + (item.totalPrice || 0), 0
          );
          return { ...q, computedTotal: lineItemTotal, totalItems: detail.items.length };
        }
        return { ...q, computedTotal: q.totalAmount || 0, totalItems: 0 };
      });
      setQuotes(quotesWithTotals);

      if (quoteList.length > 0) {
        try {
          const compRes = await axios.get(`${API_URL}/quotes/compare/${projectId}`);
          setComparison(compRes.data);
        } catch { /* comparison optional */ }
      }
    } catch (err) {
      console.error('Failed to load award data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadQuoteDetail = async (quoteId: string) => {
    if (quoteDetails[quoteId]) {
      setExpandedQuote(expandedQuote === quoteId ? null : quoteId);
      return;
    }
    try {
      const res = await axios.get(`${API_URL}/quotes/${quoteId}`);
      setQuoteDetails(prev => ({ ...prev, [quoteId]: res.data }));
      setExpandedQuote(quoteId);
    } catch {
      setExpandedQuote(expandedQuote === quoteId ? null : quoteId);
    }
  };

  const saveItemPrice = useCallback(async (itemId: string, qty: number) => {
    const price = parseFloat(editPrice);
    if (isNaN(price) || price < 0) return;

    setSavingItem(itemId);
    try {
      await axios.put(`${API_URL}/quotes/items/${itemId}`, {
        unitPrice: price,
        totalPrice: price * qty,
      });
      // Refresh data to get updated totals
      await loadData();
      setEditingItem(null);
      setEditPrice('');
    } catch (err) {
      console.error('Failed to save price:', err);
    } finally {
      setSavingItem(null);
    }
  }, [editPrice, projectId]);

  const awardVendor = async (quoteId: string) => {
    setAwarding(quoteId);
    try {
      await axios.post(`${API_URL}/quotes/${quoteId}/select-winner`);
      await loadData();
    } catch (err) {
      console.error('Failed to award vendor:', err);
    } finally {
      setAwarding(null);
    }
  };

  const goToProjectDashboard = async () => {
    if (projectId) {
      try {
        await axios.put(`${API_URL}/projects/${projectId}`, { wizardStep: 'award' });
      } catch { /* non-critical */ }
    }
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
  const awardedQuotes = quotes.filter((q: any) => q.status === 'AWARDED');

  const unquotedItems = bomStatuses.filter((item: any) => item.overallStatus === 'AVAILABLE');
  const rfqSentItems = bomStatuses.filter((item: any) => item.overallStatus === 'RFQ_SENT');
  const awardedItems = bomStatuses.filter((item: any) => item.overallStatus === 'AWARDED');

  const totalQuoted = quotes.reduce((sum: number, q: any) => sum + (q.computedTotal || 0), 0);
  const avgQuote = quotes.length > 0 ? totalQuoted / quotes.length : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Review Quotes & Award</h2>
          <p className="text-muted-foreground">
            {quotes.length > 0
              ? `${quotes.length} quote${quotes.length > 1 ? 's' : ''} received — review prices and award vendors`
              : 'Waiting for vendor quotes to come in'}
          </p>
        </div>
        <Button variant="outline" onClick={goToProjectDashboard}>
          Go to Project Dashboard
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <FileText className="w-5 h-5 text-muted-foreground mb-1" />
            <div className="text-2xl font-bold">{sentRfqs.length}</div>
            <p className="text-xs text-muted-foreground">RFQs Sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Users className="w-5 h-5 text-muted-foreground mb-1" />
            <div className="text-2xl font-bold">{quotes.length}</div>
            <p className="text-xs text-muted-foreground">Quotes Received</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Clock className="w-5 h-5 text-muted-foreground mb-1" />
            <div className="text-2xl font-bold">{sentRfqs.length - quotes.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting Response</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <DollarSign className="w-5 h-5 text-muted-foreground mb-1" />
            <div className="text-2xl font-bold">${avgQuote > 0 ? avgQuote.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '-'}</div>
            <p className="text-xs text-muted-foreground">Avg Quote</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Trophy className="w-5 h-5 text-muted-foreground mb-1" />
            <div className="text-2xl font-bold">{awardedQuotes.length}</div>
            <p className="text-xs text-muted-foreground">Awarded</p>
          </CardContent>
        </Card>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b">
        {(['overview', 'compare', 'unquoted'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab === 'overview' && 'Vendor Quotes'}
            {tab === 'compare' && 'Compare Line Items'}
            {tab === 'unquoted' && `Unquoted (${unquotedItems.length + rfqSentItems.length})`}
          </button>
        ))}
      </div>

      {/* Tab: Vendor Quotes Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {quotes.length === 0 && sentRfqs.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-200">Waiting for vendor responses</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {sentRfqs.length} RFQ{sentRfqs.length > 1 ? 's' : ''} sent. Quotes will appear here as vendors respond.
                </p>
              </div>
            </div>
          )}

          {quotes.length === 0 && sentRfqs.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No RFQs have been sent yet.</p>
              <Button variant="outline" className="mt-4" onClick={() => setStep('rfqs')}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Go to Review RFQs
              </Button>
            </div>
          )}

          {/* Quote cards per vendor */}
          {quotes.map((quote: any) => {
            const rfq = rfqs.find((r: any) => r.id === quote.rfqId);
            const detail = quoteDetails[quote.id];
            const isExpanded = expandedQuote === quote.id;
            const isAwarded = quote.status === 'AWARDED';
            const displayTotal = quote.computedTotal || 0;
            const totalItemCount = quote.totalItems || 0;

            return (
              <Card key={quote.id} className={cn(isAwarded && 'ring-2 ring-green-500')}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-lg font-semibold">{quote.vendor?.name || 'Unknown'}</span>
                        {isAwarded && (
                          <Badge className="bg-green-600 text-white">
                            <Trophy className="w-3 h-3 mr-1" /> Awarded
                          </Badge>
                        )}
                        <Badge variant="secondary">
                          {totalItemCount} item{totalItemCount !== 1 ? 's' : ''} quoted
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>RFQ: {rfq?.rfqNumber || '-'}</span>
                        <span>Received: {new Date(quote.receivedAt || quote.createdAt).toLocaleDateString()}</span>
                      </div>
                      
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {displayTotal > 0
                          ? `$${displayTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                          : <span className="text-muted-foreground text-lg">Enter prices below</span>
                        }
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => loadQuoteDetail(quote.id)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          {isExpanded ? 'Hide' : 'View'} Details
                          {isExpanded ? <ChevronDown className="w-4 h-4 ml-1" /> : <ChevronRight className="w-4 h-4 ml-1" />}
                        </Button>
                        {!isAwarded && quote.status !== 'REJECTED' && totalItemCount > 0 && (
                          <Button
                            size="sm"
                            onClick={() => awardVendor(quote.id)}
                            disabled={awarding === quote.id}
                          >
                            {awarding === quote.id ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <Trophy className="w-4 h-4 mr-1" />
                            )}
                            Award
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded quote line items with inline editing */}
                  {isExpanded && (
                    <div className="mt-4 border-t pt-4">
                      {!detail ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : detail.items?.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Description</TableHead>
                              <TableHead className="text-right">Qty</TableHead>
                              <TableHead>UOM</TableHead>
                              <TableHead className="text-right">Unit Price</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                              <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {detail.items.map((item: any) => {
                              const isEditing = editingItem === item.id;

                              return (
                                <TableRow key={item.id}>
                                  <TableCell className="font-medium">
                                    {item.description}
                                    {item.isAlternate && (
                                      <Badge variant="outline" className="ml-2 text-xs">Alt</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">{item.quantity?.toFixed(2)}</TableCell>
                                  <TableCell>{item.uom}</TableCell>
                                  <TableCell className="text-right">
                                    {isEditing ? (
                                      <div className="flex items-center justify-end gap-1">
                                        <span className="text-muted-foreground">$</span>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          className="w-24 h-7 text-right text-sm"
                                          value={editPrice}
                                          onChange={e => setEditPrice(e.target.value)}
                                          onKeyDown={e => {
                                            if (e.key === 'Enter') saveItemPrice(item.id, item.quantity);
                                            if (e.key === 'Escape') { setEditingItem(null); setEditPrice(''); }
                                          }}
                                          autoFocus
                                        />
                                      </div>
                                    ) : (
                                      `$${item.unitPrice?.toFixed(2)}`
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold">
                                    {isEditing && editPrice
                                      ? `$${(parseFloat(editPrice) * item.quantity).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                                      : `$${item.totalPrice?.toLocaleString()}`
                                    }
                                  </TableCell>
                                  <TableCell>
                                    {isEditing ? (
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 w-7 p-0"
                                          onClick={() => saveItemPrice(item.id, item.quantity)}
                                          disabled={savingItem === item.id}
                                        >
                                          {savingItem === item.id
                                            ? <Loader2 className="w-3 h-3 animate-spin" />
                                            : <Save className="w-3 h-3" />
                                          }
                                        </Button>
                                      </div>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0"
                                        onClick={() => {
                                          setEditingItem(item.id);
                                          setEditPrice(item.unitPrice > 0 ? item.unitPrice.toString() : '');
                                        }}
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                            <TableRow className="font-bold border-t-2">
                              <TableCell colSpan={4}>TOTAL</TableCell>
                              <TableCell className="text-right">
                                ${detail.items.reduce((sum: number, i: any) => sum + (i.totalPrice || 0), 0).toLocaleString()}
                              </TableCell>
                              <TableCell />
                            </TableRow>
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-center py-6 text-muted-foreground">
                          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                          <p className="font-medium">No line items found</p>
                          <p className="text-sm mt-1">This quote may need to be re-processed.</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Vendors who haven't responded */}
          {sentRfqs.filter(r => !quotes.some(q => q.rfqId === r.id)).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Awaiting Response</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {sentRfqs
                    .filter(r => !quotes.some(q => q.rfqId === r.id))
                    .map((rfq: any) => (
                      <div key={rfq.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <span className="font-medium">{rfq.vendor?.name || 'Unknown'}</span>
                          <span className="text-sm text-muted-foreground ml-3">{rfq.rfqNumber}</span>
                        </div>
                        <Badge variant="secondary">
                          <Clock className="w-3 h-3 mr-1" /> Sent {rfq.sentAt ? new Date(rfq.sentAt).toLocaleDateString() : '-'}
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tab: Compare Line Items */}
      {activeTab === 'compare' && (
        <Card>
          <CardHeader>
            <CardTitle>Quote Comparison</CardTitle>
            <CardDescription>Side-by-side pricing from all vendors</CardDescription>
          </CardHeader>
          <CardContent>
            {!comparison || comparison.items?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <DollarSign className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No quotes to compare yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Material</TableHead>
                      {comparison.vendors?.map((vendor: string) => (
                        <TableHead key={vendor} className="text-right min-w-[120px]">{vendor}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparison.items?.map((item: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.description}</TableCell>
                        {item.quotes?.map((q: any, qIdx: number) => (
                          <TableCell key={qIdx} className={cn('text-right', q.isLowest && q.price > 0 && 'text-green-600 font-bold')}>
                            {q.price > 0 ? `$${q.total.toLocaleString()}` : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    <TableRow className="font-bold border-t-2">
                      <TableCell>TOTAL</TableCell>
                      {comparison.vendors?.map((vendor: string) => {
                        const vendorQuote = quotes.find((q: any) => q.vendor?.name === vendor);
                        return (
                          <TableCell key={vendor} className="text-right">
                            ${(vendorQuote?.computedTotal || 0).toLocaleString()}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Unquoted Materials */}
      {activeTab === 'unquoted' && (
        <div className="space-y-4">
          {unquotedItems.length === 0 && rfqSentItems.length === 0 && bomStatuses.length > 0 && (
            <div className="text-center py-12">
              <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-semibold">All materials covered</p>
              <p className="text-muted-foreground mt-1">Every BOM item has a quote or is awarded.</p>
            </div>
          )}

          {bomStatuses.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No BOM items found for this project.</p>
            </div>
          )}

          {(unquotedItems.length > 0 || rfqSentItems.length > 0) && (
            <>
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    {unquotedItems.length} material{unquotedItems.length !== 1 ? 's' : ''} still need quotes
                    {rfqSentItems.length > 0 && `, ${rfqSentItems.length} awaiting response`}
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Request quotes from additional vendors to cover missing materials.
                  </p>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Materials Needing Quotes</CardTitle>
                    <Button size="sm" onClick={() => setStep('vendors')}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Match More Vendors
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Trade</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead>UOM</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...unquotedItems, ...rfqSentItems].map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.description}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.trade || '-'}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{item.finalQty?.toFixed(2)}</TableCell>
                          <TableCell>{item.uom}</TableCell>
                          <TableCell>
                            {item.overallStatus === 'AVAILABLE' && (
                              <Badge variant="outline" className="text-xs">No RFQ</Badge>
                            )}
                            {item.overallStatus === 'RFQ_SENT' && (
                              <Badge className="text-xs bg-blue-600 text-white">
                                RFQ Sent
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}

          {awardedItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-green-700">Awarded Materials ({awardedItems.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Awarded To</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {awardedItems.map((item: any) => {
                      const awardedQuote = item.quotes?.find((q: any) => q.status === 'AWARDED');
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.description}</TableCell>
                          <TableCell>{awardedQuote?.vendorName || '-'}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {awardedQuote?.totalPrice ? `$${awardedQuote.totalPrice.toLocaleString()}` : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
