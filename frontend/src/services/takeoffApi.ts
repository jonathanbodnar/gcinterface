const TAKEOFF_API_URL = import.meta.env.VITE_TAKEOFF_API_URL || 'http://localhost:3000/v1';
const TAKEOFF_CLIENT_ID = import.meta.env.VITE_TAKEOFF_CLIENT_ID || 'demo-client';
const TAKEOFF_CLIENT_SECRET = import.meta.env.VITE_TAKEOFF_CLIENT_SECRET || 'demo-secret';

class TakeoffApiService {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    let baseUrl = TAKEOFF_API_URL;
    if (!baseUrl.startsWith('http')) {
      baseUrl = 'https://' + baseUrl;
    }
    this.baseUrl = baseUrl;
  }

  async authenticate() {
    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: TAKEOFF_CLIENT_ID,
        client_secret: TAKEOFF_CLIENT_SECRET,
      }),
    });

    if (!response.ok) {
      throw new Error('Takeoff API authentication failed');
    }

    const data = await response.json();
    this.token = data.access_token;
    return data;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.token) {
      await this.authenticate();
    }

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (response.status === 401) {
      this.token = null;
      await this.authenticate();
      return this.request(endpoint, options);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async uploadFile(file: File, projectId?: string) {
    if (!this.token) {
      await this.authenticate();
    }

    const formData = new FormData();
    formData.append('file', file);
    if (projectId) {
      formData.append('projectId', projectId);
    }

    const response = await fetch(`${this.baseUrl}/files`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.token}` },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || `Upload failed with status ${response.status}`);
    }

    return response.json();
  }

  async createJob(jobData: {
    fileId: string;
    disciplines: string[];
    targets: string[];
    materialsRuleSetId?: string;
    options?: Record<string, any>;
  }) {
    return this.request('/jobs', {
      method: 'POST',
      body: JSON.stringify(jobData),
    });
  }

  async getJobStatus(jobId: string) {
    return this.request(`/jobs/${jobId}`);
  }

  async getTakeoffResults(jobId: string) {
    return this.request(`/takeoff/${jobId}`);
  }

  async getMaterials(jobId: string) {
    return this.request(`/materials/${jobId}`);
  }

  async getFileInfo(fileId: string) {
    return this.request(`/files/${fileId}`);
  }

  async checkHealth() {
    const healthUrl = this.baseUrl.replace('/v1', '') + '/health';
    const response = await fetch(healthUrl);
    return response.json();
  }
}

export const takeoffApi = new TakeoffApiService();
