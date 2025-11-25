import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { QuotesModule } from '../quotes/quotes.module';

@Module({
  imports: [QuotesModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}

