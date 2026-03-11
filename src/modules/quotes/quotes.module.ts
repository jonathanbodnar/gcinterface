import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { QuoteAnalysisService } from './quote-analysis.service';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { RFQModule } from '../rfq/rfq.module';

@Module({
  imports: [PrismaModule, RFQModule, ConfigModule],
  controllers: [QuotesController],
  providers: [QuotesService, QuoteAnalysisService],
  exports: [QuotesService, QuoteAnalysisService],
})
export class QuotesModule {}
