import { Controller, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RFQService } from './rfq.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('RFQ')
@Controller('rfq')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RFQController {
  constructor(private rfqService: RFQService) {}

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
