import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { PrismaService, TakeoffPrismaService } from '@/common/prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Projects')
@Controller('projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProjectsController {
  constructor(
    private projectsService: ProjectsService,
    private prisma: PrismaService,
    private takeoffPrisma: TakeoffPrismaService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  async createProject(@Body() body: {
    name: string;
    location?: string;
    clientName?: string;
    dueDate?: string;
    notes?: string;
    wizardStep?: string;
  }, @Request() req) {
    const project = await this.prisma.project.create({
      data: {
        name: body.name,
        location: body.location || 'To be determined',
        clientName: body.clientName || null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        notes: body.notes || null,
        wizardStep: body.wizardStep || 'setup',
        status: 'SCOPE_DIAGNOSIS',
        createdById: req.user.userId,
      },
    });
    return project;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a project' })
  async updateProject(@Param('id') id: string, @Body() body: any) {
    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.location !== undefined) data.location = body.location;
    if (body.clientName !== undefined) data.clientName = body.clientName;
    if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.wizardStep !== undefined) data.wizardStep = body.wizardStep;
    if (body.status !== undefined) data.status = body.status;
    if (body.takeoffJobId !== undefined) data.takeoffJobId = body.takeoffJobId;
    if (body.projectOutcome !== undefined) data.projectOutcome = body.projectOutcome;
    if (body.currentStage !== undefined) data.currentStage = body.currentStage;
    if (body.totalSF !== undefined) data.totalSF = body.totalSF;

    const project = await this.prisma.project.update({
      where: { id },
      data,
    });
    return project;
  }

  @Post('import/:takeoffJobId')
  @ApiOperation({ summary: 'Import project from takeoff database' })
  async importFromTakeoff(
    @Param('takeoffJobId') takeoffJobId: string,
    @Body() body: { projectId?: string },
    @Request() req,
  ) {
    return this.projectsService.importFromTakeoff(takeoffJobId, req.user.userId, body?.projectId);
  }

  @Get('available-takeoff-jobs')
  @ApiOperation({ summary: 'List available takeoff jobs for import' })
  async listAvailableTakeoffJobs() {
    return this.projectsService.listAvailableTakeoffJobs();
  }

  @Get('takeoff-file/:takeoffJobId')
  @ApiOperation({ summary: 'Get the uploaded file URL for a takeoff job' })
  async getTakeoffFileUrl(@Param('takeoffJobId') takeoffJobId: string) {
    try {
      const rows: any[] = await this.takeoffPrisma.$queryRaw`
        SELECT f.id as "fileId", f."storageUrl", f.filename, f.mime, f.pages
        FROM "jobs" j
        JOIN "files" f ON j."fileId" = f.id
        WHERE j.id = ${takeoffJobId}
        LIMIT 1
      `;

      if (!rows || rows.length === 0) {
        throw new HttpException('Takeoff job or file not found', HttpStatus.NOT_FOUND);
      }

      return {
        fileId: rows[0].fileId,
        storageUrl: rows[0].storageUrl,
        filename: rows[0].filename,
        mime: rows[0].mime,
        pages: rows[0].pages,
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new HttpException('Failed to fetch file info', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get()
  @ApiOperation({ summary: 'List all projects' })
  async listProjects(@Request() req) {
    const isAdmin = req.user.role === 'ADMIN';
    return this.projectsService.listProjects(isAdmin ? undefined : req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project details' })
  async getProject(@Param('id') id: string) {
    const data = await this.projectsService.getTakeoffData(id);

    const planPages = await this.prisma.planPage.findMany({
      where: { projectId: id },
      orderBy: { pageNumber: 'asc' },
      select: { id: true, pageNumber: true, fileName: true, pdfUrl: true },
    });

    return { ...data, planPages };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a project and all related data' })
  async deleteProject(@Param('id') id: string) {
    try {
      await this.prisma.$transaction(async (tx) => {
        // Delete in order to respect foreign keys
        await tx.featureLocation.deleteMany({ where: { projectId: id } });
        await tx.planPage.deleteMany({ where: { projectId: id } });
        const rfqs = await tx.rFQ.findMany({ where: { projectId: id }, select: { id: true } });
        const rfqIds = rfqs.map(r => r.id);
        if (rfqIds.length > 0) {
          await tx.quoteItem.deleteMany({ where: { quote: { rfqId: { in: rfqIds } } } });
          await tx.quote.deleteMany({ where: { rfqId: { in: rfqIds } } });
          await tx.rFQItem.deleteMany({ where: { rfqId: { in: rfqIds } } });
        }
        await tx.rFQ.deleteMany({ where: { projectId: id } });
        await tx.subcontract.deleteMany({ where: { projectId: id } });
        const boms = await tx.bOM.findMany({ where: { projectId: id }, select: { id: true } });
        const bomIds = boms.map(b => b.id);
        if (bomIds.length > 0) {
          await tx.rFQItem.deleteMany({ where: { bomItemId: { in: bomIds } } });
          await tx.quoteItem.deleteMany({ where: { bomItemId: { in: bomIds } } });
        }
        await tx.bOM.deleteMany({ where: { projectId: id } });
        await tx.estimate.deleteMany({ where: { projectId: id } });
        await tx.project.delete({ where: { id } });
      });
      return { success: true, message: 'Project deleted' };
    } catch (error) {
      console.error('Failed to delete project:', error);
      throw new HttpException(
        `Failed to delete project: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/reset-to-step')
  @ApiOperation({ summary: 'Reset project to a specific wizard step, clearing downstream data' })
  async resetToStep(
    @Param('id') id: string,
    @Body() body: { step: string },
  ) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new HttpException('Project not found', HttpStatus.NOT_FOUND);

    const step = body.step || 'bom';

    await this.prisma.$transaction(async (tx) => {
      // Clear quotes and their items
      const rfqs = await tx.rFQ.findMany({ where: { projectId: id }, select: { id: true } });
      const rfqIds = rfqs.map(r => r.id);
      if (rfqIds.length > 0) {
        await tx.quoteItem.deleteMany({ where: { quote: { rfqId: { in: rfqIds } } } });
        await tx.quote.deleteMany({ where: { rfqId: { in: rfqIds } } });
        await tx.rFQItem.deleteMany({ where: { rfqId: { in: rfqIds } } });
      }
      await tx.rFQ.deleteMany({ where: { projectId: id } });

      // Clear vendor selections
      await tx.project.update({
        where: { id },
        data: {
          selectedVendorIds: [],
          wizardStep: step,
          status: 'BOM_GENERATION',
          rfqsSent: 0,
          quotesReceived: 0,
          responseRate: null,
        },
      });
    });

    return {
      success: true,
      message: `Project reset to step "${step}" — all vendor matches, RFQs, and quotes cleared`,
    };
  }

  @Post(':id/recalculate-status')
  @ApiOperation({ summary: 'Recalculate project status from actual data' })
  async recalculateStatus(@Param('id') id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new HttpException('Project not found', HttpStatus.NOT_FOUND);

    const rfqs = await this.prisma.rFQ.findMany({
      where: { projectId: id },
      select: { id: true, status: true },
    });
    const quotes = await this.prisma.quote.findMany({
      where: { projectId: id },
      select: { id: true, status: true },
    });
    const boms = await this.prisma.bOM.findMany({
      where: { projectId: id },
      select: { id: true },
    });

    const sentRfqs = rfqs.filter(r => r.status === 'SENT' || r.status === 'RESPONDED');
    const receivedQuotes = quotes.filter(q => q.status === 'RECEIVED' || q.status === 'UNDER_REVIEW');
    const awardedQuotes = quotes.filter(q => q.status === 'AWARDED');

    let correctStatus = project.status;

    if (awardedQuotes.length > 0 && awardedQuotes.length >= quotes.length && quotes.length > 0) {
      correctStatus = 'AWARDED';
    } else if (awardedQuotes.length > 0) {
      correctStatus = 'AWARD_PENDING';
    } else if (receivedQuotes.length > 0) {
      correctStatus = 'QUOTE_COMPARISON';
    } else if (sentRfqs.length > 0) {
      correctStatus = 'RFQ_SENT';
    } else if (project.selectedVendorIds?.length > 0) {
      correctStatus = 'VENDOR_MATCHING';
    } else if (boms.length > 0) {
      correctStatus = 'BOM_GENERATION';
    } else {
      correctStatus = 'SCOPE_DIAGNOSIS';
    }

    if (correctStatus !== project.status) {
      await this.prisma.project.update({
        where: { id },
        data: { status: correctStatus },
      });
    }

    return {
      projectId: id,
      previousStatus: project.status,
      correctStatus,
      changed: correctStatus !== project.status,
      data: {
        bomItems: boms.length,
        rfqsSent: sentRfqs.length,
        quotesReceived: receivedQuotes.length,
        quotesAwarded: awardedQuotes.length,
      },
    };
  }

  @Post(':id/selected-vendors')
  @ApiOperation({ summary: 'Save selected vendors for project' })
  async saveSelectedVendors(
    @Param('id') id: string,
    @Body() body: { vendorIds: string[] },
  ) {
    return this.projectsService.saveSelectedVendors(id, body.vendorIds);
  }

  @Get(':id/selected-vendors')
  @ApiOperation({ summary: 'Get selected vendors for project' })
  async getSelectedVendors(@Param('id') id: string) {
    return this.projectsService.getSelectedVendors(id);
  }
}
