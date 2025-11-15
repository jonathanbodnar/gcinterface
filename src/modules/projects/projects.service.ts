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
    const takeoffJob = await this.takeoffPrisma.job.findUnique({
      where: { id: takeoffJobId },
      include: {
        file: true,
        sheets: true,
        features: true,
        materials: true,
      },
    });

    if (!takeoffJob) {
      throw new NotFoundException('Takeoff job not found');
    }

    // Create project in GC Interface database
    const project = await this.prisma.project.create({
      data: {
        name: takeoffJob.file.filename.replace(/\.[^/.]+$/, ''),
        location: 'To be determined',
        takeoffJobId: takeoffJobId,
        status: 'SCOPE_DIAGNOSIS',
        createdById: userId,
      },
    });

    // Calculate total square footage from rooms
    const roomFeatures = takeoffJob.features.filter(f => f.type === 'ROOM');
    const totalSF = roomFeatures.reduce((sum, room) => sum + (room.area || 0), 0);

    // Update project with calculated data
    await this.prisma.project.update({
      where: { id: project.id },
      data: {
        totalSF: totalSF,
      },
    });

    console.log(`✅ Imported takeoff job ${takeoffJobId} as project ${project.id}`);
    console.log(`📐 Total SF: ${totalSF}`);
    console.log(`📊 Features: ${takeoffJob.features.length}`);
    console.log(`💰 Materials: ${takeoffJob.materials.length}`);

    return {
      project,
      takeoffData: {
        totalFeatures: takeoffJob.features.length,
        totalMaterials: takeoffJob.materials.length,
        totalSF,
        disciplines: takeoffJob.disciplines,
        targets: takeoffJob.targets,
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

    // Fetch data from takeoff database
    const takeoffJob = await this.takeoffPrisma.job.findUnique({
      where: { id: project.takeoffJobId },
      include: {
        sheets: true,
        features: true,
        materials: true,
      },
    });

    return {
      project,
      takeoffData: takeoffJob,
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
