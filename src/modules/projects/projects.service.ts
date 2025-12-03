import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { BOMGeneratorService } from '../bom/bom-generator.service';
import { TakeoffApiService } from '../takeoff/takeoff-api.service';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private takeoffApi: TakeoffApiService,
    private bomGenerator: BOMGeneratorService,
  ) {}

  async importFromTakeoff(takeoffJobId: string, userId: string) {
    // Get job data from takeoff API
    if (!this.takeoffApi.isAvailable()) {
      throw new NotFoundException('Takeoff API not configured');
    }

    const jobData = await this.takeoffApi.getJob(takeoffJobId);

    if (!jobData) {
      throw new NotFoundException('Takeoff job not found');
    }

    // Get features to calculate total area
    let totalSF = 0;
    try {
      const rooms = await this.takeoffApi.getRooms(takeoffJobId);
      totalSF = rooms.reduce((sum, room) => sum + (room.area || 0), 0);
    } catch (error) {
      console.warn('Could not calculate total SF:', error.message);
    }

    // Create project in GC Interface database
    const project = await this.prisma.project.create({
      data: {
        name: jobData.filename?.replace(/\.[^/.]+$/, '') || `Project-${takeoffJobId}`,
        location: 'To be determined',
        takeoffJobId: takeoffJobId,
        status: 'SCOPE_DIAGNOSIS',
        createdById: userId,
        totalSF: totalSF,
      },
    });

    console.log(`✅ Imported takeoff job ${takeoffJobId} as project ${project.id}`);
    console.log(`📐 Total SF: ${totalSF}`);

    // Auto-generate BOM and populate materials database
    console.log(`🔧 Auto-generating BOM for project ${project.id}...`);
    let bomSummary = null;
    try {
      bomSummary = await this.bomGenerator.generateFromTakeoff(project.id, userId);
      console.log(`✅ BOM generated: ${bomSummary.totalItems} items, ${bomSummary.totalMaterials} unique materials`);
      
      // Update project status
      await this.prisma.project.update({
        where: { id: project.id },
        data: { status: 'BOM_GENERATION' },
      });
    } catch (error) {
      console.error('⚠️ BOM generation failed:', error.message);
      // Don't fail the import if BOM generation fails
      bomSummary = {
        error: error.message,
        totalItems: 0,
      };
    }

    return {
      project,
      bom: bomSummary,
      takeoffData: {
        totalSF,
        disciplines: jobData.disciplines || [],
        targets: jobData.targets || [],
      },
    };
  }

  async getTakeoffData(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Fetch data from takeoff API
    if (!this.takeoffApi.isAvailable()) {
      return {
        project,
        takeoffData: null,
        message: 'Takeoff API not configured',
      };
    }

    try {
      const takeoffJob = await this.takeoffApi.getJob(project.takeoffJobId);
      return {
        project,
        takeoffData: takeoffJob || null,
      };
    } catch (error) {
      return {
        project,
        takeoffData: null,
        message: error.message,
      };
    }
  }

  async listProjects(userId?: string) {
    const where = userId ? { createdById: userId } : {};

    return this.prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async listAvailableTakeoffJobs() {
    // Fetch list of available jobs from takeoff API
    console.log('🔍 listAvailableTakeoffJobs called');
    console.log('🔍 Takeoff API available?', this.takeoffApi.isAvailable());
    console.log('🔍 TAKEOFF_API_URL set?', !!process.env.TAKEOFF_API_URL);
    
    if (!this.takeoffApi.isAvailable()) {
      console.warn('⚠️ Takeoff API not initialized');
      return {
        jobs: [],
        message: 'Takeoff API not configured',
        debug: {
          apiAvailable: this.takeoffApi.isAvailable(),
          envVarSet: !!process.env.TAKEOFF_API_URL,
          envVarValue: process.env.TAKEOFF_API_URL || 'Not set',
        },
      };
    }

    try {
      console.log('🔍 Fetching jobs from takeoff API...');
      
      // Get jobs from takeoff API
      const jobs = await this.takeoffApi.listJobs();
      
      console.log(`✅ Found ${jobs.length} jobs from takeoff API`);

      // Get already imported job IDs
      const importedProjects = await this.prisma.project.findMany({
        select: { takeoffJobId: true },
      });
      const importedJobIds = new Set(importedProjects.map(p => p.takeoffJobId));

      // Mark jobs as imported
      const jobsWithStatus = jobs.map((job: any) => ({
        ...job,
        isImported: importedJobIds.has(job.id),
      }));

      return {
        jobs: jobsWithStatus,
        total: jobs.length,
      };
    } catch (error) {
      console.error('❌ Error fetching takeoff jobs:', error);
      return {
        jobs: [],
        message: 'Failed to fetch takeoff jobs from API',
        error: error.message,
      };
    }
  }

  async saveSelectedVendors(projectId: string, vendorIds: string[]) {
    // Update project with selected vendors (store as JSON for now)
    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        status: 'VENDOR_MATCHING',
        // Store vendor IDs in a JSON field or create a separate table
        // For now, we'll fetch vendors when needed
      },
    });

    console.log(`✅ Saved ${vendorIds.length} vendors for project ${projectId}`);

    return {
      success: true,
      projectId,
      vendorCount: vendorIds.length,
      vendorIds,
      message: 'Selected vendors saved',
    };
  }

  async getSelectedVendors(projectId: string) {
    // For now, return empty - in production, query from a ProjectVendors join table
    return {
      projectId,
      vendors: [],
      message: 'Vendor selection tracking coming soon',
    };
  }
}
