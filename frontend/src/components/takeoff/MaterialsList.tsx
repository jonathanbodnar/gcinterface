import { useState, useEffect } from 'react';
import { takeoffApi } from '../../services/takeoffApi';
import { Badge } from '@/components/ui/badge';

interface MaterialItem {
  sku: string;
  description: string;
  qty: number;
  uom: string;
  unitPrice: number;
  totalPrice: number;
  category: string;
  specifications?: Record<string, any>;
  installation?: Record<string, any>;
  accessories?: Array<{ item: string; qty: number; specification: string }>;
  compliance?: Record<string, string>;
  source: { rule?: string; features: string[]; ruleId?: string };
}

interface MaterialsData {
  jobId: string;
  currency: string;
  items: MaterialItem[];
  summary: {
    totalItems: number;
    totalValue: number;
    categories: string[];
    buildingType?: string;
    extractionMethod?: string;
  };
}

export default function TakeoffMaterialsList({ jobId }: { jobId?: string }) {
  const [materials, setMaterials] = useState<MaterialsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (jobId) {
      setLoading(true);
      takeoffApi
        .getMaterials(jobId)
        .then(setMaterials)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [jobId]);

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (error) return <div className="bg-destructive/10 rounded-lg p-4 text-destructive">{error}</div>;
  if (!materials) return <div className="text-muted-foreground">No materials data available</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4 bg-muted/50 rounded-lg p-4">
        <div>
          <div className="text-2xl font-bold">{materials.summary.totalItems}</div>
          <div className="text-sm text-muted-foreground">Total Items</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{fmtCurrency(materials.summary.totalValue)}</div>
          <div className="text-sm text-muted-foreground">Total Value</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{materials.summary.categories?.length || 0}</div>
          <div className="text-sm text-muted-foreground">Categories</div>
        </div>
      </div>

      {materials.items.map((item, idx) => (
        <div key={item.sku || idx} className="border rounded-lg">
          <div
            className="p-4 cursor-pointer hover:bg-muted/50 flex justify-between items-center"
            onClick={() => {
              const next = new Set(expanded);
              next.has(item.sku) ? next.delete(item.sku) : next.add(item.sku);
              setExpanded(next);
            }}
          >
            <div>
              <div className="font-medium">{item.description}</div>
              <div className="text-sm text-muted-foreground">
                <Badge variant="outline" className="mr-2">{item.category}</Badge>
                {item.sku} &middot; {item.qty} {item.uom}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold">{fmtCurrency(item.totalPrice)}</div>
              <div className="text-sm text-muted-foreground">{fmtCurrency(item.unitPrice)} / {item.uom}</div>
            </div>
          </div>

          {expanded.has(item.sku) && (
            <div className="border-t p-4 bg-muted/30 text-sm space-y-3">
              {item.specifications && (
                <div>
                  <p className="font-medium mb-1">Specifications</p>
                  <div className="grid grid-cols-2 gap-1">
                    {Object.entries(item.specifications).map(([k, v]) => (
                      <div key={k}><span className="text-muted-foreground capitalize">{k}:</span> {String(v)}</div>
                    ))}
                  </div>
                </div>
              )}
              {item.source?.rule && (
                <div className="text-xs text-muted-foreground">Rule: {item.source.rule}</div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
