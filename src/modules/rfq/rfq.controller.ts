import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RFQService } from './rfq.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('RFQ')
@Controller('rfq')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RFQController {
  constructor(private rfqService: RFQService) {}

  @Get()
  @ApiOperation({ summary: 'List RFQs for a project' })
  async listRFQs(@Query('projectId') projectId: string) {
    return this.rfqService.listByProject(projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get RFQ details' })
  async getRFQ(@Param('id') id: string) {
    return this.rfqService.getRFQDetails(id);
  }

  @Post('create')
  @ApiOperation({ summary: 'Create new RFQ' })
  async createRFQ(
    @Body() body: { projectId: string; vendorId: string; materialIds: string[] },
    @Request() req,
  ) {
    return this.rfqService.createRFQ(body.projectId, body.vendorId, body.materialIds, req.user.userId);
  }

  @Post(':id/send')
  @ApiOperation({ summary: 'Send RFQ via email' })
  async sendRFQ(@Param('id') id: string) {
    return this.rfqService.sendRFQ(id);
  }
}
