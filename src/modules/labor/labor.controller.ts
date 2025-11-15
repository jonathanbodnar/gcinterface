import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LaborCalculationService } from './labor-calculation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Labor')
@Controller('labor')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LaborController {
  constructor(private laborCalculation: LaborCalculationService) {}

  @Get('calculate/:projectId')
  @ApiOperation({ summary: 'Calculate labor costs for project' })
  async calculateLabor(@Param('projectId') projectId: string) {
    return this.laborCalculation.calculateLabor(projectId);
  }
}
