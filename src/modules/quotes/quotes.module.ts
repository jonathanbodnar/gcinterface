import { Module } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { QuoteAnalysisService } from './quote-analysis.service';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [QuotesController],
  providers: [QuotesService, QuoteAnalysisService],
  exports: [QuotesService, QuoteAnalysisService],
})
export class QuotesModule {}
