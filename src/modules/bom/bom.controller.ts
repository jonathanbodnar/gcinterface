import { Controller, Post, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BOMGeneratorService } from './bom-generator.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('BOM')
@Controller('bom')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BOMController {
  constructor(private bomGenerator: BOMGeneratorService) {}

  @Post('generate/:projectId')
  @ApiOperation({ summary: 'Generate BOM from takeoff data' })
  async generateBOM(@Param('projectId') projectId: string, @Request() req) {
    return this.bomGenerator.generateFromTakeoff(projectId, req.user.userId);
  }
}
