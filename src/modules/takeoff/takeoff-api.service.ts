import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

export interface TakeoffJob {
  id: string;
  filename?: string;
  createdAt: string;
  status: string;
  fileId?: string;
}

export interface TakeoffFeature {
  id: string;
  jobId: string;
  type: string;
  area?: number;
  length?: number;
  width?: number;
  height?: number;
  count?: number;
  meta?: any;
}

@Injectable()
export class TakeoffApiService {
  private readonly logger = new Logger(TakeoffApiService.name);
  private readonly client: AxiosInstance | null = null;
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.TAKEOFF_API_URL || '';
    
    if (!this.baseUrl) {
      this.logger.warn('⚠️  TAKEOFF_API_URL not set - takeoff features disabled');
      return;
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.logger.log(`✅ Takeoff API client initialized: ${this.baseUrl}`);
  }

  /**
   * Check if the service is available
   */
  isAvailable(): boolean {
    return !!this.client && !!this.baseUrl;
  }

  /**
   * List all available jobs from the takeoff system
   */
  async listJobs(): Promise<TakeoffJob[]> {
    if (!this.client) {
      throw new Error('Takeoff API not configured');
    }

    try {
      this.logger.log('🔍 Fetching jobs from takeoff API...');
      
      // Try common endpoint patterns
      let response;
      try {
        response = await this.client.get('/jobs');
      } catch (error) {
        // If /jobs doesn't work, try /takeoff/jobs
        this.logger.log('Trying alternate endpoint: /takeoff/jobs');
        response = await this.client.get('/takeoff/jobs');
      }

      const jobs = Array.isArray(response.data) ? response.data : response.data.jobs || [];
      
      this.logger.log(`✅ Found ${jobs.length} jobs from takeoff API`);
      return jobs;
    } catch (error) {
      this.logger.error('❌ Failed to fetch jobs from takeoff API:', error.message);
      throw new Error(`Failed to fetch takeoff jobs: ${error.message}`);
    }
  }

  /**
   * Get detailed information about a specific job
   */
  async getJob(jobId: string): Promise<TakeoffJob> {
    if (!this.client) {
      throw new Error('Takeoff API not configured');
    }

    try {
      this.logger.log(`🔍 Fetching job ${jobId} from takeoff API...`);
      
      let response;
      try {
        response = await this.client.get(`/jobs/${jobId}`);
      } catch (error) {
        // Try alternate endpoint
        this.logger.log('Trying alternate endpoint: /takeoff/:id');
        response = await this.client.get(`/takeoff/${jobId}`);
      }

      return response.data;
    } catch (error) {
      this.logger.error(`❌ Failed to fetch job ${jobId}:`, error.message);
      throw new Error(`Failed to fetch job: ${error.message}`);
    }
  }

  /**
   * Get features (measurements, rooms, etc.) for a specific job
   */
  async getJobFeatures(jobId: string): Promise<TakeoffFeature[]> {
    if (!this.client) {
      throw new Error('Takeoff API not configured');
    }

    try {
      this.logger.log(`🔍 Fetching features for job ${jobId}...`);
      
      // Try common endpoint patterns
      let response;
      try {
        response = await this.client.get(`/jobs/${jobId}/features`);
      } catch (error) {
        try {
          // Try /takeoff/:id/features
          response = await this.client.get(`/takeoff/${jobId}/features`);
        } catch (error2) {
          // Try /materials/:jobId (legacy)
          this.logger.log('Trying legacy endpoint: /materials/:jobId');
          response = await this.client.get(`/materials/${jobId}`);
        }
      }

      const features = Array.isArray(response.data) ? response.data : response.data.features || [];
      
      this.logger.log(`✅ Found ${features.length} features for job ${jobId}`);
      return features;
    } catch (error) {
      this.logger.error(`❌ Failed to fetch features for job ${jobId}:`, error.message);
      // Don't throw - return empty array if features not available
      return [];
    }
  }

  /**
   * Get features by type (ROOM, PIPE, FIXTURE, etc.)
   */
  async getJobFeaturesByType(jobId: string, type: string): Promise<TakeoffFeature[]> {
    const allFeatures = await this.getJobFeatures(jobId);
    return allFeatures.filter(f => f.type === type);
  }

  /**
   * Get room features for calculating areas
   */
  async getRooms(jobId: string): Promise<TakeoffFeature[]> {
    return this.getJobFeaturesByType(jobId, 'ROOM');
  }

  /**
   * Get pipe features for plumbing calculations
   */
  async getPipes(jobId: string): Promise<TakeoffFeature[]> {
    return this.getJobFeaturesByType(jobId, 'PIPE');
  }

  /**
   * Get fixture features
   */
  async getFixtures(jobId: string): Promise<TakeoffFeature[]> {
    const features = await this.getJobFeatures(jobId);
    return features.filter(f => f.type === 'FIXTURE' || f.type === 'EQUIPMENT');
  }

  /**
   * Health check - test connection to takeoff API
   */
  async healthCheck(): Promise<{ status: 'ok' | 'error'; message: string }> {
    if (!this.client) {
      return { status: 'error', message: 'Takeoff API not configured' };
    }

    try {
      // Try to hit the root or health endpoint
      await this.client.get('/health').catch(() => this.client!.get('/'));
      return { status: 'ok', message: 'Takeoff API is reachable' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }
}

