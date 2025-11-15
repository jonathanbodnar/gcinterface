import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function VendorMatching() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [materialsNeeded, setMaterialsNeeded] = useState<any>({});
  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVendorMatching();
  }, [projectId]);

  const loadVendorMatching = async () => {
    try {
      const response = await axios.get(`${API_URL}/vendors/match/${projectId}`);
      setMaterialsNeeded(response.data.materialsNeeded);
      setVendors(response.data.availableVendors);
    } catch (error) {
      console.error('Failed to load vendor matching:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleVendor = (vendorId: string) => {
    const newSelected = new Set(selectedVendors);
    if (newSelected.has(vendorId)) {
      newSelected.delete(vendorId);
    } else {
      newSelected.add(vendorId);
    }
    setSelectedVendors(newSelected);
  };

  const getRemainingMaterials = () => {
    // Calculate which materials are covered by selected vendors
    const covered = new Set();
    
    selectedVendors.forEach(vendorId => {
      const vendor = vendors.find(v => v.id === vendorId);
      if (vendor) {
        vendor.trades?.forEach((trade: string) => {
          materialsNeeded[trade]?.forEach((material: any) => {
            covered.add(material.id);
          });
        });
      }
    });

    const remaining: any = {};
    Object.keys(materialsNeeded).forEach(trade => {
      const uncovered = materialsNeeded[trade]?.filter((m: any) => !covered.has(m.id)) || [];
      if (uncovered.length > 0) {
        remaining[trade] = uncovered;
      }
    });

    return remaining;
  };

  const remaining = getRemainingMaterials();
  const totalRemaining = Object.values(remaining).reduce((sum: number, items: any) => sum + items.length, 0);

  return (
    <Layout>
      <div style={{ padding: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>
          Vendor Matching - Project {projectId}
        </h1>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
            {/* LEFT PANEL: Materials Needed */}
            <div className="card" style={{ padding: '24px', maxHeight: '800px', overflow: 'auto' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                Materials Needed {totalRemaining > 0 && (
                  <span style={{ color: '#ef4444', marginLeft: '8px' }}>
                    ({totalRemaining} remaining)
                  </span>
                )}
              </h2>

              {Object.keys(remaining).map(trade => (
                <div key={trade} style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                    {trade === 'M' ? 'Mechanical' : trade === 'P' ? 'Plumbing' : trade === 'E' ? 'Electrical' : 'Architectural'}
                  </h3>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {remaining[trade].map((material: any) => (
                      <li key={material.id} style={{
                        padding: '8px 12px',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '4px',
                        marginBottom: '8px',
                        fontSize: '13px',
                        color: '#991b1b',
                      }}>
                        {material.description} - {material.qty} {material.uom}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {totalRemaining === 0 && (
                <div style={{
                  padding: '24px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '6px',
                  textAlign: 'center',
                  color: '#166534',
                }}>
                  ✅ All materials covered by selected vendors!
                </div>
              )}
            </div>

            {/* RIGHT PANEL: Vendor Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', alignContent: 'start' }}>
              {vendors.map(vendor => (
                <div
                  key={vendor.id}
                  onClick={() => toggleVendor(vendor.id)}
                  className="card"
                  style={{
                    padding: '20px',
                    cursor: 'pointer',
                    border: selectedVendors.has(vendor.id) ? '2px solid #2563eb' : '1px solid #e5e7eb',
                    backgroundColor: selectedVendors.has(vendor.id) ? '#eff6ff' : 'white',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600' }}>{vendor.name}</h3>
                    {selectedVendors.has(vendor.id) && (
                      <span style={{ fontSize: '20px' }}>✓</span>
                    )}
                  </div>
                  
                  <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
                    📧 {vendor.email}
                  </div>
                  {vendor.phone && (
                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
                      📞 {vendor.phone}
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '12px' }}>
                    {vendor.trades?.map((trade: string) => (
                      <span key={trade} style={{
                        padding: '4px 8px',
                        backgroundColor: '#dbeafe',
                        color: '#1e40af',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '500',
                      }}>
                        {trade === 'M' ? 'Mechanical' : trade === 'P' ? 'Plumbing' : trade === 'E' ? 'Electrical' : 'Architectural'}
                      </span>
                    ))}
                  </div>

                  {vendor.rating && (
                    <div style={{ marginTop: '12px', fontSize: '13px' }}>
                      ⭐ {vendor.rating.toFixed(1)}/5.0
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: '12px 24px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            Back to Projects
          </button>
          <button
            onClick={() => {
              if (selectedVendors.size > 0) {
                navigate(`/rfq/${projectId}`);
              } else {
                alert('Please select at least one vendor');
              }
            }}
            disabled={selectedVendors.size === 0}
            style={{
              padding: '12px 24px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: selectedVendors.size === 0 ? 'not-allowed' : 'pointer',
              opacity: selectedVendors.size === 0 ? 0.5 : 1,
            }}
          >
            Create RFQ ({selectedVendors.size} vendors)
          </button>
        </div>
      </div>
    </Layout>
  );
}
