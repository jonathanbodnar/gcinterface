import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWizard } from '../../contexts/ProjectWizardContext';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink, Package, Users, FileText, DollarSign, BarChart3, AlertTriangle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function StepDashboard() {
  const { projectId, setStep } = useWizard();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [bom, setBom] = useState<any>(null);
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) loadData();
  }, [projectId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [projRes, bomRes, rfqRes, quoteRes] = await Promise.all([
        axios.get(`${API_URL}/projects/${projectId}`),
        axios.get(`${API_URL}/bom?projectId=${projectId}`),
        axios.get(`${API_URL}/rfq?projectId=${projectId}`),
        axios.get(`${API_URL}/quotes?projectId=${projectId}`).catch(() => ({ data: [] })),
      ]);
      setProject(projRes.data?.project);
      setBom(bomRes.data);
      setRfqs(rfqRes.data || []);
      setQuotes(quoteRes.data || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!projectId || !project) {
    return <div className="text-center py-16 text-muted-foreground">Complete previous steps first</div>;
  }

  const bomItems = bom?.items || [];
  const totalCost = bomItems.reduce((sum: number, item: any) => sum + (item.totalCost || 0), 0);
  const trades = [...new Set(bomItems.map((i: any) => i.material?.trade || 'A'))] as string[];
  const sentRfqs = rfqs.filter((r: any) => r.status === 'SENT').length;
  const respondedRfqs = rfqs.filter((r: any) => r.status === 'RESPONDED').length;

  // Due date warning
  const dueDate = project.dueDate ? new Date(project.dueDate) : null;
  const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const isDueSoon = daysUntilDue !== null && daysUntilDue <= 7 && daysUntilDue >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{project.name}</h2>
          <p className="text-muted-foreground">{project.location || 'No location'} &middot; {project.totalSF ? `${project.totalSF.toFixed(0)} SF` : ''}</p>
        </div>
        <div className="flex gap-2">
          <Badge>{project.status?.replace(/_/g, ' ')}</Badge>
          <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${projectId}`)}>
            <ExternalLink className="w-4 h-4 mr-2" /> Full Detail
          </Button>
        </div>
      </div>

      {/* Due Date Warning */}
      {isDueSoon && (
        <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-800 dark:text-yellow-200">Due date is in {daysUntilDue} days</p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              {quotes.length === 0 ? 'No quotes received yet.' : `${quotes.length} quotes received.`}
              {sentRfqs > respondedRfqs && ` ${sentRfqs - respondedRfqs} RFQs still awaiting response.`}
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setStep('review')}>
          <CardContent className="pt-6">
            <Package className="w-8 h-8 text-muted-foreground mb-2" />
            <div className="text-2xl font-bold">{bomItems.length}</div>
            <p className="text-sm text-muted-foreground">BOM Items</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <DollarSign className="w-8 h-8 text-muted-foreground mb-2" />
            <div className="text-2xl font-bold">${totalCost.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground">Estimated Cost</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setStep('vendors')}>
          <CardContent className="pt-6">
            <Users className="w-8 h-8 text-muted-foreground mb-2" />
            <div className="text-2xl font-bold">{trades.length}</div>
            <p className="text-sm text-muted-foreground">Trades</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setStep('rfqs')}>
          <CardContent className="pt-6">
            <FileText className="w-8 h-8 text-muted-foreground mb-2" />
            <div className="text-2xl font-bold">{rfqs.length}</div>
            <p className="text-sm text-muted-foreground">RFQs ({sentRfqs} sent)</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Jump to any step to make changes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Button variant="outline" onClick={() => setStep('review')} className="justify-start">
              <Package className="w-4 h-4 mr-2" /> Review BOM
            </Button>
            <Button variant="outline" onClick={() => setStep('vendors')} className="justify-start">
              <Users className="w-4 h-4 mr-2" /> Match Vendors
            </Button>
            <Button variant="outline" onClick={() => setStep('rfqs')} className="justify-start">
              <FileText className="w-4 h-4 mr-2" /> Manage RFQs
            </Button>
            <Button variant="outline" onClick={() => navigate(`/quotes/${projectId}`)} className="justify-start">
              <BarChart3 className="w-4 h-4 mr-2" /> Compare Quotes
            </Button>
            <Button variant="outline" onClick={() => navigate(`/projects/${projectId}/plans`)} className="justify-start">
              <FileText className="w-4 h-4 mr-2" /> View Plans
            </Button>
            <Button variant="outline" onClick={() => navigate(`/contracts/${projectId}`)} className="justify-start">
              <DollarSign className="w-4 h-4 mr-2" /> Contracts
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cost Breakdown by Trade */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown by Trade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {trades.map((trade) => {
              const items = bomItems.filter((i: any) => (i.material?.trade || 'A') === trade);
              const cost = items.reduce((s: number, i: any) => s + (i.totalCost || 0), 0);
              const pct = totalCost > 0 ? (cost / totalCost) * 100 : 0;
              return (
                <div key={trade} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Badge variant="outline">{trade}</Badge>
                      {items.length} items
                    </span>
                    <span className="font-medium">${cost.toLocaleString()} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
