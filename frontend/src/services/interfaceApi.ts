import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const interfaceApi = {
  // Projects
  getProjects: () => api.get('/projects'),
  getProject: (id: string) => api.get(`/projects/${id}`),
  importProject: (jobId: string) => api.post(`/projects/import/${jobId}`),
  getAvailableTakeoffJobs: () => api.get('/projects/available-takeoff-jobs'),
  updateProject: (id: string, data: any) => api.put(`/projects/${id}`, data),
  saveSelectedVendors: (id: string, vendorIds: string[]) =>
    api.post(`/projects/${id}/selected-vendors`, { vendorIds }),

  // BOM
  getBOM: (projectId: string) => api.get(`/bom?projectId=${projectId}`),
  generateBOM: (projectId: string) => api.post(`/bom/generate/${projectId}`),

  // Materials
  getMaterials: () => api.get('/materials'),
  getMaterial: (id: string) => api.get(`/materials/${id}`),
  createMaterial: (data: any) => api.post('/materials', data),
  searchMaterials: (q: string) => api.get(`/materials/search?q=${encodeURIComponent(q)}`),

  // Vendors
  getVendors: () => api.get('/vendors'),
  getVendor: (id: string) => api.get(`/vendors/${id}`),
  createVendor: (data: any) => api.post('/vendors', data),
  updateVendor: (id: string, data: any) => api.put(`/vendors/${id}`, data),
  rankVendors: (projectId: string) => api.get(`/vendors/rank/${projectId}`),
  getVendorCoverage: (vendorId: string, projectId: string) =>
    api.get(`/vendors/${vendorId}/coverage/${projectId}`),

  // RFQs
  getRFQs: (projectId: string) => api.get(`/rfq?projectId=${projectId}`),
  getRFQ: (id: string) => api.get(`/rfq/${id}`),
  createRFQ: (data: any) => api.post('/rfq/create', data),
  sendRFQ: (id: string) => api.post(`/rfq/${id}/send`),
  downloadRFQPdf: (id: string) => api.get(`/rfq/${id}/pdf`, { responseType: 'blob' }),

  // Quotes
  getQuotes: (projectId: string) => api.get(`/quotes?projectId=${projectId}`),
  compareQuotes: (projectId: string) => api.get(`/quotes/compare/${projectId}`),
  levelBids: (projectId: string) => api.get(`/quotes/level/${projectId}`),

  // Labor
  calculateLabor: (projectId: string) => api.get(`/labor/calculate/${projectId}`),

  // Pricing
  getVendorCatalog: (vendorId: string) => api.get(`/pricing/vendors/${vendorId}/catalog`),
  setVendorPrice: (vendorId: string, materialId: string, data: any) =>
    api.post(`/pricing/vendors/${vendorId}/materials/${materialId}`, data),

  // Admin
  getMaterialRules: () => api.get('/admin/material-rules'),
  getTradeMarkups: () => api.get('/admin/trade-markups'),
  getEmailTemplates: () => api.get('/admin/email-templates'),
};

export default api;
