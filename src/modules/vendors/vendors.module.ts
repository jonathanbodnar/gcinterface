import { Module } from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { VendorsController } from './vendors.controller';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { MaterialsModule } from '../materials/materials.module';

@Module({
  imports: [PrismaModule, MaterialsModule],
  controllers: [VendorsController],
  providers: [VendorsService],
  exports: [VendorsService],
})
export class VendorsModule {}
