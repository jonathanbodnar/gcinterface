import { Module } from '@nestjs/common';
import { BOMGeneratorService } from './bom-generator.service';
import { BOMController } from './bom.controller';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { MaterialsModule } from '../materials/materials.module';

@Module({
  imports: [PrismaModule, MaterialsModule],
  controllers: [BOMController],
  providers: [BOMGeneratorService],
  exports: [BOMGeneratorService],
})
export class BOMModule {}
