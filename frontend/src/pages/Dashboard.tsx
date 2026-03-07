import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FolderKanban, DollarSign, Users, FileText, PlayCircle, PlusCircle } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    SCOPE_DIAGNOSIS: 'bg-yellow-100 text-yellow-800',
    BOM_GENERATION: 'bg-blue-100 text-blue-800',
    VENDOR_MATCHING: 'bg-purple-100 text-purple-800',
    RFQ_SENT: 'bg-indigo-100 text-indigo-800',
    QUOTE_COMPARISON: 'bg-pink-100 text-pink-800',
    AWARD_PENDING: 'bg-orange-100 text-orange-800',
    AWARDED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

function getWizardStep(status: string) {
  const map: Record<string, string> = {
    SCOPE_DIAGNOSIS: 'review',
    BOM_GENERATION: 'review',
    VENDOR_MATCHING: 'vendors',
    RFQ_SENT: 'rfqs',
    QUOTE_COMPARISON: 'dashboard',
    AWARD_PENDING: 'dashboard',
    AWARDED: 'dashboard',
  };
  return map[status] || 'dashboard';
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [estimates, setEstimates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [projectsRes, materialsRes, vendorsRes] = await Promise.all([
        axios.get(`${API_URL}/projects`).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/materials`).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/vendors`).catch(() => ({ data: [] })),
      ]);

      setProjects(projectsRes.data || []);
      setMaterials(materialsRes.data || []);
      setVendors(vendorsRes.data || []);

      const projectEstimates = await Promise.all(
        (projectsRes.data || []).map(async (project: any) => {
          try {
            const bomRes = await axios.get(`${API_URL}/bom?projectId=${project.id}`);
            return { projectId: project.id, totalCost: bomRes.data.summary?.totalCost || 0 };
          } catch {
            return { projectId: project.id, totalCost: 0 };
          }
        })
      );
      setEstimates(projectEstimates);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPipelineValue = estimates.reduce((sum, e) => sum + e.totalCost, 0);
  const activeProjects = projects.filter((p) => !['AWARDED', 'CANCELLED'].includes(p.status));
  const completedProjects = projects.filter((p) => p.status === 'AWARDED');

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-2">Welcome back, {user?.name}</p>
          </div>
          <Button onClick={() => navigate('/projects/new')}>
            <PlusCircle className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pipeline Value</p>
                  <p className="text-3xl font-bold">${(totalPipelineValue / 1000000).toFixed(2)}M</p>
                  <p className="text-xs text-muted-foreground mt-1">{projects.length} projects</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
                  <p className="text-3xl font-bold">{activeProjects.length}</p>
                  <p className="text-xs text-green-600 mt-1">{completedProjects.length} completed</p>
                </div>
                <FolderKanban className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Materials Database</p>
                  <p className="text-3xl font-bold">{materials.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Set(materials.map((m) => m.trade)).size} trades</p>
                </div>
                <FileText className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Vendor Network</p>
                  <p className="text-3xl font-bold">{vendors.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">{vendors.filter((v) => v.type === 'MATERIAL_SUPPLIER').length} suppliers</p>
                </div>
                <Users className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>All Projects</CardTitle>
              <CardDescription>{projects.length} projects in pipeline</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/projects')}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : projects.length === 0 ? (
              <div className="text-center py-12">
                <FolderKanban className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-4">No projects yet</p>
                <Button onClick={() => navigate('/projects/new')}>
                  <PlusCircle className="w-4 h-4 mr-2" /> New Project
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Est. Cost</TableHead>
                    <TableHead className="text-right">RFQs</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => {
                    const est = estimates.find((e) => e.projectId === project.id);
                    return (
                      <TableRow
                        key={project.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/projects/${project.id}`)}
                      >
                        <TableCell className="font-semibold">{project.name}</TableCell>
                        <TableCell className="text-muted-foreground">{project.location || '-'}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(project.status)}>
                            {project.status?.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(project.dueDate)}</TableCell>
                        <TableCell className="text-right">${(est?.totalCost || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          {project.rfqsSent > 0 ? `${project.rfqsSent}/${project.quotesReceived || 0}` : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/projects/new?resume=${project.id}&step=${getWizardStep(project.status)}`);
                            }}
                          >
                            <PlayCircle className="w-4 h-4 mr-1" />
                            Continue
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pipeline & Performance - Condensed Row */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pipeline by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(
                  projects.reduce((acc: Record<string, number>, p: any) => {
                    acc[p.status] = (acc[p.status] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([status, count]) => {
                  const pct = projects.length > 0 ? ((count as number) / projects.length) * 100 : 0;
                  const colors: Record<string, string> = {
                    SCOPE_DIAGNOSIS: 'bg-yellow-500', BOM_GENERATION: 'bg-blue-500',
                    VENDOR_MATCHING: 'bg-purple-500', RFQ_SENT: 'bg-indigo-500',
                    QUOTE_COMPARISON: 'bg-pink-500', AWARD_PENDING: 'bg-orange-500',
                    AWARDED: 'bg-green-500', CANCELLED: 'bg-gray-400',
                  };
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <div className="w-32 text-xs font-medium truncate">{status.replace(/_/g, ' ')}</div>
                      <div className="flex-1 bg-secondary rounded-full h-2">
                        <div className={`h-2 rounded-full ${colors[status] || 'bg-gray-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="w-8 text-xs text-right text-muted-foreground">{count as number}</div>
                    </div>
                  );
                })}
                {projects.length === 0 && <p className="text-sm text-muted-foreground">No projects yet</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">
                    {projects.length > 0 ? ((completedProjects.length / projects.length) * 100).toFixed(0) : 0}%
                  </div>
                  <div className="text-xs text-muted-foreground">Win Rate</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">
                    {projects.reduce((s: number, p: any) => s + (p.rfqsSent || 0), 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Total RFQs Sent</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">
                    {projects.reduce((s: number, p: any) => s + (p.quotesReceived || 0), 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Quotes Received</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">
                    {(() => {
                      const sent = projects.reduce((s: number, p: any) => s + (p.rfqsSent || 0), 0);
                      const rcvd = projects.reduce((s: number, p: any) => s + (p.quotesReceived || 0), 0);
                      return sent > 0 ? ((rcvd / sent) * 100).toFixed(0) : 0;
                    })()}%
                  </div>
                  <div className="text-xs text-muted-foreground">Response Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
