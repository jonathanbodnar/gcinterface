# 💰 Pricing Model Refactor - Vendor-Specific Pricing

## Current Problem

**Wrong Assumption:**
- Material has ONE unitCost (global)
- Same price regardless of vendor
- Admin enters hard-coded dollar amounts

**Reality:**
- Each vendor has DIFFERENT prices for the same material
- ABC Supply sells VCT for $3.50/SF
- XYZ Supply sells VCT for $3.25/SF
- Ferguson sells Kohler toilet for $485
- HD Supply sells same toilet for $520

## Correct Model

### Material (No Price)
```typescript
Material {
  name: "VCT Flooring 12x12"
  trade: "A"
  category: "Flooring"
  // NO unitCost here!
}
```

### VendorMaterialPricing (Vendor-Specific)
```typescript
VendorMaterialPricing {
  vendorId: "ferguson-id"
  materialId: "vct-flooring-id"
  unitCost: 3.50  // Ferguson's price
  effectiveDate: "2024-11-01"
  leadTimeDays: 5
  minimumOrder: 1000
}

VendorMaterialPricing {
  vendorId: "abc-supply-id"
  materialId: "vct-flooring-id"
  unitCost: 3.25  // ABC's price (cheaper!)
  effectiveDate: "2024-11-01"
  leadTimeDays: 3
}
```

### Material Rules (Labor Only)
```typescript
MaterialRule {
  material: "VCT Flooring"
  trade: "A"
  laborHours: 0.05  // hours per SF
  wasteFactor: 0.10  // 10% waste
  // NO unitCost!
}
```

### Trade Markup (Percentage Only)
```typescript
TradeMarkup {
  trade: "P"
  markup: 15  // 15% markup on plumbing
}
```

---

## Database Schema Changes

```prisma
// NEW: Vendor-specific material pricing
model VendorMaterialPricing {
  id              String @id @default(cuid())
  vendorId        String
  materialId      String
  
  // Pricing
  unitCost        Float
  uom             String  // Should match material.uom
  
  // Terms
  leadTimeDays    Int?
  minimumOrder    Float?
  discountTiers   Json?  // [{qty: 1000, discount: 0.05}]
  
  // Validity
  effectiveDate   DateTime @default(now())
  expiryDate      DateTime?
  
  // Source
  quotedBy        String?  // User who entered it
  sourceDocument  String?  // Quote reference
  
  active          Boolean @default(true)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  vendor          Vendor @relation(fields: [vendorId], references: [id])
  material        Material @relation(fields: [materialId], references: [id])
  
  @@unique([vendorId, materialId])
  @@index([materialId])
  @@map("vendor_material_pricing")
}

// MODIFY: Material - remove unitCost
model Material {
  // ... existing fields ...
  // REMOVE: unitCost Float?
  
  // ADD:
  vendorPricing VendorMaterialPricing[]
}

// MODIFY: MaterialRule - remove unitCost, keep labor
model MaterialRule {
  material     String
  trade        String
  
  // REMOVE: unitCost Float
  // KEEP:
  laborHours   Float  // Hours per unit
  wasteFactor  Float  // Percentage
  
  // Optional productivity data
  crewSize     Int?
  equipmentCost Float? // Per day or per unit
}

// KEEP: TradeMarkup stays as percentage
model TradeMarkup {
  trade   String
  markup  Float  // Percentage (15 = 15%)
}
```

---

## UI Changes

### Materials Page
**When viewing a material:**
```
Material: VCT Flooring 12x12
Trade: Architectural
Category: Flooring

VENDOR PRICING (3 vendors):
┌────────────────────────────────────────┐
│ ABC Building Supply                    │
│ $3.25/SF | Lead: 3 days | Updated: 2d │
│ [Edit Price] [History]                 │
├────────────────────────────────────────┤
│ Ferguson Supply                        │
│ $3.50/SF | Lead: 5 days | Updated: 1w │
│ [Edit Price] [History]                 │
├────────────────────────────────────────┤
│ Premier Materials                      │
│ $3.40/SF | Lead: 7 days | Updated: 3d │
│ [Edit Price] [History]                 │
└────────────────────────────────────────┘

[+ Add Vendor Price]

LABOR CONFIGURATION:
- Labor Hours: 0.05 hours/SF
- Waste Factor: 10%
- Crew Size: 2
```

### Rules & Markups Page
**Material Rules tab:**
```
Material: VCT Flooring
Trade: A
Labor Hours: 0.05 per SF  ← No cost!
Waste Factor: 10%
Crew Size: 2 (optional)
```

**Trade Markups tab:**
```
Mechanical (M): 15%  ← Percentage only
Electrical (E): 18%
Plumbing (P): 15%
Architectural (A): 12%
```

---

## Workflow Changes

### When Creating Quote/Estimate

**OLD (Wrong):**
```typescript
const cost = material.unitCost * quantity;
```

**NEW (Correct):**
```typescript
// Get vendor-specific price
const pricing = await getVendorPricing(vendorId, materialId);
const cost = pricing.unitCost * quantity;

// Apply markup
const markup = getTradeMarkup(material.trade);
const finalCost = cost * (1 + markup / 100);
```

### When Uploading Vendor Catalog

**Enhanced:**
```typescript
// When vendor uploads material catalog CSV
// Create/update VendorMaterialPricing (not Material.unitCost)

for (const row of csv) {
  await prisma.vendorMaterialPricing.upsert({
    where: { vendorId_materialId: { vendorId, materialId } },
    update: { unitCost: row.price },
    create: {
      vendorId,
      materialId,
      unitCost: row.price,
      leadTimeDays: row.leadTime,
    }
  });
}
```

---

## Intelligence Layer (AI Price Suggestions)

### When Vendor Quote Received

**Auto-detect if price is good:**
```typescript
async function analyzePricing(vendorId: string, materialId: string, quotedPrice: number) {
  // Get all prices for this material
  const allPrices = await prisma.vendorMaterialPricing.findMany({
    where: { materialId },
    include: { vendor: true }
  });
  
  const prices = allPrices.map(p => p.unitCost).sort();
  const median = prices[Math.floor(prices.length / 2)];
  const lowest = prices[0];
  
  return {
    quotedPrice,
    lowestPrice: lowest,
    medianPrice: median,
    percentAboveLowest: ((quotedPrice - lowest) / lowest) * 100,
    recommendation: quotedPrice <= lowest * 1.05 ? "ACCEPT" : "NEGOTIATE"
  };
}
```

### When Material Has No Prices

**AI Suggestion:**
```typescript
async function suggestPrice(material: Material) {
  // Option 1: Historical average from similar materials
  const similar = await findSimilarMaterials(material);
  const avgPrice = calculateAverage(similar.map(m => m.avgPrice));
  
  // Option 2: OpenAI web search
  const aiEstimate = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{
      role: "user",
      content: `What is the typical wholesale price for ${material.name} in ${material.category}? Provide just the number in $/SF or $/EA.`
    }]
  });
  
  return {
    suggestedPrice: avgPrice || parseFloat(aiEstimate),
    confidence: similar.length > 5 ? "HIGH" : "MEDIUM",
    source: similar.length > 0 ? "Historical" : "AI Estimate"
  };
}
```

---

## Implementation Plan

### Phase 1: Database Refactor (1-2 hours)
1. Add VendorMaterialPricing model to schema
2. Add relation to Vendor and Material
3. Run migration

### Phase 2: Backend Updates (2-3 hours)
1. Create VendorPricingService
2. Endpoints:
   - `POST /api/vendors/:id/materials/:materialId/pricing` - Set price
   - `GET /api/materials/:id/pricing` - Get all vendor prices
   - `GET /api/vendors/:id/catalog-pricing` - Vendor's full catalog
3. Update labor calculation to use vendor pricing
4. Update quote comparison to show per-vendor pricing

### Phase 3: UI Updates (3-4 hours)
1. Material detail modal: Show vendor pricing table
2. Add "Set Price" button per vendor
3. Rules & Markups: Remove cost fields, keep labor/waste
4. BOM view: Show price range (low-high) instead of single price

### Phase 4: Intelligence (2-3 hours)
1. AI price suggestion when no prices exist
2. Price comparison alerts (above/below market)
3. Price trend tracking over time

---

## Migration Strategy

**For existing data:**
```sql
-- Move existing Material.unitCost to vendor pricing
INSERT INTO vendor_material_pricing (vendorId, materialId, unitCost)
SELECT 
  (SELECT id FROM vendors LIMIT 1), -- Default to first vendor
  m.id,
  m.unitCost
FROM materials m
WHERE m.unitCost IS NOT NULL;

-- Remove unitCost column
ALTER TABLE materials DROP COLUMN unitCost;
```

---

## Example: Material Detail View (New)

```
Material: Copper Pipe Type L 1"
Trade: Plumbing
Times Used: 5 projects

VENDOR PRICING:
┌───────────────────────────────────────────────────┐
│ Bay Area Plumbing Supply          ⭐ Best Price   │
│ $8.25/LF | Lead: 3 days | Last updated: 2d ago    │
│ [Update Price] [Price History]                    │
├───────────────────────────────────────────────────┤
│ Ferguson Plumbing                                  │
│ $8.75/LF | Lead: 5 days | Last updated: 1w ago    │
│ ⚠️ 6% above best price                            │
│ [Update Price] [Price History]                    │
├───────────────────────────────────────────────────┤
│ No pricing from other vendors                     │
│ [+ Add Vendor Price]                              │
└───────────────────────────────────────────────────┘

LABOR & WASTE:
- Labor: 0.15 hours/LF
- Waste Factor: 10%
- Trade Markup: 15% (Plumbing)

💡 AI Suggestion: Market price range $8.00-$9.00/LF
   Current best price is competitive ✓
```

---

## Benefits

1. **Accurate Estimates**
   - Use actual vendor pricing
   - Account for vendor differences
   - Bid leveling shows real savings

2. **Competitive Intelligence**
   - Track which vendors have best prices
   - See price trends over time
   - Make data-driven vendor selections

3. **Flexibility**
   - Same material, different suppliers, different prices
   - Can update vendor prices without changing material
   - Historical pricing preserved

4. **Transparency**
   - See all vendor options
   - Compare prices side-by-side
   - Understand markup vs base cost

---

**Ready to implement this refactor?** It's a significant improvement to the pricing model!

