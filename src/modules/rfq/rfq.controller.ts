import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { RFQService } from './rfq.service';
import { PDFGeneratorService } from './pdf-generator.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('RFQ')
@Controller('rfq')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RFQController {
  constructor(
    private rfqService: RFQService,
    private pdfGenerator: PDFGeneratorService,
  ) {}

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

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Generate RFQ PDF' })
  async generatePDF(@Param('id') id: string, @Res() res: Response) {
    const pdfBuffer = await this.pdfGenerator.generateRFQPDF(id);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=RFQ-${id}.pdf`);
    res.send(pdfBuffer);
  }
}
