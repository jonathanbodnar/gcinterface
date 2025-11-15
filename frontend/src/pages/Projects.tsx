import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FolderKanban, Upload, Search, Users, FileText, Loader2, AlertCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importJobId, setImportJobId] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleImportProject = async () => {
    if (!importJobId) return;
    
    setImportLoading(true);
    setError('');
    try {
      await axios.post(`${API_URL}/projects/import/${importJobId}`);
      setImportJobId('');
      loadProjects();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Import failed');
    } finally {
      setImportLoading(false);
    }
  };

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

  useEffect(() => {
    loadProjects();
  }, []);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground mt-2">Manage your construction projects</p>
          </div>
        </div>

        {/* Import Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              <CardTitle>Import Project from Takeoff</CardTitle>
            </div>
            <CardDescription>
              Import a project from the takeoff system using the job ID
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="jobId">Takeoff Job ID</Label>
                <Input
                  id="jobId"
                  placeholder="Enter job ID"
                  value={importJobId}
                  onChange={(e) => setImportJobId(e.target.value)}
                  disabled={importLoading}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleImportProject}
                  disabled={importLoading || !importJobId}
                >
                  {importLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Import
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projects List */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FolderKanban className="w-5 h-5" />
              <CardTitle>Your Projects</CardTitle>
            </div>
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
                <p className="text-muted-foreground mb-4">No projects yet. Import a project from takeoff to get started.</p>
                <Button variant="outline" onClick={() => document.getElementById('jobId')?.focus()}>
                  <Upload className="w-4 h-4 mr-2" />
                  Import Your First Project
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map((project: any) => (
                  <Card key={project.id} className="hover:shadow-md transition-shadow">
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
                          </div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                            {project.status || 'ACTIVE'}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/vendor-matching/${project.id}`)}
                          >
                            <Users className="w-4 h-4 mr-2" />
                            Match Vendors
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/rfq/${project.id}`)}
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
      </div>
    </Layout>
  );
}