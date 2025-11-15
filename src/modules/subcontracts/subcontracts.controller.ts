import { Controller, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubcontractsService } from './subcontracts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Subcontracts')
@Controller('subcontracts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SubcontractsController {
  constructor(private subcontractsService: SubcontractsService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create subcontract from quote' })
  async createSubcontract(
    @Body() body: { projectId: string; vendorId: string; quoteId: string },
    @Request() req,
  ) {
    return this.subcontractsService.createSubcontract(
      body.projectId,
      body.vendorId,
      body.quoteId,
      req.user.userId,
    );
  }

  @Post(':id/award')
  @ApiOperation({ summary: 'Award subcontract' })
  async awardSubcontract(@Param('id') id: string, @Request() req) {
    return this.subcontractsService.awardSubcontract(id, req.user.userId);
  }
}

