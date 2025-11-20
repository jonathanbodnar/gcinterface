import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Projects')
@Controller('projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Post('import/:takeoffJobId')
  @ApiOperation({ summary: 'Import project from takeoff database' })
  async importFromTakeoff(@Param('takeoffJobId') takeoffJobId: string, @Request() req) {
    return this.projectsService.importFromTakeoff(takeoffJobId, req.user.userId);
  }

  @Get('available-takeoff-jobs')
  @ApiOperation({ summary: 'List available takeoff jobs for import' })
  async listAvailableTakeoffJobs() {
    return this.projectsService.listAvailableTakeoffJobs();
  }

  @Get()
  @ApiOperation({ summary: 'List all projects' })
  async listProjects(@Request() req) {
    return this.projectsService.listProjects(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project details' })
  async getProject(@Param('id') id: string) {
    return this.projectsService.getTakeoffData(id);
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

