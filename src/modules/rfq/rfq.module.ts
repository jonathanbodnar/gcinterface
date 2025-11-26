import { Module } from '@nestjs/common';
import { RFQService } from './rfq.service';
import { RFQController } from './rfq.controller';
import { PDFGeneratorService } from './pdf-generator.service';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RFQController],
  providers: [RFQService, PDFGeneratorService],
  exports: [RFQService, PDFGeneratorService],
})
export class RFQModule {}
