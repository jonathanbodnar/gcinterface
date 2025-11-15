import { Module } from '@nestjs/common';
import { BOMGeneratorService } from './bom-generator.service';
import { BOMController } from './bom.controller';

@Module({
  controllers: [BOMController],
  providers: [BOMGeneratorService],
  exports: [BOMGeneratorService],
})
export class BOMModule {}

