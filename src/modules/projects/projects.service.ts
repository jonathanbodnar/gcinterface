import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, TakeoffPrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private takeoffPrisma: TakeoffPrismaService,
  ) {}

  async importFromTakeoff(takeoffJobId: string, userId: string) {
    // Get job data from takeoff database (READ ONLY)
    // Note: This uses raw SQL since we're connecting to a different database schema
    if (!this.takeoffPrisma.client) {
      throw new NotFoundException('Takeoff database not configured');
    }

    const takeoffJob = await this.takeoffPrisma.$queryRaw`
      SELECT * FROM "Job" WHERE id = ${takeoffJobId}
    `;

    if (!takeoffJob || takeoffJob.length === 0) {
      throw new NotFoundException('Takeoff job not found');
    }

    // For now, we'll need to fetch related data separately
    // In production, you'd want to use proper Prisma queries with a compatible schema
    const jobData = takeoffJob[0];

    // Create project in GC Interface database
    const project = await this.prisma.project.create({
      data: {
        name: jobData.filename?.replace(/\.[^/.]+$/, '') || `Project-${takeoffJobId}`,
        location: 'To be determined',
        takeoffJobId: takeoffJobId,
        status: 'SCOPE_DIAGNOSIS',
        createdById: userId,
      },
    });

    // Calculate total square footage from rooms (simplified for now)
    // In production, fetch features from takeoff DB
    const totalSF = jobData.totalArea || 0;

    // Update project with calculated data
    await this.prisma.project.update({
      where: { id: project.id },
      data: {
        totalSF: totalSF,
      },
    });

    console.log(`✅ Imported takeoff job ${takeoffJobId} as project ${project.id}`);
    console.log(`📐 Total SF: ${totalSF}`);

    return {
      project,
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
      SELECT * FROM "Job" WHERE id = ${project.takeoffJobId}
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
}
