import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from 'axios';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FolderKanban, Loader2, Trash2, PlusCircle } from 'lucide-react';

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

function getWizardStep(project: any) {
  if (project.wizardStep) return project.wizardStep;
  const map: Record<string, string> = {
    SCOPE_DIAGNOSIS: project.takeoffJobId ? 'review' : 'upload',
    BOM_GENERATION: 'review',
    VENDOR_MATCHING: 'vendors',
    RFQ_SENT: 'rfqs',
    QUOTE_COMPARISON: 'dashboard',
    AWARD_PENDING: 'dashboard',
    AWARDED: 'dashboard',
  };
  return map[project.status] || 'dashboard';
}

export default function Projects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/projects`);
      setProjects(response.data || []);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) return;
    try {
      await axios.delete(`${API_URL}/projects/${projectId}`);
      setProjects(projects.filter((p) => p.id !== projectId));
    } catch (err) {
      console.error('Failed to delete project:', err);
      alert('Failed to delete project');
    }
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground mt-2">{projects.length} projects</p>
          </div>
          <Button onClick={() => navigate('/projects/new')}>
            <PlusCircle className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-16">
                <FolderKanban className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-semibold mb-2">No projects yet</p>
                <p className="text-muted-foreground mb-4">Start by creating a new project</p>
                <Button onClick={() => navigate('/projects/new')}>
                  <PlusCircle className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[240px]">Project</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                      <TableHead className="whitespace-nowrap">Due Date</TableHead>
                      <TableHead className="whitespace-nowrap text-right">Area (SF)</TableHead>
                      <TableHead className="whitespace-nowrap text-right">RFQs</TableHead>
                      <TableHead className="whitespace-nowrap">Created</TableHead>
                      <TableHead className="whitespace-nowrap text-right min-w-[180px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((project: any) => (
                      <TableRow
                        key={project.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/projects/${project.id}`)}
                      >
                        <TableCell>
                          <div className="font-semibold">{project.name}</div>
                          <div className="text-sm text-muted-foreground">{project.location || 'No location'}</div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge className={getStatusColor(project.status)}>
                            {project.status?.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(project.dueDate)}</TableCell>
                        <TableCell className="whitespace-nowrap text-right">{project.totalSF ? Number(project.totalSF).toLocaleString() : '-'}</TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          {project.rfqsSent > 0 ? `${project.rfqsSent}/${project.quotesReceived || 0}` : '-'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(project.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/projects/new?resume=${project.id}&step=${getWizardStep(project)}`);
                              }}
                            >
                              Continue
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => deleteProject(project.id, e)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
