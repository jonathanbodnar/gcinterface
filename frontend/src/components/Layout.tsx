import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { label: 'Dashboard', path: '/' },
    { label: 'Projects', path: '/projects' },
    { label: 'Admin', path: '/admin' },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation */}
      <nav style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold' }}>GC Interface</h1>
          <div style={{ display: 'flex', gap: '24px' }}>
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  padding: '8px 12px',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '14px', color: '#6b7280' }}>
            {user?.name} ({user?.role})
          </span>
          <button
            onClick={logout}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        {children}
      </main>
    </div>
  );
}
