import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Package, CheckCircle2, Loader2, ArrowLeft, Mail, Phone, Star, Wrench, Zap, Droplet, Building } from 'lucide-react';
import { cn } from '@/lib/utils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const tradeIcons: Record<string, any> = {
  M: Wrench,
  P: Droplet,
  E: Zap,
  A: Building,
};

const tradeLabels: Record<string, string> = {
  M: 'Mechanical',
  P: 'Plumbing',
  E: 'Electrical',
  A: 'Architectural',
};

export default function VendorMatching() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [materialsNeeded, setMaterialsNeeded] = useState<any>({});
  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVendorMatching();
  }, [projectId]);

  const loadVendorMatching = async () => {
    try {
      // Load BOM items for this project
      const bomResponse = await axios.get(`${API_URL}/bom?projectId=${projectId}`);
      const bomItems = bomResponse.data.items || [];
      
      // Group materials by trade
      const grouped: Record<string, any[]> = {};
      bomItems.forEach((item: any) => {
        const trade = item.material?.trade || item.category?.substring(0, 1) || 'A';
        if (!grouped[trade]) {
          grouped[trade] = [];
        }
        grouped[trade].push({
          id: item.id,
          description: item.description,
          qty: item.finalQty || item.quantity,
          uom: item.uom,
          category: item.category,
        });
      });
      
      setMaterialsNeeded(grouped);
      
      // Load all vendors
      const vendorsResponse = await axios.get(`${API_URL}/vendors`);
      setVendors(vendorsResponse.data || []);
    } catch (error) {
      console.error('Failed to load vendor matching:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleVendor = (vendorId: string) => {
    const newSelected = new Set(selectedVendors);
    if (newSelected.has(vendorId)) {
      newSelected.delete(vendorId);
    } else {
      newSelected.add(vendorId);
    }
    setSelectedVendors(newSelected);
  };

  const getRemainingMaterials = () => {
    const covered = new Set<string>();
    
    selectedVendors.forEach(vendorId => {
      const vendor = vendors.find(v => v.id === vendorId);
      if (vendor) {
        vendor.trades?.forEach((trade: string) => {
          materialsNeeded[trade]?.forEach((material: any) => {
            covered.add(material.id || `${trade}-${material.description}`);
          });
        });
      }
    });

    const remaining: any = {};
    Object.keys(materialsNeeded).forEach(trade => {
      const uncovered = materialsNeeded[trade]?.filter((m: any) => 
        !covered.has(m.id || `${trade}-${m.description}`)
      ) || [];
      if (uncovered.length > 0) {
        remaining[trade] = uncovered;
      }
    });

    return remaining;
  };

  const remaining = getRemainingMaterials();
  const totalRemaining = Object.values(remaining).reduce((sum: number, items: any) => sum + items.length, 0);
  const totalMaterials = Object.values(materialsNeeded).reduce((sum: number, items: any) => sum + items.length, 0);
  const coveragePercent = totalMaterials > 0 ? Math.round(((totalMaterials - totalRemaining) / totalMaterials) * 100) : 0;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/projects')} className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </Button>
            <h1 className="text-4xl font-bold tracking-tight">Vendor Matching</h1>
            <p className="text-muted-foreground mt-2">Select vendors to cover all project materials</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Coverage Progress */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Material Coverage</span>
                  <span className="text-sm font-bold">{coveragePercent}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className={cn(
                      "h-2 rounded-full transition-all duration-500",
                      coveragePercent === 100 ? "bg-green-600" : "bg-primary"
                    )}
                    style={{ width: `${coveragePercent}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {totalMaterials - totalRemaining} of {totalMaterials} materials covered
                </p>
              </CardContent>
            </Card>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* LEFT PANEL: Materials Needed */}
              <Card className="lg:sticky lg:top-20 lg:h-[calc(100vh-8rem)] lg:overflow-y-auto">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      <CardTitle>Materials Needed</CardTitle>
                    </div>
                    {totalRemaining > 0 && (
                      <Badge variant="destructive">{totalRemaining} remaining</Badge>
                    )}
                  </div>
                  <CardDescription>
                    Select vendors to cover these materials
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {Object.keys(remaining).length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-600" />
                      <p className="text-lg font-semibold text-green-600">All materials covered!</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        All materials are covered by selected vendors
                      </p>
                    </div>
                  ) : (
                    Object.keys(remaining).map(trade => {
                      const TradeIcon = tradeIcons[trade] || Package;
                      return (
                        <div key={trade} className="space-y-3">
                          <div className="flex items-center gap-2">
                            <TradeIcon className="w-4 h-4 text-muted-foreground" />
                            <h3 className="font-semibold text-sm uppercase tracking-wide">
                              {tradeLabels[trade] || trade}
                            </h3>
                            <Badge variant="outline">{remaining[trade].length}</Badge>
                          </div>
                          <div className="space-y-2">
                            {remaining[trade].map((material: any, idx: number) => (
                              <div
                                key={material.id || idx}
                                className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm"
                              >
                                <div className="font-medium text-destructive">
                                  {material.description || 'Unknown material'}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {material.qty} {material.uom || 'units'}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              {/* RIGHT PANEL: Vendor Cards */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Available Vendors</h2>
                  <Badge variant="outline">{vendors.length} vendors</Badge>
                </div>
                <div className="grid gap-4">
                  {vendors.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground">No vendors available</p>
                      </CardContent>
                    </Card>
                  ) : (
                    vendors.map(vendor => {
                      const isSelected = selectedVendors.has(vendor.id);
                      return (
                        <Card
                          key={vendor.id}
                          className={cn(
                            "cursor-pointer transition-all hover:shadow-lg",
                            isSelected && "ring-2 ring-primary shadow-lg"
                          )}
                          onClick={() => toggleVendor(vendor.id)}
                        >
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="text-lg font-semibold">{vendor.name}</h3>
                                  {isSelected && (
                                    <CheckCircle2 className="w-5 h-5 text-primary" />
                                  )}
                                </div>
                                
                                <div className="space-y-2 text-sm text-muted-foreground mb-4">
                                  {vendor.email && (
                                    <div className="flex items-center gap-2">
                                      <Mail className="w-4 h-4" />
                                      {vendor.email}
                                    </div>
                                  )}
                                  {vendor.phone && (
                                    <div className="flex items-center gap-2">
                                      <Phone className="w-4 h-4" />
                                      {vendor.phone}
                                    </div>
                                  )}
                                  {vendor.rating && (
                                    <div className="flex items-center gap-2">
                                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                      {vendor.rating.toFixed(1)}/5.0
                                    </div>
                                  )}
                                </div>

                                {vendor.trades && vendor.trades.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {vendor.trades.map((trade: string) => {
                                      const TradeIcon = tradeIcons[trade] || Package;
                                      return (
                                        <Badge key={trade} variant="secondary" className="gap-1">
                                          <TradeIcon className="w-3 h-3" />
                                          {tradeLabels[trade] || trade}
                                        </Badge>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {selectedVendors.size} vendor{selectedVendors.size !== 1 ? 's' : ''} selected
                    </p>
                    {totalRemaining > 0 && (
                      <p className="text-xs text-destructive mt-1">
                        ⚠️ {totalRemaining} materials still need coverage
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate('/projects')}>
                      Cancel
                    </Button>
                    <Button
                      onClick={async () => {
                        try {
                          // Save selected vendors
                          await axios.post(`${API_URL}/projects/${projectId}/selected-vendors`, {
                            vendorIds: Array.from(selectedVendors),
                          });
                          // Navigate to RFQ page
                          navigate(`/rfq/${projectId}`);
                        } catch (error) {
                          console.error('Failed to save vendors:', error);
                          alert('Failed to save selected vendors');
                        }
                      }}
                      disabled={selectedVendors.size === 0}
                    >
                      Create RFQs ({selectedVendors.size})
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}