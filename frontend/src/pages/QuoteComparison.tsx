import React from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';

export default function QuoteComparison() {
  const { projectId } = useParams();

  return (
    <Layout>
      <div style={{ padding: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>
          Quote Comparison - Project {projectId}
        </h1>
        
        <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
          <p style={{ color: '#6b7280' }}>Bid leveling and quote comparison coming soon...</p>
        </div>
      </div>
    </Layout>
  );
}
