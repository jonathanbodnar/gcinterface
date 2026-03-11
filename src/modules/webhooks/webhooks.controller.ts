import { Controller, Post, Get, Headers, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { QuotesService } from '../quotes/quotes.service';
import { Request } from 'express';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private quotesService: QuotesService) {}

  @Get('test')
  @ApiOperation({ summary: 'Test webhook endpoint is reachable' })
  async testWebhook() {
    console.log('🔔 Webhook test endpoint hit');
    return {
      ok: true,
      timestamp: new Date().toISOString(),
      message: 'Webhook endpoint is reachable. POST to /api/webhooks/sendgrid-inbound for inbound emails.',
    };
  }

  @Post('sendgrid-inbound')
  @ApiOperation({ summary: 'Receive inbound emails from SendGrid' })
  async handleSendGridInbound(
    @Req() req: Request,
    @Headers() headers: any,
  ) {
    const payload = req.body || {};
    
    console.log('📧 ==========================================');
    console.log('📧 INBOUND EMAIL RECEIVED FROM SENDGRID');
    console.log('📧 ==========================================');
    console.log('  Raw req.body type:', typeof req.body);
    console.log('  Raw req.body keys:', req.body ? Object.keys(req.body) : 'NULL');
    console.log('  Content-Type:', headers['content-type']);
    console.log(`  From: ${payload?.from}`);
    console.log(`  To: ${payload?.to}`);
    console.log(`  Subject: ${payload?.subject}`);
    console.log(`  Attachments count: ${payload?.attachments || '0'}`);
    console.log(`  Files from multer: ${(req as any).files?.length || 0}`);

    // Optional: Verify SendGrid signature for security
    if (process.env.SENDGRID_WEBHOOK_SECRET) {
      const signature = headers['x-twilio-email-event-webhook-signature'];
      // TODO: Implement signature verification
    }

    // Check spam score
    const spamScore = parseFloat(payload.spam_score || '0');
    if (spamScore > 5.0) {
      console.log('⚠️ Email marked as spam, skipping');
      return { ignored: true, reason: 'spam_score_too_high' };
    }

    try {
      const subject = payload?.subject || '';
      const to = payload?.to || '';
      const from = payload?.from || '';
      
      let rfqId: string | null = null;
      
      const subjectMatch = subject.match(/(RFQ-[0-9]+)/i);
      if (subjectMatch) {
        rfqId = subjectMatch[1];
        console.log(`📋 RFQ ID from subject: ${rfqId}`);
      }
      
      if (!rfqId) {
        const rfqMatch = to.match(/rfq-(.+?)@/);
        if (rfqMatch) {
          rfqId = rfqMatch[1];
          console.log(`📋 RFQ ID from recipient: ${rfqId}`);
        }
      }
      
      if (!rfqId) {
        console.log('⚠️ Could not identify RFQ from subject or recipient');
        console.log(`  Subject: ${subject}`);
        console.log(`  To: ${to}`);
        return { error: 'Could not identify RFQ. Please include RFQ number in subject.' };
      }

      return await this.processQuote(rfqId, payload, req);
    } catch (error) {
      console.error('❌ Error processing inbound email:', error);
      console.error('  Stack:', error.stack);
      return {
        error: error.message,
        from: payload?.from,
        subject: payload?.subject,
      };
    }
  }

  private async processQuote(rfqId: string, payload: any, req: Request) {
    // Verify RFQ exists (searching by rfqNumber, NOT id)
    const rfq = await this.quotesService['prisma'].rFQ.findUnique({
      where: { rfqNumber: rfqId },
      include: { vendor: true },
    });

    if (!rfq) {
      console.log(`⚠️ RFQ with number ${rfqId} not found`);
      return { error: 'RFQ not found' };
    }

    console.log(`✅ RFQ found: ${rfq.rfqNumber} for ${rfq.vendor.name}`);

    // Extract attachments (multer stores files in req.files)
    const attachments: Buffer[] = [];
    const files = (req as any).files || [];
    
    console.log(`📎 Multer parsed ${files.length} files`);
    
    for (const file of files) {
      try {
        // Multer provides the buffer directly
        attachments.push(file.buffer);
        console.log(`  📎 Attachment: ${file.originalname || file.fieldname} (${file.mimetype})`);
      } catch (error) {
        console.error(`Failed to process file ${file.originalname}:`, error.message);
      }
    }

    console.log(`📎 Total attachments ready for parsing: ${attachments.length}`);

    // Parse quote
    const emailBody = payload.text || payload.html || '';
    const result = await this.quotesService.parseQuoteFromEmail(
      rfqId,
      emailBody,
      attachments.length > 0 ? attachments : undefined,
    );

    console.log(`✅ Quote parsed successfully!`);
    console.log(`  Quote ID: ${result.quote.id}`);
    console.log(`  Items: ${result.itemsCreated}`);
    console.log(`  Pricing updates: ${result.pricingUpdates}`);

    // TODO: Send notification to admin
    // await this.sendNotification(rfq, result);

    return {
      success: true,
      rfqId,
      quoteId: result.quote.id,
      itemsCreated: result.itemsCreated,
      pricingUpdates: result.pricingUpdates,
    };
  }
}

