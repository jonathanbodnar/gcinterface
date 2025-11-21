# 📧 SendGrid Email Ingestion - Implementation Plan

## Overview
Automatically receive vendor quote emails and parse them into the system.

---

## 🎯 **What This Enables**

**Current (Manual):**
1. Vendor emails quote
2. User copies email text
3. User pastes into Quote Comparison page
4. User clicks "Parse & Upload"

**With SendGrid (Automatic):**
1. Vendor replies to RFQ email
2. ✨ System automatically receives email
3. ✨ Parses quote and creates record
4. ✨ Updates vendor pricing
5. ✨ Notifies user "Quote received from ABC Supply"

---

## 📋 **Step 1: Domain Setup** (YOU DO THIS)

### **DNS Records to Add:**

**Option A: Subdomain (Recommended)**
```
Type: MX
Host: quotes
Value: mx.sendgrid.net
Priority: 10

Result: emails to rfq-xxx@quotes.gclegacy.com
```

**Option B: Main domain**
```
Type: MX
Host: @
Value: mx.sendgrid.net  
Priority: 10

Result: emails to rfq-xxx@gclegacy.com
```

**Recommendation:** Use subdomain (`quotes.gclegacy.com`) to avoid interfering with your main email.

### **SPF Record (Prevents Spam)**
```
Type: TXT
Host: quotes
Value: v=spf1 include:sendgrid.net ~all
```

### **DKIM (Optional but Recommended)**
SendGrid provides these - add after signup

---

## 📋 **Step 2: SendGrid Account Setup** (YOU DO THIS)

### **Sign Up:**
1. Go to: https://signup.sendgrid.com
2. Choose: **Free plan** (100 emails/day)
3. Verify email address

### **Domain Verification:**
1. Settings → Sender Authentication
2. Click "Authenticate Your Domain"
3. Enter: `quotes.gclegacy.com`
4. SendGrid gives you DNS records
5. Add records to your DNS
6. Click "Verify" (may take 24-48 hours for DNS propagation)

### **Get API Key:**
1. Settings → API Keys
2. Create API Key
3. **Copy it** (only shown once!)
4. Give me this for Railway environment variable

---

## 📋 **Step 3: Configure Inbound Parse** (YOU DO THIS)

### **In SendGrid Dashboard:**
1. Settings → Inbound Parse
2. Click "Add Host & URL"
3. **Hostname:** `quotes.gclegacy.com`
4. **URL:** `https://gcinterface-development.up.railway.app/api/webhooks/inbound-quote`
5. ☑ Check "POST the raw, full MIME message"
6. Click "Add"

---

## 📋 **Step 4: Code Implementation** (I DO THIS)

### **New Webhook Controller:**
```typescript
// src/modules/webhooks/webhooks.controller.ts

@Controller('webhooks')
export class WebhooksController {
  
  @Post('inbound-quote')
  async handleInboundQuote(@Body() payload: any) {
    // SendGrid sends multipart/form-data
    const email = this.parseInboundEmail(payload);
    
    // Extract RFQ ID from "to" address
    // rfq-abc123xyz@quotes.gclegacy.com → abc123xyz
    const rfqId = email.to.match(/rfq-(.+?)@/)?.[1];
    
    if (!rfqId) {
      console.log('No RFQ ID found in email');
      return { error: 'Invalid recipient' };
    }
    
    // Parse attachments (Excel quotes)
    const attachments = email.attachments?.map(att => 
      Buffer.from(att.content, 'base64')
    );
    
    // Parse quote and update pricing
    const result = await this.quotesService.parseQuoteFromEmail(
      rfqId,
      email.text || email.html,
      attachments
    );
    
    // Notify user (optional)
    await this.notifyQuoteReceived(rfqId, result);
    
    return { success: true, quoteId: result.quote.id };
  }
}
```

### **Update RFQ Email Template:**
```html
<p>Please reply to this email with your quote:</p>
<p><strong>Reply-To: rfq-{{rfqId}}@quotes.gclegacy.com</strong></p>

<!-- Or include in email headers -->
Reply-To: rfq-{{rfqId}}@quotes.gclegacy.com
```

### **Generate Unique Email Per RFQ:**
```typescript
// When creating RFQ
const rfq = await prisma.rFQ.create({
  data: {
    rfqNumber: `RFQ-${Date.now()}`,
    // ... other fields
    replyToEmail: `rfq-${rfqId}@quotes.gclegacy.com`
  }
});
```

---

## 📋 **Step 5: Testing** (WE DO TOGETHER)

### **Test Flow:**
1. Create RFQ in system
2. RFQ email sent with `Reply-To: rfq-xxx@quotes.gclegacy.com`
3. **YOU:** Reply to email from your vendor email
4. **ME:** Check webhook receives it (Railway logs)
5. **SYSTEM:** Parses quote automatically
6. **YOU:** Verify quote appears in Quote Comparison page
7. **ME:** Check vendor pricing updated

### **What to Test:**
- ✅ Email received by webhook
- ✅ RFQ ID extracted correctly
- ✅ Excel attachment parsed
- ✅ Plain text email parsed
- ✅ Quote created in database
- ✅ Vendor pricing updated
- ✅ RFQ status changed to "RESPONDED"

---

## 🔧 **Environment Variables Needed**

**Add to Railway (gcinterface backend):**
```
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
SENDGRID_WEBHOOK_SECRET=your-secret-key (optional, for verification)
QUOTES_EMAIL_DOMAIN=quotes.gclegacy.com
```

---

## 📊 **SendGrid Payload Format**

**What SendGrid sends to webhook:**
```json
{
  "headers": "Received: from mail.example.com...",
  "dkim": "{@example.com : pass}",
  "to": "rfq-abc123@quotes.gclegacy.com",
  "from": "vendor@abcsupply.com",
  "sender_ip": "1.2.3.4",
  "spam_report": "...",
  "envelope": "{\"to\":[\"rfq-abc123@quotes.gclegacy.com\"],\"from\":\"vendor@abcsupply.com\"}",
  "subject": "Re: Request for Quote - RFQ #abc123",
  "charsets": "{\"to\":\"UTF-8\",\"subject\":\"UTF-8\",\"from\":\"UTF-8\"}",
  "SPF": "pass",
  "attachments": "2",
  "attachment1": {
    "filename": "quote.xlsx",
    "type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "content": "base64-encoded-data..."
  },
  "attachment-info": "{\"attachment1\":{\"filename\":\"quote.xlsx\",\"type\":\"...\",\"content-id\":\"...\"}}",
  "text": "Here is our quote:\n\nVCT Flooring: $3.50/SF\nTotal: $8,750",
  "html": "<p>Here is our quote...</p>",
  "spam_score": "0.0"
}
```

---

## 🚨 **Error Handling**

**Edge Cases:**
- Email to wrong address → Log and ignore
- No RFQ found → Send bounce notification
- Parse fails → Save raw email for manual review
- Duplicate quote → Update existing
- Invalid attachment → Use email text

**Logging:**
```typescript
console.log(`📧 Inbound email: ${from} → ${to}`);
console.log(`📋 RFQ ID: ${rfqId}`);
console.log(`📎 Attachments: ${attachments?.length || 0}`);
console.log(`✅ Quote parsed: ${itemsCount} items, $${totalAmount}`);
console.log(`💰 Vendor pricing updated: ${pricingUpdates} materials`);
```

---

## 📈 **Metrics to Track**

**After Implementation:**
- Emails received per day
- Parse success rate
- Average parse time
- Vendor response rate
- Time from RFQ sent → Quote received

---

## 🔐 **Security Considerations**

### **Webhook Verification:**
```typescript
// Verify webhook is from SendGrid
@Post('webhooks/inbound-quote')
async handleInbound(@Body() payload: any, @Headers() headers: any) {
  // Optional: Verify SendGrid signature
  const signature = headers['x-twilio-email-event-webhook-signature'];
  if (process.env.SENDGRID_WEBHOOK_SECRET) {
    if (!this.verifySendGridSignature(payload, signature)) {
      throw new UnauthorizedException('Invalid signature');
    }
  }
  
  // Process email...
}
```

### **Spam Prevention:**
```typescript
// Check spam score
if (parseFloat(payload.spam_score) > 5.0) {
  console.log('Email marked as spam, skipping');
  return { ignored: true, reason: 'spam' };
}

// Verify sender is known vendor
const vendor = await prisma.vendor.findFirst({
  where: { email: payload.from }
});

if (!vendor) {
  console.log('Email from unknown sender');
  // Could still process or flag for review
}
```

---

## 📝 **When You're Ready**

**What YOU need to provide:**
1. ✅ Domain name you want to use (e.g., `quotes.gclegacy.com`)
2. ✅ SendGrid API key (after you sign up)
3. ✅ Confirm DNS records added

**What I'LL do:**
1. ✅ Create webhook endpoint
2. ✅ Implement email parsing
3. ✅ Update RFQ template with reply-to
4. ✅ Add error handling
5. ✅ Test with you

**ETA: 2-3 hours once domain ready!**

---

## 💡 **Testing Without Domain (Now)**

You can test the quote parsing manually:
1. Go to Quote Comparison page
2. Paste email text
3. Upload Excel
4. See it work!

Once domain ready, same logic runs automatically via webhook.

**Ready when you are!** Just let me know when domain is configured. 🚀

