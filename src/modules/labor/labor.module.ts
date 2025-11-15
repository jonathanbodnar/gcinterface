import { Module } from '@nestjs/common';
import { LaborCalculationService } from './labor-calculation.service';
import { LaborController } from './labor.controller';

@Module({
  controllers: [LaborController],
  providers: [LaborCalculationService],
  exports: [LaborCalculationService],
})
export class LaborModule {}

