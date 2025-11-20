import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FolderKanban, Upload, Search, Users, FileText, Loader2, AlertCircle, CheckCircle2, Calendar, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [importingJobId, setImportingJobId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('available');
  const navigate = useNavigate();

  const loadProjects = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/projects`);
      setProjects(response.data);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableJobs = async () => {
    setJobsLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_URL}/projects/available-takeoff-jobs`);
      setAvailableJobs(response.data.jobs || []);
      if (response.data.message) {
        setError(response.data.message);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load available jobs');
    } finally {
      setJobsLoading(false);
    }
  };

  const handleImportJob = async (jobId: string) => {
    setImportingJobId(jobId);
    setError('');
    try {
      await axios.post(`${API_URL}/projects/import/${jobId}`);
      await loadProjects();
      await loadAvailableJobs();
      setActiveTab('imported');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Import failed');
    } finally {
      setImportingJobId(null);
    }
  };

  useEffect(() => {
    loadProjects();
    loadAvailableJobs();
  }, []);

  const formatDate = (date: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground mt-2">Import and manage your construction projects</p>
          </div>
        </div>

        {error && error.trim() && (
          <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="available">
              <Upload className="w-4 h-4 mr-2" />
              Available Takeoffs ({availableJobs.filter(j => !j.isImported).length})
            </TabsTrigger>
            <TabsTrigger value="imported">
              <FolderKanban className="w-4 h-4 mr-2" />
              Imported Projects ({projects.length})
            </TabsTrigger>
          </TabsList>

          {/* Available Takeoff Jobs Tab */}
          <TabsContent value="available" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Available Takeoff Jobs</CardTitle>
                    <CardDescription>Select completed takeoff jobs to import into GC Interface</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={loadAvailableJobs} disabled={jobsLoading}>
                    {jobsLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {jobsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : availableJobs.length === 0 ? (
                  <div className="text-center py-12">
                    <Layers className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-lg font-medium text-muted-foreground mb-2">No Takeoff Jobs Available</p>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      The takeoff database connection is not configured yet. Set the <code className="px-1 py-0.5 bg-muted rounded text-xs">TAKEOFF_DATABASE_URL</code> environment variable to connect to your existing takeoff system.
                    </p>
                    <p className="text-sm text-muted-foreground mt-4">
                      For now, you can manually create projects or configure the takeoff database connection in Railway.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job ID</TableHead>
                        <TableHead>Filename</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Area (SF)</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {availableJobs.map((job) => (
                        <TableRow key={job.id} className={cn(job.isImported && 'opacity-50')}>
                          <TableCell className="font-mono text-xs">{job.id.substring(0, 8)}...</TableCell>
                          <TableCell className="font-medium">{job.filename || 'Untitled'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              {formatDate(job.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell>{job.totalArea ? job.totalArea.toFixed(0) : 'N/A'}</TableCell>
                          <TableCell>
                            {job.isImported ? (
                              <Badge variant="secondary" className="gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Imported
                              </Badge>
                            ) : (
                              <Badge>{job.status}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => handleImportJob(job.id)}
                              disabled={job.isImported || importingJobId === job.id}
                            >
                              {importingJobId === job.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Importing...
                                </>
                              ) : job.isImported ? (
                                'Imported'
                              ) : (
                                <>
                                  <Upload className="w-4 h-4 mr-2" />
                                  Import
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Imported Projects Tab */}
          <TabsContent value="imported" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Projects</CardTitle>
                <CardDescription>
                  {projects.length === 0 ? 'No projects yet' : `${projects.length} project${projects.length !== 1 ? 's' : ''} found`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : projects.length === 0 ? (
                  <div className="text-center py-12">
                    <FolderKanban className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground mb-4">No projects yet. Import a takeoff job to get started.</p>
                    <Button variant="outline" onClick={() => setActiveTab('available')}>
                      <Upload className="w-4 h-4 mr-2" />
                      View Available Jobs
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {projects.map((project: any) => (
                      <Card 
                        key={project.id} 
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => navigate(`/projects/${project.id}`)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold mb-1">{project.name || 'Unnamed Project'}</h3>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                                <span className="flex items-center gap-1">
                                  <Search className="w-4 h-4" />
                                  {project.location || 'No location'}
                                </span>
                                {project.totalSF && (
                                  <span className="flex items-center gap-1">
                                    <FileText className="w-4 h-4" />
                                    {project.totalSF.toFixed(0)} SF
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {formatDate(project.createdAt)}
                                </span>
                              </div>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                {project.status || 'ACTIVE'}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/vendor-matching/${project.id}`);
                                }}
                              >
                                <Users className="w-4 h-4 mr-2" />
                                Match Vendors
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/rfq/${project.id}`);
                                }}
                              >
                                <FileText className="w-4 h-4 mr-2" />
                                Manage RFQs
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}