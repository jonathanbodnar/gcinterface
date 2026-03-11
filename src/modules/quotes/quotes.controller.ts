import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { QuotesService } from './quotes.service';
import { QuoteAnalysisService } from './quote-analysis.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Quotes')
@Controller('quotes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QuotesController {
  constructor(
    private quotesService: QuotesService,
    private quoteAnalysis: QuoteAnalysisService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List quotes for a project' })
  async listQuotes(@Query('projectId') projectId: string) {
    return this.quotesService.listByProject(projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get quote details' })
  async getQuote(@Param('id') id: string) {
    return this.quotesService.getQuoteDetails(id);
  }

  @Post('parse/:rfqId')
  @ApiOperation({ summary: 'Parse quote from email' })
  async parseQuote(
    @Param('rfqId') rfqId: string,
    @Body() body: { emailBody: string; attachments?: string[] },
  ) {
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

  @Post(':id/populate-items')
  @ApiOperation({ summary: 'Populate quote with line items from its RFQ (for re-processing)' })
  async populateItems(@Param('id') id: string) {
    return this.quotesService.populateQuoteItems(id);
  }

  @Put('items/:itemId')
  @ApiOperation({ summary: 'Update a quote item price' })
  async updateQuoteItem(
    @Param('itemId') itemId: string,
    @Body() body: { unitPrice: number; totalPrice: number },
  ) {
    return this.quotesService.updateQuoteItem(itemId, body);
  }

  @Post(':id/select-winner')
  @ApiOperation({ summary: 'Select winning quote' })
  async selectWinner(@Param('id') id: string) {
    return this.quotesService.selectWinner(id);
  }

  @Get(':id/coverage')
  @ApiOperation({ summary: 'Analyze quote coverage and alternatives' })
  async analyzeCoverage(@Param('id') id: string) {
    return this.quoteAnalysis.analyzeQuoteCoverage(id);
  }

  @Get('project/:projectId/bid-tracking')
  @ApiOperation({ summary: 'Get bid tracking metrics for project' })
  async getBidTracking(@Param('projectId') projectId: string) {
    return this.quoteAnalysis.getProjectBidTracking(projectId);
  }
}
