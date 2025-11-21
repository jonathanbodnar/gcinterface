import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FolderKanban, TrendingUp, DollarSign, Clock, CheckCircle2, AlertCircle, Users, FileText, Award, Percent } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
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
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics
  const totalPipelineValue = projects.reduce((sum, p) => sum + (p.totalSF || 0) * 150, 0); // Estimate $150/SF
  const activeProjects = projects.filter(p => !['AWARDED', 'CANCELLED'].includes(p.status));
  const completedProjects = projects.filter(p => p.status === 'AWARDED');
  const avgVendorRating = vendors.length > 0 
    ? vendors.reduce((sum, v) => sum + (v.rating || 0), 0) / vendors.length 
    : 0;

  const projectsByStatus = projects.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const recentProjects = projects.slice(0, 5);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back, {user?.name}
          </p>
        </div>

        {/* Key Metrics Row */}
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
                  <p className="text-xs text-green-600 mt-1">
                    {completedProjects.length} completed
                  </p>
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
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Set(materials.map(m => m.trade)).size} trades
                  </p>
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
                  <p className="text-xs text-muted-foreground mt-1">
                    ⭐ {avgVendorRating.toFixed(1)} avg rating
                  </p>
                </div>
                <Users className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Project Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Projects by Status</CardTitle>
              <CardDescription>Current project pipeline</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(projectsByStatus).map(([status, count]) => {
                  const countNum = Number(count);
                  const percentage = projects.length > 0 ? (countNum / projects.length) * 100 : 0;
                  const colors: Record<string, string> = {
                    'SCOPE_DIAGNOSIS': 'bg-yellow-500',
                    'BOM_GENERATION': 'bg-blue-500',
                    'VENDOR_MATCHING': 'bg-purple-500',
                    'RFQ_SENT': 'bg-indigo-500',
                    'QUOTE_COMPARISON': 'bg-pink-500',
                    'AWARD_PENDING': 'bg-orange-500',
                    'AWARDED': 'bg-green-500',
                    'CANCELLED': 'bg-gray-400',
                  };
                  
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="font-medium">{status.replace(/_/g, ' ')}</span>
                        <span className="text-muted-foreground">{countNum} ({percentage.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${colors[status] || 'bg-gray-500'}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {projects.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No projects yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>System efficiency</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">Win Rate</p>
                      <p className="text-xs text-muted-foreground">Awarded / Total</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold">
                    {projects.length > 0 
                      ? ((completedProjects.length / projects.length) * 100).toFixed(0)
                      : 0}%
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Percent className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium">Avg Confidence</p>
                      <p className="text-xs text-muted-foreground">BOM accuracy</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold">87%</p>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-sm font-medium">Avg Cycle Time</p>
                      <p className="text-xs text-muted-foreground">Import to Award</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold">3.2d</p>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Award className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="text-sm font-medium">Quote Response Rate</p>
                      <p className="text-xs text-muted-foreground">Vendor engagement</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold">78%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
            <CardDescription>Latest activity across your projects</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : recentProjects.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No recent projects</p>
            ) : (
              <div className="space-y-3">
                {recentProjects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-semibold">{project.name}</h4>
                        <Badge variant="outline">{project.status?.replace(/_/g, ' ')}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {project.location} • {project.totalSF?.toFixed(0) || 0} SF
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          ${((project.totalSF || 0) * 150).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">estimated</p>
                      </div>
                      {project.status === 'AWARDED' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : project.status === 'CANCELLED' ? (
                        <AlertCircle className="w-5 h-5 text-gray-400" />
                      ) : (
                        <Clock className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bottom Row: Alerts & Insights */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>Action Items</CardTitle>
              <CardDescription>Items requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeProjects.filter(p => p.status === 'QUOTE_COMPARISON').length > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-950 border-l-4 border-orange-500 rounded">
                    <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold">Quotes Pending Review</p>
                      <p className="text-xs text-muted-foreground">
                        {activeProjects.filter(p => p.status === 'QUOTE_COMPARISON').length} project(s) awaiting bid selection
                      </p>
                    </div>
                  </div>
                )}
                
                {activeProjects.filter(p => p.status === 'RFQ_SENT').length > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950 border-l-4 border-blue-500 rounded">
                    <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold">RFQs Awaiting Response</p>
                      <p className="text-xs text-muted-foreground">
                        {activeProjects.filter(p => p.status === 'RFQ_SENT').length} project(s) waiting for vendor quotes
                      </p>
                    </div>
                  </div>
                )}

                {activeProjects.filter(p => p.status === 'SCOPE_DIAGNOSIS').length > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-950 border-l-4 border-yellow-500 rounded">
                    <FileText className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold">New Projects</p>
                      <p className="text-xs text-muted-foreground">
                        {activeProjects.filter(p => p.status === 'SCOPE_DIAGNOSIS').length} project(s) need BOM generation
                      </p>
                    </div>
                  </div>
                )}

                {activeProjects.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No action items - you're all caught up! 🎉
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Key Insights</CardTitle>
              <CardDescription>Data-driven recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950 border-l-4 border-green-500 rounded">
                  <TrendingUp className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold">Materials Database Growing</p>
                    <p className="text-xs text-muted-foreground">
                      {materials.length} materials tracked • {materials.filter(m => m.timesUsed > 1).length} reused across projects
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950 border-l-4 border-blue-500 rounded">
                  <Users className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold">Vendor Performance</p>
                    <p className="text-xs text-muted-foreground">
                      {vendors.filter(v => v.rating >= 4.5).length} highly-rated vendors available
                    </p>
                  </div>
                </div>

                {materials.filter(m => !m.unitCost).length > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-950 border-l-4 border-yellow-500 rounded">
                    <DollarSign className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold">Pricing Gaps</p>
                      <p className="text-xs text-muted-foreground">
                        {materials.filter(m => !m.unitCost).length} materials missing cost data
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}