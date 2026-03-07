import { useState, useEffect } from 'react';
import { useWizard } from '../../contexts/ProjectWizardContext';
import { takeoffApi } from '../../services/takeoffApi';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function StepReviewBOM() {
  const { projectId, takeoffJobId, setProjectId } = useWizard();
  const [bomItems, setBomItems] = useState<any[]>([]);
  const [takeoffMaterials, setTakeoffMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadData();
  }, [projectId, takeoffJobId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load takeoff materials if we have a job
      if (takeoffJobId) {
        try {
          const matData = await takeoffApi.getMaterials(takeoffJobId);
          setTakeoffMaterials(matData?.items || []);
        } catch { /* takeoff materials optional */ }
      }

      // Load BOM if project already imported
      if (projectId) {
        const bomResponse = await axios.get(`${API_URL}/bom?projectId=${projectId}`);
        setBomItems(bomResponse.data?.items || []);
      }
    } catch (err) {
      console.error('Failed to load BOM data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImportProject = async () => {
    if (!takeoffJobId) return;
    setImporting(true);
    try {
      const response = await axios.post(`${API_URL}/projects/import/${takeoffJobId}`, {
        projectId: projectId || undefined,
      });
      const newProjectId = response.data.project?.id;
      if (newProjectId) {
        setProjectId(newProjectId);
        const bomResponse = await axios.get(`${API_URL}/bom?projectId=${newProjectId}`);
        setBomItems(bomResponse.data?.items || []);
      }
    } catch (err) {
      console.error('Failed to import project:', err);
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If no project imported yet, show import button
  if (!projectId) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Review Bill of Materials</h2>
          <p className="text-muted-foreground">Import your takeoff data to generate the BOM</p>
        </div>

        {takeoffMaterials.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Takeoff Materials Preview</CardTitle>
              <CardDescription>{takeoffMaterials.length} materials extracted from plans</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-y-auto">
                {takeoffMaterials.slice(0, 10).map((m: any, i: number) => (
                  <div key={i} className="flex justify-between py-2 border-b last:border-0 text-sm">
                    <span>{m.description}</span>
                    <span className="text-muted-foreground">{m.qty} {m.uom}</span>
                  </div>
                ))}
                {takeoffMaterials.length > 10 && (
                  <p className="text-sm text-muted-foreground pt-2">... and {takeoffMaterials.length - 10} more</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Button onClick={handleImportProject} disabled={importing || !takeoffJobId} size="lg" className="w-full">
          {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          Import Project & Generate BOM
        </Button>
      </div>
    );
  }

  // Show BOM table
  const trades = [...new Set(bomItems.map((item: any) => item.material?.trade || item.category?.charAt(0) || 'A'))];
  const totalCost = bomItems.reduce((sum: number, item: any) => sum + (item.totalCost || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Bill of Materials</h2>
          <p className="text-muted-foreground">{bomItems.length} items &middot; {trades.length} trades &middot; ${totalCost.toLocaleString()} estimated</p>
        </div>
      </div>

      {/* Summary by Trade */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {trades.map((trade) => {
          const items = bomItems.filter((i: any) => (i.material?.trade || i.category?.charAt(0) || 'A') === trade);
          const cost = items.reduce((s: number, i: any) => s + (i.totalCost || 0), 0);
          return (
            <Card key={trade}>
              <CardContent className="pt-6">
                <Badge className="mb-2">{trade}</Badge>
                <div className="text-2xl font-bold">{items.length}</div>
                <div className="text-sm text-muted-foreground">${cost.toLocaleString()}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* BOM Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Trade</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>UOM</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bomItems.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.description}</TableCell>
                  <TableCell><Badge variant="outline">{item.material?.trade || 'A'}</Badge></TableCell>
                  <TableCell className="text-right">{item.finalQty?.toFixed(2)}</TableCell>
                  <TableCell>{item.uom}</TableCell>
                  <TableCell className="text-right">${(item.unitCost || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-semibold">${(item.totalCost || 0).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
