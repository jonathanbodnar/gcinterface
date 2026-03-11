import { useState, useEffect } from 'react';
import { useWizard } from '../../contexts/ProjectWizardContext';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, Users, Send, FileText, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

type BOMItemStatus = {
  id: string;
  description: string;
  category: string;
  trade: string;
  finalQty: number;
  uom: string;
  overallStatus: 'AVAILABLE' | 'RFQ_SENT' | 'QUOTED' | 'AWARDED';
  rfqs: { rfqId: string; status: string; vendorName: string; vendorId: string }[];
  quotes: { quoteId: string; status: string; vendorName: string; vendorId: string; unitPrice: number; totalPrice: number }[];
};

export default function StepMatchVendors() {
  const { projectId, setSelectedVendorIds, selectedVendorIds: contextVendorIds } = useWizard();
  const [bomStatuses, setBomStatuses] = useState<BOMItemStatus[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(new Set());
  const [vendorCoverage, setVendorCoverage] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (projectId) loadData();
  }, [projectId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bomStatusRes, , savedVendorsRes] = await Promise.all([
        axios.get(`${API_URL}/bom/status?projectId=${projectId}`).catch(() => ({ data: [] })),
        loadVendors(),
        axios.get(`${API_URL}/projects/${projectId}/selected-vendors`).catch(() => ({ data: { vendors: [] } })),
      ]);

      setBomStatuses(bomStatusRes.data || []);

      const savedVendors = savedVendorsRes.data?.vendors || [];
      if (savedVendors.length > 0) {
        const savedIds = savedVendors.map((v: any) => v.id);
        setSelectedVendors(new Set(savedIds));
        setSelectedVendorIds(savedIds);
      } else if (contextVendorIds && contextVendorIds.length > 0) {
        setSelectedVendors(new Set(contextVendorIds));
      }
    } catch (err) {
      console.error('Failed to load vendor matching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadVendors = async () => {
    try {
      const rankResponse = await axios.get(`${API_URL}/vendors/rank/${projectId}`);
      if (rankResponse.data?.hasData) {
        const vendorsResponse = await axios.get(`${API_URL}/vendors`);
        const rankedVendors = rankResponse.data.rankings.map((r: any) => {
          const vendor = vendorsResponse.data?.find((v: any) => v.id === r.vendorId);
          return { ...vendor, ...r };
        });
        setVendors(rankedVendors);
        return;
      }
    } catch { /* fall through */ }
    const vendorsResponse = await axios.get(`${API_URL}/vendors`);
    setVendors(vendorsResponse.data || []);
  };

  const toggleVendor = async (vendorId: string) => {
    const next = new Set(selectedVendors);
    if (next.has(vendorId)) {
      next.delete(vendorId);
    } else {
      next.add(vendorId);
      if (!vendorCoverage.has(vendorId)) {
        try {
          const response = await axios.get(`${API_URL}/vendors/${vendorId}/coverage/${projectId}`);
          setVendorCoverage(new Map(vendorCoverage).set(vendorId, response.data));
        } catch { /* optional */ }
      }
    }
    setSelectedVendors(next);
    setSelectedVendorIds(Array.from(next));
  };

  const saveSelections = async () => {
    if (!projectId) return;
    setSaving(true);
    try {
      const ids = Array.from(selectedVendors);
      setSelectedVendorIds(ids);
      await axios.post(`${API_URL}/projects/${projectId}/selected-vendors`, {
        vendorIds: ids,
      });
    } catch (err) {
      console.error('Failed to save vendors:', err);
    } finally {
      setSaving(false);
    }
  };

  const matchableItems = bomStatuses.filter(b => b.overallStatus !== 'AWARDED');
  const awardedItems = bomStatuses.filter(b => b.overallStatus === 'AWARDED');
  const rfqItems = bomStatuses.filter(b => b.overallStatus === 'RFQ_SENT');
  const quotedItems = bomStatuses.filter(b => b.overallStatus === 'QUOTED');

  const filteredItems = statusFilter === 'all'
    ? matchableItems
    : bomStatuses.filter(b => {
        if (statusFilter === 'available') return b.overallStatus === 'AVAILABLE';
        if (statusFilter === 'rfq') return b.overallStatus === 'RFQ_SENT';
        if (statusFilter === 'quoted') return b.overallStatus === 'QUOTED';
        if (statusFilter === 'awarded') return b.overallStatus === 'AWARDED';
        return true;
      });

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!projectId) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p>Complete previous steps first to match vendors</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Match Vendors</h2>
          <p className="text-muted-foreground">
            {matchableItems.length} materials need vendors
            {awardedItems.length > 0 && ` · ${awardedItems.length} awarded`}
          </p>
        </div>
        <Button onClick={saveSelections} disabled={saving || selectedVendors.size === 0}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
          Save Selections ({selectedVendors.size})
        </Button>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => setStatusFilter('all')}
          className={cn('rounded-lg border p-3 text-left transition-colors', statusFilter === 'all' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50')}
        >
          <div className="text-2xl font-bold">{matchableItems.length}</div>
          <p className="text-xs text-muted-foreground">Need Vendors</p>
        </button>
        <button
          onClick={() => setStatusFilter('rfq')}
          className={cn('rounded-lg border p-3 text-left transition-colors', statusFilter === 'rfq' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'hover:bg-muted/50')}
        >
          <div className="text-2xl font-bold text-blue-600">{rfqItems.length}</div>
          <p className="text-xs text-muted-foreground">RFQ Sent</p>
        </button>
        <button
          onClick={() => setStatusFilter('quoted')}
          className={cn('rounded-lg border p-3 text-left transition-colors', statusFilter === 'quoted' ? 'border-orange-500 bg-orange-50 dark:bg-orange-950' : 'hover:bg-muted/50')}
        >
          <div className="text-2xl font-bold text-orange-600">{quotedItems.length}</div>
          <p className="text-xs text-muted-foreground">Quoted</p>
        </button>
        <button
          onClick={() => setStatusFilter('awarded')}
          className={cn('rounded-lg border p-3 text-left transition-colors', statusFilter === 'awarded' ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'hover:bg-muted/50')}
        >
          <div className="text-2xl font-bold text-green-600">{awardedItems.length}</div>
          <p className="text-xs text-muted-foreground">Awarded</p>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Materials with status */}
        <Card className="lg:col-span-1 max-h-[600px] overflow-auto">
          <CardHeader className="sticky top-0 bg-card z-10">
            <CardTitle className="text-base">Materials ({filteredItems.length})</CardTitle>
            <CardDescription>
              {statusFilter === 'all' ? 'All matchable materials' : `Filtered: ${statusFilter}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredItems.map(item => (
              <div key={item.id} className="flex items-start justify-between py-2 border-b last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{item.description}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.finalQty?.toFixed(1)} {item.uom}
                  </div>
                  {item.overallStatus !== 'AVAILABLE' && item.rfqs.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {item.rfqs.map(r => r.vendorName).join(', ')}
                    </div>
                  )}
                </div>
                <div className="ml-2 flex-shrink-0">
                  {item.overallStatus === 'AVAILABLE' && (
                    <Badge variant="outline" className="text-xs">Available</Badge>
                  )}
                  {item.overallStatus === 'RFQ_SENT' && (
                    <Badge className="text-xs bg-blue-600 text-white"><Send className="w-3 h-3 mr-1" />RFQ</Badge>
                  )}
                  {item.overallStatus === 'QUOTED' && (
                    <Badge className="text-xs bg-orange-500 text-white"><FileText className="w-3 h-3 mr-1" />Quoted</Badge>
                  )}
                  {item.overallStatus === 'AWARDED' && (
                    <Badge className="text-xs bg-green-600 text-white"><Trophy className="w-3 h-3 mr-1" />Awarded</Badge>
                  )}
                </div>
              </div>
            ))}
            {filteredItems.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {statusFilter === 'all' ? 'No materials found' : 'No materials with this status'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Vendors */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-semibold">Available Vendors ({vendors.length})</h3>
          {vendors.map((vendor: any) => {
            const vendorId = vendor.id || vendor.vendorId;
            const isSelected = selectedVendors.has(vendorId);
            return (
              <Card
                key={vendorId}
                className={cn(
                  'cursor-pointer transition-colors',
                  isSelected && 'ring-2 ring-primary'
                )}
                onClick={() => toggleVendor(vendorId)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{vendor.name || vendor.vendorName}</span>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{vendor.email}</div>
                      <div className="flex gap-1 mt-2">
                        {(vendor.trades || []).map((t: string) => (
                          <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      {vendor.estimatedCost > 0 && (
                        <div className="text-lg font-bold text-green-600">${vendor.estimatedCost?.toLocaleString()}</div>
                      )}
                      {vendor.coverage > 0 && (
                        <div className="text-sm text-muted-foreground">
                          Coverage: {vendor.coverage?.toFixed(0)}%
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
