import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const quickActions = [
    {
      title: 'Projects',
      description: 'View and manage your projects',
      icon: '📁',
      action: () => navigate('/projects'),
      color: '#3b82f6',
    },
    {
      title: 'Vendors',
      description: 'Manage vendors and subcontractors',
      icon: '🏢',
      action: () => navigate('/admin'),
      color: '#8b5cf6',
    },
    {
      title: 'Admin Center',
      description: 'Configure rules, markups, and templates',
      icon: '⚙️',
      action: () => navigate('/admin'),
      color: '#6366f1',
    },
  ];

  return (
    <Layout>
      <div style={{ padding: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
          Welcome back, {user?.name}
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '32px' }}>
          Post-Takeoff Estimation & Procurement Dashboard
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          {quickActions.map((action, index) => (
            <div
              key={index}
              onClick={action.action}
              className="card"
              style={{
                padding: '24px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>{action.icon}</div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                {action.title}
              </h3>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>
                {action.description}
              </p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '40px', padding: '24px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Quick Stats
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
            <div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2563eb' }}>0</div>
              <div style={{ color: '#6b7280', fontSize: '14px' }}>Active Projects</div>
            </div>
            <div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#8b5cf6' }}>0</div>
              <div style={{ color: '#6b7280', fontSize: '14px' }}>Pending RFQs</div>
            </div>
            <div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>0</div>
              <div style={{ color: '#6b7280', fontSize: '14px' }}>Quotes Received</div>
            </div>
            <div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b' }}>$0</div>
              <div style={{ color: '#6b7280', fontSize: '14px' }}>Total Value</div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
