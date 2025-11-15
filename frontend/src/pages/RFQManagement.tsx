import React from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';

export default function RFQManagement() {
  const { projectId } = useParams();

  return (
    <Layout>
      <div style={{ padding: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>
          RFQ Management - Project {projectId}
        </h1>
        
        <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
          <p style={{ color: '#6b7280' }}>RFQ management interface coming soon...</p>
        </div>
      </div>
    </Layout>
  );
}
