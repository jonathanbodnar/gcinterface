import { useState, useEffect } from 'react';
import { useWizard } from '../../contexts/ProjectWizardContext';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function StepMatchVendors() {
  const { projectId, setSelectedVendorIds } = useWizard();
  const [materialsNeeded, setMaterialsNeeded] = useState<Record<string, any[]>>({});
  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(new Set());
  const [vendorCoverage, setVendorCoverage] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (projectId) loadData();
  }, [projectId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const bomResponse = await axios.get(`${API_URL}/bom?projectId=${projectId}`);
      const bomItems = bomResponse.data?.items || [];

      const grouped: Record<string, any[]> = {};
      bomItems.forEach((item: any) => {
        const trade = item.material?.trade || item.category?.charAt(0) || 'A';
        if (!grouped[trade]) grouped[trade] = [];
        grouped[trade].push({ id: item.id, description: item.description, qty: item.finalQty, uom: item.uom });
      });
      setMaterialsNeeded(grouped);

      try {
        const rankResponse = await axios.get(`${API_URL}/vendors/rank/${projectId}`);
        if (rankResponse.data?.hasData) {
          const vendorsResponse = await axios.get(`${API_URL}/vendors`);
          const rankedVendors = rankResponse.data.rankings.map((r: any) => {
            const vendor = vendorsResponse.data?.find((v: any) => v.id === r.vendorId);
            return { ...vendor, ...r };
          });
          setVendors(rankedVendors);
        } else {
          const vendorsResponse = await axios.get(`${API_URL}/vendors`);
          setVendors(vendorsResponse.data || []);
        }
      } catch {
        const vendorsResponse = await axios.get(`${API_URL}/vendors`);
        setVendors(vendorsResponse.data || []);
      }
    } catch (err) {
      console.error('Failed to load vendor matching data:', err);
    } finally {
      setLoading(false);
    }
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

  const totalMaterials = Object.values(materialsNeeded).reduce((sum, items) => sum + items.length, 0);

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
          <p className="text-muted-foreground">Select vendors to cover {totalMaterials} materials</p>
        </div>
        <Button onClick={saveSelections} disabled={saving || selectedVendors.size === 0}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
          Save Selections ({selectedVendors.size})
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Materials Needed */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Materials Needed</CardTitle>
            <CardDescription>{totalMaterials} items across {Object.keys(materialsNeeded).length} trades</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(materialsNeeded).map(([trade, items]) => (
              <div key={trade}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge>{trade}</Badge>
                  <span className="text-sm text-muted-foreground">{items.length} items</span>
                </div>
                <div className="space-y-1 pl-4">
                  {items.slice(0, 5).map((item) => (
                    <div key={item.id} className="text-sm text-muted-foreground truncate">
                      {item.description} ({item.qty} {item.uom})
                    </div>
                  ))}
                  {items.length > 5 && (
                    <div className="text-xs text-muted-foreground">... +{items.length - 5} more</div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Vendors */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-semibold">Available Vendors ({vendors.length})</h3>
          {vendors.map((vendor: any) => (
            <Card
              key={vendor.id || vendor.vendorId}
              className={cn(
                'cursor-pointer transition-colors',
                selectedVendors.has(vendor.id || vendor.vendorId) && 'ring-2 ring-primary'
              )}
              onClick={() => toggleVendor(vendor.id || vendor.vendorId)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{vendor.name || vendor.vendorName}</span>
                      {selectedVendors.has(vendor.id || vendor.vendorId) && (
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
          ))}
        </div>
      </div>
    </div>
  );
}
