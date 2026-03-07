# Feature Implementation Status

## ✅ Task 1: Fix Total Labor Cost Breakdown
**Status:** COMPLETED & DEPLOYED

### Changes Made:
- Added `materialCost` to labor calculation
- Added `totalCost` per trade (labor + materials)
- Added `grandTotal` to summary
- Fixed display of labor breakdown on project detail page

### Files Modified:
- `src/modules/labor/labor-calculation.service.ts`

---

## ✅ Task 3 & 4: Client Database + 3-Tier Markup Hierarchy
**Status:** SCHEMA COMPLETED & DEPLOYED (Migration Needed)

### Schema Changes:
```prisma
// NEW MODELS
model Client {
  id            String  @id @default(cuid())
  name          String
  contactName   String?
  email         String?
  phone         String?
  defaultMarkup Float?  // Master fallback markup
  // ... other fields
}

model MaterialMarkup {
  id          String  @id @default(cuid())
  clientId    String?
  materialId  String
  markup      Float  // Highest priority
  // ... other fields
}

model TradeMarkup {
  id          String  @id @default(cuid())
  clientId    String? // NULL = global default
  trade       String
  markup      Float  // Medium priority
  // ... other fields
}
```

### Markup Hierarchy (Priority Order):
1. **MaterialMarkup** (clientId + materialId) - HIGHEST
   - Example: Client A wants 25% on "VCT Flooring"
2. **TradeMarkup** (clientId + trade) - MEDIUM
   - Example: Client B wants 15% on all Plumbing (P)
   - Falls back to global (clientId=NULL) if no client-specific
3. **Client.defaultMarkup** - LOWEST
   - Example: Client C default 10% on everything

### Next Steps (TODO):
1. **Run Database Migration:**
   ```bash
   cd /Users/jonathanbodnar/gcinterface
   npx prisma migrate dev --name add_client_and_markup_hierarchy
   npx prisma generate
   ```

2. **Create Markup Calculation Service:**
   ```typescript
   // src/modules/pricing/markup.service.ts
   @Injectable()
   export class MarkupService {
     async getMarkupForMaterial(
       materialId: string,
       trade: string,
       clientId?: string
     ): Promise<number> {
       // 1. Check MaterialMarkup (highest priority)
       const materialMarkup = await this.prisma.materialMarkup.findFirst({
         where: { clientId, materialId, active: true },
       });
       if (materialMarkup) return materialMarkup.markup;

       // 2. Check TradeMarkup (medium priority)
       const tradeMarkup = await this.prisma.tradeMarkup.findFirst({
         where: { clientId, trade },
       });
       if (tradeMarkup) return tradeMarkup.markup;

       // 3. Check global TradeMarkup
       const globalTradeMarkup = await this.prisma.tradeMarkup.findFirst({
         where: { clientId: null, trade },
       });
       if (globalTradeMarkup) return globalTradeMarkup.markup;

       // 4. Check Client default markup (lowest priority)
       if (clientId) {
         const client = await this.prisma.client.findUnique({
           where: { id: clientId },
         });
         if (client?.defaultMarkup) return client.defaultMarkup;
       }

       return 0; // No markup found
     }
   }
   ```

3. **Update Labor Calculation to Use Markups:**
   - Modify `labor-calculation.service.ts`
   - Call `markupService.getMarkupForMaterial()` per BOM item
   - Apply material-level markups instead of just trade-level

4. **Add Client Selection UI:**
   - During project import from takeoff, show client dropdown
   - Create admin page for managing clients (`/admin/clients`)
   - Create admin page for managing markups (`/admin/markups`)

---

## 🔧 Task 2: RFQ Coverage Tracking
**Status:** TODO (Pending Migration)

### Requirement:
After sending RFQs, material coverage should reflect which materials have been quoted, not just which vendors were selected.

### Implementation Plan:
1. Add `rfqStatus` field to BOM items:
   ```prisma
   model BOM {
     // ... existing fields
     rfqStatus    String? // "Not Sent", "RFQ Sent", "Quote Received", "Awarded"
     rfqSentDate  DateTime?
     quotedBy     String? // Vendor ID
     quoteDate    DateTime?
   }
   ```

2. Update RFQ creation to mark BOM items:
   ```typescript
   // When creating RFQ
   await this.prisma.bOM.updateMany({
     where: { id: { in: bomItemIds } },
     data: { rfqStatus: 'RFQ Sent', rfqSentDate: new Date() },
   });
   ```

3. Update quote ingestion to mark items:
   ```typescript
   // When quote received
   await this.prisma.bOM.update({
     where: { id: bomItemId },
     data: {
       rfqStatus: 'Quote Received',
       quotedBy: vendorId,
       quoteDate: new Date(),
     },
   });
   ```

4. Update VendorMatching page:
   - Show RFQ status badges on materials
   - Filter "Materials Needing Quotes" vs "Materials with Quotes"
   - Update coverage calculation to count quoted items

---

## 🔧 Task 5: Due Date Warning
**Status:** TODO (Pending Migration)

### Requirement:
Show warning when due date is within 7 days and materials lack quotes.

### Implementation Plan:
1. Add check in ProjectDetail page:
   ```typescript
   const isDueSoon = project.dueDate &&
     new Date(project.dueDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

   const quotedMaterials = bom.items.filter(
     item => item.rfqStatus === 'Quote Received'
   ).length;
   const quoteCoverage = (quotedMaterials / bom.items.length) * 100;

   const showWarning = isDueSoon && quoteCoverage < 100;
   ```

2. Add warning banner:
   ```tsx
   {showWarning && (
     <Alert variant="destructive">
       <AlertTriangle className="h-4 w-4" />
       <AlertTitle>Action Required</AlertTitle>
       <AlertDescription>
         Due date is in {daysUntilDue} days but only {quoteCoverage.toFixed(0)}% 
         of materials have quotes.
         <Button variant="link" onClick={() => navigate(`/projects/${id}/vendor-matching`)}>
           Select Additional Vendors
         </Button>
       </AlertDescription>
     </Alert>
   )}
   ```

3. Add to dashboard "Action Items":
   ```typescript
   const projectsDueSoon = projects.filter(p => {
     const dueSoon = p.dueDate && 
       new Date(p.dueDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
     const incomplete = (p.quoteCoverage || 0) < 100;
     return dueSoon && incomplete;
   });
   ```

---

## Summary

### Completed:
- ✅ Labor cost breakdown fixed
- ✅ Client database schema added
- ✅ 3-tier markup hierarchy schema added
- ✅ Fuzzy material matching deployed
- ✅ Vendor coverage API deployed

### Pending (Requires Database Migration):
- 🔧 Markup calculation service implementation
- 🔧 Client selection during project import
- 🔧 Admin UI for clients and markups
- 🔧 RFQ status tracking on BOM items
- 🔧 Due date warning system
- 🔧 Quote coverage in vendor matching

### Action Required:
**Run database migration when ready:**
```bash
cd /Users/jonathanbodnar/gcinterface
npx prisma migrate dev --name add_client_and_markup_hierarchy
npx prisma generate
npm run build
```

**Then implement the TODO services and UI components listed above.**




