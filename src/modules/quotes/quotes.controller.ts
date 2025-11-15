import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { QuotesService } from './quotes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Quotes')
@Controller('quotes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QuotesController {
  constructor(private quotesService: QuotesService) {}

  @Post('parse/:rfqId')
  @ApiOperation({ summary: 'Parse quote from email' })
  async parseQuote(
    @Param('rfqId') rfqId: string,
    @Body() body: { emailBody: string; attachments?: string[] },
  ) {
    // Convert base64 attachments to buffers if provided
    const attachments = body.attachments?.map(att => Buffer.from(att, 'base64'));
    return this.quotesService.parseQuoteFromEmail(rfqId, body.emailBody, attachments);
  }

  @Get('compare/:projectId')
  @ApiOperation({ summary: 'Compare all quotes for a project' })
  async compareQuotes(@Param('projectId') projectId: string) {
    return this.quotesService.compareQuotes(projectId);
  }

  @Get('level/:projectId')
  @ApiOperation({ summary: 'Level bids (lowest price per item)' })
  async levelBids(@Param('projectId') projectId: string) {
    return this.quotesService.levelBids(projectId);
  }
}

