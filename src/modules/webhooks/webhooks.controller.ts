import { Controller, Post, Get, Headers, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { QuotesService } from '../quotes/quotes.service';
import { Request } from 'express';
import { simpleParser } from 'mailparser';

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
    const multerFiles = (req as any).files || [];
    
    console.log('📧 ==========================================');
    console.log('📧 INBOUND EMAIL RECEIVED FROM SENDGRID');
    console.log('📧 ==========================================');
    console.log('  Content-Type:', headers['content-type']);
    console.log('  Body keys:', Object.keys(payload).join(', '));
    console.log('  Multer files:', multerFiles.length);
    console.log('  Has raw email field:', !!payload.email);
    console.log(`  From: ${payload.from || '(not in body)'}`);
    console.log(`  To: ${payload.to || '(not in body)'}`);
    console.log(`  Subject: ${payload.subject || '(not in body)'}`);
    console.log(`  Attachments field: ${payload.attachments || '0'}`);

    try {
      // Extract email data from either parsed or raw mode
      const emailData = await this.extractEmailData(payload, multerFiles);
      
      console.log('📧 Extracted email data:');
      console.log(`  From: ${emailData.from}`);
      console.log(`  Subject: ${emailData.subject}`);
      console.log(`  Body length: ${emailData.body?.length || 0} chars`);
      console.log(`  Attachments: ${emailData.attachments.length}`);
      emailData.attachments.forEach((att, i) => {
        console.log(`    ${i + 1}: ${att.filename} (${att.contentType}, ${att.content.length} bytes)`);
      });

      // Check spam
      const spamScore = parseFloat(payload.spam_score || '0');
      if (spamScore > 5.0) {
        console.log('⚠️ Spam score too high, skipping');
        return { ignored: true, reason: 'spam_score_too_high' };
      }

      // Find RFQ ID
      let rfqId: string | null = null;
      
      const subjectMatch = (emailData.subject || '').match(/(RFQ-[0-9]+)/i);
      if (subjectMatch) {
        rfqId = subjectMatch[1];
        console.log(`📋 RFQ ID from subject: ${rfqId}`);
      }
      
      if (!rfqId) {
        const toMatch = (emailData.to || '').match(/rfq-(.+?)@/);
        if (toMatch) {
          rfqId = toMatch[1];
          console.log(`📋 RFQ ID from recipient: ${rfqId}`);
        }
      }
      
      if (!rfqId) {
        // Also search the email body for RFQ reference
        const bodyMatch = (emailData.body || '').match(/(RFQ-[0-9]+)/i);
        if (bodyMatch) {
          rfqId = bodyMatch[1];
          console.log(`📋 RFQ ID from email body: ${rfqId}`);
        }
      }

      if (!rfqId) {
        console.log('⚠️ Could not identify RFQ');
        return { error: 'Could not identify RFQ number in subject, recipient, or body.' };
      }

      // Check if quote already exists for this RFQ
      const existingQuote = await this.quotesService['prisma'].rFQ.findUnique({
        where: { rfqNumber: rfqId },
        include: { quote: true },
      });

      if (existingQuote?.quote) {
        console.log(`⚠️ Quote already exists for ${rfqId}, re-processing with new data`);
        // Delete old quote items and update
        await this.quotesService['prisma'].quoteItem.deleteMany({
          where: { quoteId: existingQuote.quote.id },
        });
        await this.quotesService['prisma'].quote.delete({
          where: { id: existingQuote.quote.id },
        });
        console.log('🗑️ Deleted old quote, will create fresh one');
      }

      // Extract PDF/Excel buffers from attachments
      const pdfBuffers: Buffer[] = [];
      for (const att of emailData.attachments) {
        if (att.contentType?.includes('pdf') || att.filename?.toLowerCase().endsWith('.pdf')) {
          pdfBuffers.push(att.content);
          console.log(`📄 PDF attachment found: ${att.filename}`);
        } else if (att.contentType?.includes('spreadsheet') || att.contentType?.includes('excel') || 
                   att.filename?.match(/\.(xlsx?|csv)$/i)) {
          pdfBuffers.push(att.content);
          console.log(`📊 Spreadsheet attachment found: ${att.filename}`);
        } else {
          console.log(`⏭️ Skipping non-quote attachment: ${att.filename} (${att.contentType})`);
        }
      }

      const result = await this.quotesService.parseQuoteFromEmail(
        rfqId,
        emailData.body || '',
        pdfBuffers.length > 0 ? pdfBuffers : undefined,
      );

      console.log('✅ Quote processed successfully!');
      console.log(`  Quote ID: ${result.quote.id}`);
      console.log(`  Items created: ${result.itemsCreated}`);
      console.log(`  Matched with prices: ${result.matchedItems}`);
      console.log(`  Parse source: ${result.parseSource}`);

      return {
        success: true,
        rfqId,
        quoteId: result.quote.id,
        itemsCreated: result.itemsCreated,
        matchedItems: result.matchedItems,
        parseSource: result.parseSource,
      };
    } catch (error) {
      console.error('❌ Error processing inbound email:', error.message);
      console.error('  Stack:', error.stack);
      return { error: error.message };
    }
  }

  private async extractEmailData(payload: any, multerFiles: any[]): Promise<{
    from: string;
    to: string;
    subject: string;
    body: string;
    attachments: { filename: string; contentType: string; content: Buffer }[];
  }> {
    // MODE 1: Raw MIME mode - SendGrid sends full email in 'email' field
    if (payload.email) {
      console.log('📧 Processing RAW MIME mode');
      try {
        const parsed = await simpleParser(payload.email);
        const attachments = (parsed.attachments || []).map(att => ({
          filename: att.filename || 'attachment',
          contentType: att.contentType || 'application/octet-stream',
          content: att.content,
        }));

        const toAddr = parsed.to
          ? (Array.isArray(parsed.to) ? parsed.to[0]?.text : parsed.to?.text) || ''
          : '';
        const htmlBody = parsed.html ? String(parsed.html).replace(/<[^>]+>/g, ' ') : '';

        return {
          from: parsed.from?.text || payload.from || '',
          to: toAddr || payload.to || '',
          subject: parsed.subject || payload.subject || '',
          body: parsed.text || htmlBody || '',
          attachments,
        };
      } catch (err) {
        console.error('Failed to parse raw MIME:', err.message);
      }
    }

    // MODE 2: Parsed mode - SendGrid sends separate fields + multer files
    console.log('📧 Processing PARSED mode');
    const attachments: { filename: string; contentType: string; content: Buffer }[] = [];

    // Get attachments from multer
    for (const file of multerFiles) {
      attachments.push({
        filename: file.originalname || file.fieldname || 'attachment',
        contentType: file.mimetype || 'application/octet-stream',
        content: file.buffer,
      });
    }

    // Also check for attachment-info field (SendGrid includes metadata)
    if (payload['attachment-info']) {
      try {
        const attachInfo = JSON.parse(payload['attachment-info']);
        console.log('  Attachment info:', JSON.stringify(attachInfo));
      } catch { /* not critical */ }
    }

    return {
      from: payload.from || '',
      to: payload.to || '',
      subject: payload.subject || '',
      body: payload.text || payload.html?.replace(/<[^>]+>/g, ' ') || '',
      attachments,
    };
  }
}
