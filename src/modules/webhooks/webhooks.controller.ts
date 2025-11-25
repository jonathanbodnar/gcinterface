import { Controller, Post, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { QuotesService } from '../quotes/quotes.service';

interface SendGridAttachment {
  content: string; // base64
  type: string;
  filename: string;
  disposition: string;
  content_id: string;
}

interface SendGridInbound {
  headers: string;
  dkim: string;
  to: string;
  from: string;
  sender_ip: string;
  spam_report: string;
  envelope: string;
  subject: string;
  charsets: string;
  SPF: string;
  attachments?: string; // Count
  [key: string]: any; // attachment1, attachment2, etc.
  text?: string;
  html?: string;
  spam_score?: string;
}

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private quotesService: QuotesService) {}

  @Post('sendgrid-inbound')
  @ApiExcludeEndpoint() // Don't show in Swagger (webhook endpoint)
  @ApiOperation({ summary: 'Receive inbound emails from SendGrid' })
  async handleSendGridInbound(
    @Body() payload: SendGridInbound,
    @Headers() headers: any,
  ) {
    console.log('📧 Inbound email received from SendGrid');
    console.log(`  From: ${payload.from}`);
    console.log(`  To: ${payload.to}`);
    console.log(`  Subject: ${payload.subject}`);

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
      // Extract RFQ ID from recipient email
      // Format: rfq-{rfqId}@quotes.gclegacy.com
      const rfqMatch = payload.to.match(/rfq-(.+?)@/);
      
      if (!rfqMatch) {
        console.log('⚠️ No RFQ ID found in recipient address');
        // Try extracting from subject line
        const subjectMatch = payload.subject.match(/RFQ #?(\S+)/i);
        if (subjectMatch) {
          return await this.processQuote(subjectMatch[1], payload);
        }
        return { error: 'Could not identify RFQ' };
      }

      const rfqId = rfqMatch[1];
      console.log(`📋 RFQ ID: ${rfqId}`);

      return await this.processQuote(rfqId, payload);
    } catch (error) {
      console.error('❌ Error processing inbound email:', error);
      return {
        error: error.message,
        from: payload.from,
        subject: payload.subject,
      };
    }
  }

  private async processQuote(rfqId: string, payload: SendGridInbound) {
    // Verify RFQ exists
    const rfq = await this.quotesService['prisma'].rFQ.findUnique({
      where: { id: rfqId },
      include: { vendor: true },
    });

    if (!rfq) {
      console.log(`⚠️ RFQ ${rfqId} not found`);
      return { error: 'RFQ not found' };
    }

    console.log(`✅ RFQ found: ${rfq.rfqNumber} for ${rfq.vendor.name}`);

    // Extract attachments
    const attachments: Buffer[] = [];
    const attachmentCount = parseInt(payload.attachments || '0');

    for (let i = 1; i <= attachmentCount; i++) {
      const attKey = `attachment${i}`;
      if (payload[attKey]) {
        try {
          const att = typeof payload[attKey] === 'string' 
            ? JSON.parse(payload[attKey])
            : payload[attKey];
          
          // Convert base64 to buffer
          const buffer = Buffer.from(att.content || att, 'base64');
          attachments.push(buffer);
          console.log(`  📎 Attachment: ${att.filename || `attachment${i}`} (${att.type || 'unknown'})`);
        } catch (error) {
          console.error(`Failed to parse attachment${i}:`, error.message);
        }
      }
    }

    console.log(`📎 Total attachments: ${attachments.length}`);

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

