import Layout from '../components/Layout';

export default function AdminCenter() {
  return (
    <Layout>
      <div style={{ padding: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>
          Admin Center
        </h1>
        
        <div style={{ display: 'grid', gap: '24px' }}>
          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              Material Rules
            </h2>
            <p style={{ color: '#6b7280' }}>Configure cost per unit and labor rates...</p>
          </div>

          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              Trade Markups
            </h2>
            <p style={{ color: '#6b7280' }}>Set markup percentages by trade...</p>
          </div>

          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              Vendor Management
            </h2>
            <p style={{ color: '#6b7280' }}>Upload vendors from Excel, manage contacts...</p>
          </div>

          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              Email Templates
            </h2>
            <p style={{ color: '#6b7280' }}>Customize RFQ, award, and non-award email templates...</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
