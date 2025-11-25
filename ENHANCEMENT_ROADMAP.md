# 🚀 GC Interface - Major Enhancements Roadmap

## Priority Enhancements from Requirements Review

---

## ✅ **ALREADY DONE**

1. **Vendor Pricing from Quotes** ✅
   - Quote ingestion updates VendorMaterialPricing
   - Tracks price per vendor per material
   - Historical pricing preserved

---

## 🔴 **HIGH PRIORITY (Build First)**

### **1. Smart Vendor Suggestions** (2-3 hours)
**Goal:** Auto-rank vendors during vendor matching by price competitiveness

**Implementation:**
```typescript
// When loading vendor matching
async function rankVendorsByPrice(projectId: string) {
  const bomItems = await getBOM(projectId);
  const vendors = await getVendors();
  
  for (const vendor of vendors) {
    let totalEstimate = 0;
    let materialsWithPricing = 0;
    
    for (const item of bomItems) {
      const pricing = await getVendorPricing(vendor.id, item.materialId);
      if (pricing) {
        totalEstimate += pricing.unitCost * item.quantity;
        materialsWithPricing++;
      }
    }
    
    vendor.estimatedCost = totalEstimate;
    vendor.coverage = (materialsWithPricing / bomItems.length) * 100;
    vendor.competitiveScore = calculateScore(totalEstimate, vendor.rating);
  }
  
  return vendors.sort((a, b) => b.competitiveScore - a.competitiveScore);
}
```

**UI Changes:**
- Vendor cards show estimated cost
- "Best Value" badge for most competitive
- Sort by: Price, Rating, or Coverage

---

### **2. Material Alternatives Tracking** (3-4 hours)
**Goal:** Highlight alternatives in quote review with % completion

**Database:**
```prisma
model QuoteItem {
  // ... existing fields
  isAlternate Boolean @default(false)
  alternateFor String? // Original material ID
  isSubstitution Boolean @default(false) // VE alternative
}
```

**Quote Review UI:**
```
Original Materials vs Quoted:
┌──────────────────────────────────────────────────┐
│ ✅ VCT Flooring - $3.50/SF (quoted)              │
├──────────────────────────────────────────────────┤
│ 🟡 Paint - Sherwin Williams (alternative)       │
│    Original: Interior Paint                      │
│    Alt: SW ProMar 200 (equal quality, -5%)      │
├──────────────────────────────────────────────────┤
│ 🔴 Ceiling Tile - NOT QUOTED                     │
│    Missing: Acoustical 2x2                       │
└──────────────────────────────────────────────────┘

Coverage: 67% (2 of 3 materials)
Alternatives: 1 (needs review)
```

**Algorithm:**
```typescript
function analyzeQuoteCoverage(rfq, quote) {
  const rfqItems = rfq.items; // What we asked for
  const quoteItems = quote.items; // What they quoted
  
  const matched = [];
  const alternatives = [];
  const missing = [];
  
  for (const rfqItem of rfqItems) {
    const exact = quoteItems.find(qi => qi.bomItemId === rfqItem.bomItemId);
    if (exact) {
      matched.push(exact);
    } else {
      // Look for similar description (potential alternative)
      const similar = quoteItems.find(qi => 
        similarity(qi.description, rfqItem.description) > 0.7
      );
      if (similar) {
        alternatives.push({ original: rfqItem, alternative: similar });
      } else {
        missing.push(rfqItem);
      }
    }
  }
  
  return {
    coveragePercent: (matched.length / rfqItems.length) * 100,
    matched,
    alternatives,
    missing,
  };
}
```

---

### **3. Project Status & Reporting** (2-3 hours)
**Goal:** Admin sets awarded/lost, tracks bid collection, due dates

**Database:**
```prisma
model Project {
  // Add new fields
  projectStatus String? // "Awarded", "Lost", "Active"
  currentStage String? // "Collecting Bids", "In Progress", "Completed"
  dueDate DateTime?
  awardedDate DateTime?
  awardedAmount Float?
  lostReason String?
  
  // Bid tracking
  rfqsSent Int @default(0)
  quotesReceived Int @default(0)
  responseRate Float?
}
```

**Dashboard Additions:**
```
Project Stats:
- Awarded: 5 projects ($2.5M)
- Lost: 2 projects
- Pending Award: 3 projects
- Avg Response Rate: 78%
```

---

### **4. RFQ as PDF Generation** (3-4 hours)
**Goal:** Generate professional PDF RFQs instead of just email

**Implementation:**
- Use `pdfkit` or `puppeteer` to generate PDF
- Material table formatted nicely
- Company branding
- Attach to email

**For Subcontractors:**
- Extract relevant plan pages
- Include scope pages only (filter by trade)
- Merge into RFQ PDF
- Clear requirements document

---

### **5. SendGrid Integration** (2-3 hours)
**Goal:** Automatic quote receipt via email

**Setup:**
- Domain: `quotes@mail.gclegacy.com`
- Inbound webhook → Parse quotes
- Update vendor pricing automatically

**Endpoints:**
```typescript
@Post('webhooks/sendgrid-inbound')
async handleInbound(@Body() payload: SendGridPayload) {
  // Extract RFQ ID from subject or recipient
  // Parse attachments (Excel quotes)
  // Create quote + update pricing
  // Notify admin
}
```

---

## 🟡 **MEDIUM PRIORITY**

### **6. WYSIWYG Email Template Editor** (4-5 hours)
**Options:**
- TinyMCE (best for email)
- Quill (simpler)
- React Email (modern)

**Features:**
- Drag-drop content blocks
- Variable insertion ({{projectName}})
- Preview mode
- Mobile preview

---

### **7. Plan Page Extraction for Subcontractors** (4-6 hours)
**Goal:** Auto-extract relevant pages for each trade

**Algorithm:**
```typescript
async function extractRelevantPages(projectId: string, trade: string) {
  const planPages = await getPlanPages(projectId);
  
  // Filter by trade
  const relevant = planPages.filter(page => 
    page.discipline === trade ||
    page.featuresOnPage.some(f => f.trade === trade)
  );
  
  // Merge PDFs
  const mergedPdf = await mergePdfPages(relevant);
  
  return mergedPdf;
}
```

---

## 🟢 **LOWER PRIORITY**

### **8. Advanced Quote Comparison**
- Side-by-side material matching
- VE alternative approval workflow
- Cost-benefit analysis

---

## 📋 **Implementation Order**

### **Week 1: Quote Intelligence**
- Day 1-2: Material alternatives tracking
- Day 3: Quote coverage % calculation
- Day 4-5: Smart vendor suggestions

### **Week 2: Project Management**
- Day 1-2: Project status enhancements
- Day 3-4: Bid tracking and reporting
- Day 5: Dashboard metrics

### **Week 3: PDF & Email**
- Day 1-2: RFQ PDF generation
- Day 3-4: SendGrid integration
- Day 5: Plan page extraction

### **Week 4: Polish**
- Day 1-3: WYSIWYG editor
- Day 4-5: Testing and refinement

---

## 🎯 **Quick Wins (Start Today)**

1. ✅ Smart vendor ranking (2 hours)
2. ✅ Quote coverage % (2 hours)
3. ✅ Project status fields (1 hour)

**Total: 5 hours for immediate value**

---

## 📊 **Reference Files Analysis**

### **From `/reference/` Directory:**

**Bid Proposals (Excel):**
- Electrical, Mechanical, Plumbing formats
- Line item structure
- Material descriptions
- Quantities and pricing columns
- Subtotals and totals

**Material Breakdown:**
- Detailed material lists
- Categories and CSI codes
- Quantities per location

**Key Patterns Identified:**
1. **Material table must include:**
   - Item #, Description, Quantity, UOM, Unit Price, Total
   - Clear subtotals by section
   - Grand total prominent
   
2. **Subcontractor bids need:**
   - Scope of work description
   - Plan references (sheet numbers)
   - Exclusions clearly stated
   - Schedule requirements
   
3. **Missing from current templates:**
   - Detailed exclusions section
   - Insurance requirements prominent
   - Schedule/milestone section
   - Payment schedule
   - Change order terms

---

**Ready to start building?** I recommend starting with:
1. Smart vendor ranking
2. Quote coverage tracking
3. Material alternatives highlighting

These give immediate value and set foundation for PDF generation.

