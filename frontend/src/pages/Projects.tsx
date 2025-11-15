import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importJobId, setImportJobId] = useState('');
  const navigate = useNavigate();

  const handleImportProject = async () => {
    if (!importJobId) return;
    
    setLoading(true);
    try {
      await axios.post(`${API_URL}/projects/import/${importJobId}`);
      alert('Project imported successfully!');
      setImportJobId('');
      loadProjects();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await axios.get(`${API_URL}/projects`);
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  React.useEffect(() => {
    loadProjects();
  }, []);

  return (
    <Layout>
      <div style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Projects</h1>
        </div>

        {/* Import Section */}
        <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Import Project from Takeoff
          </h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              placeholder="Takeoff Job ID"
              value={importJobId}
              onChange={(e) => setImportJobId(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
              }}
            />
            <button
              onClick={handleImportProject}
              disabled={loading || !importJobId}
              style={{
                padding: '10px 24px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading || !importJobId ? 0.5 : 1,
              }}
            >
              {loading ? 'Importing...' : 'Import Project'}
            </button>
          </div>
        </div>

        {/* Projects List */}
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Your Projects
          </h2>
          
          {projects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <p>No projects yet. Import a project from takeoff to get started.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Total SF</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project: any) => (
                  <tr key={project.id}>
                    <td>{project.name}</td>
                    <td>{project.location}</td>
                    <td>
                      <span style={{
                        padding: '4px 12px',
                        backgroundColor: '#dbeafe',
                        color: '#1e40af',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}>
                        {project.status}
                      </span>
                    </td>
                    <td>{project.totalSF?.toFixed(0) || '-'} SF</td>
                    <td>
                      <button
                        onClick={() => navigate(`/vendor-matching/${project.id}`)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#f3f4f6',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          fontSize: '13px',
                          marginRight: '8px',
                        }}
                      >
                        Match Vendors
                      </button>
                      <button
                        onClick={() => navigate(`/rfq/${project.id}`)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#f3f4f6',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          fontSize: '13px',
                        }}
                      >
                        Manage RFQs
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}
