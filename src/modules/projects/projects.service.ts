import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, TakeoffPrismaService } from '@/common/prisma/prisma.service';
import { BOMGeneratorService } from '../bom/bom-generator.service';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private takeoffPrisma: TakeoffPrismaService,
    private bomGenerator: BOMGeneratorService,
  ) {}

  async importFromTakeoff(takeoffJobId: string, userId: string) {
    // Get job data from takeoff database (READ ONLY)
    // Note: This uses raw SQL since we're connecting to a different database schema
    if (!this.takeoffPrisma.client) {
      throw new NotFoundException('Takeoff database not configured');
    }

    const takeoffJob = await this.takeoffPrisma.$queryRaw`
      SELECT j.*, f.filename
      FROM "jobs" j
      LEFT JOIN "files" f ON j."fileId" = f.id
      WHERE j.id = ${takeoffJobId}
    `;

    if (!takeoffJob || takeoffJob.length === 0) {
      throw new NotFoundException('Takeoff job not found');
    }

    const jobData = takeoffJob[0];

    // Get features to calculate total area
    let totalSF = 0;
    try {
      const features: any[] = await this.takeoffPrisma.$queryRaw`
        SELECT * FROM "features" 
        WHERE "jobId" = ${takeoffJobId} 
        AND type = 'ROOM'
      `;
      totalSF = features.reduce((sum, f) => sum + (f.area || 0), 0);
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

    // Fetch data from takeoff database using raw SQL
    if (!this.takeoffPrisma.client) {
      return {
        project,
        takeoffData: null,
        message: 'Takeoff database not configured',
      };
    }

    const takeoffJob = await this.takeoffPrisma.$queryRaw`
      SELECT j.*, f.filename
      FROM "jobs" j
      LEFT JOIN "files" f ON j."fileId" = f.id
      WHERE j.id = ${project.takeoffJobId}
    `;

    return {
      project,
      takeoffData: takeoffJob[0] || null,
    };
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
    // Fetch list of available jobs from takeoff database
    console.log('🔍 listAvailableTakeoffJobs called');
    console.log('🔍 TakeoffPrisma client exists?', !!this.takeoffPrisma.client);
    console.log('🔍 TAKEOFF_DATABASE_URL set?', !!process.env.TAKEOFF_DATABASE_URL);
    
    if (!this.takeoffPrisma.client) {
      console.warn('⚠️ Takeoff database client not initialized');
      return {
        jobs: [],
        message: 'Takeoff database not configured',
        debug: {
          clientExists: !!this.takeoffPrisma.client,
          envVarSet: !!process.env.TAKEOFF_DATABASE_URL,
          envVarValue: process.env.TAKEOFF_DATABASE_URL ? 'Set (hidden)' : 'Not set',
        },
      };
    }

    try {
      console.log('🔍 Attempting to query takeoff database...');
      
      // Query jobs from gclegacy database
      const jobs = await this.takeoffPrisma.$queryRaw`
        SELECT 
          j.id, 
          f.filename,
          j.status,
          j."createdAt",
          j."updatedAt"
        FROM "jobs" j
        LEFT JOIN "files" f ON j."fileId" = f.id
        ORDER BY j."createdAt" DESC
        LIMIT 50
      `;
      
      console.log(`✅ Found ${jobs.length} jobs in takeoff database`);

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
      console.error('Error fetching takeoff jobs:', error);
      return {
        jobs: [],
        message: 'Failed to fetch takeoff jobs',
        error: error.message,
      };
    }
  }
}
