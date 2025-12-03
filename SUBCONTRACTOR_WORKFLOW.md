# Subcontractor Labor Matching Workflow

## Overview
The system now supports a complete **Material + Labor procurement workflow**:
1. **Material Selection** → Choose suppliers for materials
2. **Labor Selection** → Choose subcontractors for installation (NEW)

---

## What's Been Added

### 1. Enhanced MaterialRule Model
```prisma
model MaterialRule {
  laborPerUnit         Float? // Hours per unit (e.g., 0.015 hrs/SF)
  laborRate            Float? // $ per hour for this type of work
  crewSize             Int?   // Typical crew size needed
  equipmentCostPerDay  Float? // Equipment/tools cost
}
```

**Example:**
- VCT Flooring: 0.015 hrs/SF @ $45/hr
- Drywall Install: 0.02 hrs/SF @ $50/hr
- Plumbing Fixture: 2.5 hrs/EA @ $65/hr

### 2. Enhanced Vendor Model (Subcontractors)
```prisma
model Vendor {
  // Existing fields...
  laborRate            Float?   // Base hourly rate
  materialCapabilities String[] // Materials they can install
}
```

**Example Subcontractor:**
```typescript
{
  name: "ABC Flooring Contractors",
  type: "SUBCONTRACTOR",
  trades: ["A"],
  materialCapabilities: [
    "VCT Flooring",
    "Carpet Tile",
    "Sheet Vinyl",
    "LVT Flooring"
  ],
  laborRate: 45.00,
  crewSize: 4
}
```

### 3. VendorLaborPricing Model (NEW)
Stores subcontractor-specific labor pricing:
```prisma
model VendorLaborPricing {
  vendorId        String
  materialId      String? // Null = applies to whole trade
  trade           String
  laborRate       Float   // $ per hour
  hoursPerUnit    Float?  // Hours per SF, LF, EA
  minimumCharge   Float?
  mobilizationCost Float?
}
```

**Example:**
```typescript
{
  vendorId: "sub-001",
  materialId: "mat-vct-flooring",
  trade: "A",
  laborRate: 42.00,      // Better rate than their base
  hoursPerUnit: 0.013,   // Faster than average
  minimumCharge: 500.00
}
```

---

## Labor Calculation Updates

### Before:
```typescript
rate: 50.00 // Hardcoded default
```

### After:
```typescript
// 1. Try MaterialRule first (fuzzy match)
const rule = await findMaterialRule(bomItem.description);
if (rule) {
  rate = rule.laborRate || 50.00;
  hoursPerUnit = rule.laborPerUnit;
}

// 2. Fuzzy matching with 70% threshold
// "VCT Flooring 12x12" matches "VCT Flooring" (88%)
```

---

## Subcontractor Ranking

### API: `GET /vendors/rank-subcontractors/:projectId`

Returns subcontractors ranked by:
1. **Labor Rate** (lower is better)
2. **Material Coverage** (higher is better)
3. **Rating** (higher is better)

**Response:**
```typescript
{
  hasData: true,
  rankings: [
    {
      vendorId: "sub-001",
      vendorName: "ABC Flooring Contractors",
      estimatedLaborCost: 15000,
      materialCoverage: 75,    // Can install 75% of materials
      competitiveScore: 82,    // Overall score
      avgRateVsMarket: -8,     // 8% below market average
      materialsWithPricing: 6,
      totalMaterials: 8,
      crewSize: 4,
      laborRate: 42.00
    },
    // ... more subcontractors
  ]
}
```

### API: `GET /vendors/:vendorId/labor-coverage/:projectId`

Returns detailed coverage for a specific subcontractor:
```typescript
{
  vendorId: "sub-001",
  vendorName: "ABC Flooring Contractors",
  covered: [
    {
      bomItemId: "bom-001",
      description: "VCT Flooring 12x12",
      materialName: "VCT Flooring",
      laborRate: 42.00,
      estimatedHours: 15.75,
      estimatedCost: 661.50,
      matchType: "fuzzy"
    }
  ],
  uncovered: [
    {
      bomItemId: "bom-002",
      description: "Ceramic Tile"
    }
  ],
  coverage: 75,
  totalMaterials: 8
}
```

---

## Procurement Workflow

### Phase 1: Material Procurement
1. Go to **Vendor Matching** (`/projects/:id/vendor-matching`)
2. Select **suppliers** for materials
3. System shows material coverage per supplier
4. Create RFQs for selected suppliers

### Phase 2: Labor Procurement (NEW)
1. Go to **Subcontractor Matching** (need to add UI)
2. System shows subcontractors who can install the materials
3. **Ranking criteria:**
   - ✅ Can they install these specific materials?
   - 💰 What's their labor rate?
   - ⭐ What's their performance rating?
4. Select subcontractors for labor
5. Create RFQs for selected subcontractors

---

## Frontend Implementation Needed

### 1. SubcontractorMatching.tsx (NEW PAGE)
```typescript
// Similar to VendorMatching.tsx but for subcontractors
// Route: /projects/:projectId/subcontractor-matching

export default function SubcontractorMatching() {
  const { projectId } = useParams();
  const [subcontractors, setSubcontractors] = useState([]);
  const [selectedSubs, setSelectedSubs] = useState(new Set());
  
  useEffect(() => {
    // Load ranked subcontractors
    axios.get(`${API_URL}/vendors/rank-subcontractors/${projectId}`)
      .then(res => setSubcontractors(res.data.rankings));
  }, [projectId]);

  return (
    <Layout>
      <h1>Select Subcontractors for Labor</h1>
      
      {/* Material Coverage Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Labor Coverage</CardTitle>
          <Progress value={laborCoverage} />
          <p>{coveredMaterials} of {totalMaterials} materials have labor assigned</p>
        </CardHeader>
      </Card>

      {/* Materials Needing Labor */}
      <Card>
        <CardHeader>
          <CardTitle>Materials Needing Installation</CardTitle>
        </CardHeader>
        <CardContent>
          {uncoveredMaterials.map(material => (
            <div key={material.id} className="border p-2">
              <p className="font-semibold">{material.description}</p>
              <p className="text-sm">{material.qty} {material.uom}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Available Subcontractors */}
      <div className="grid gap-4">
        {subcontractors.map(sub => (
          <Card
            key={sub.vendorId}
            className={selectedSubs.has(sub.vendorId) ? 'border-primary' : ''}
            onClick={() => toggleSubcontractor(sub.vendorId)}
          >
            <CardHeader>
              <div className="flex justify-between">
                <CardTitle>{sub.vendorName}</CardTitle>
                {sub.competitiveScore >= 70 && (
                  <Badge>RECOMMENDED</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Labor Coverage</p>
                  <Progress value={sub.materialCoverage} />
                  <p className="font-semibold">{sub.materialCoverage.toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estimated Cost</p>
                  <p className="font-semibold">${sub.estimatedLaborCost.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rate</p>
                  <p className="font-semibold">${sub.laborRate}/hr</p>
                  {sub.avgRateVsMarket < 0 && (
                    <p className="text-sm text-green-600">
                      {Math.abs(sub.avgRateVsMarket).toFixed(0)}% below market
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm">Crew Size: {sub.crewSize} workers</p>
                <p className="text-sm">Can install: {sub.materialsWithPricing} of {sub.totalMaterials} materials</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button onClick={createLaborRFQs}>
        Send RFQs to {selectedSubs.size} Subcontractors
      </Button>
    </Layout>
  );
}
```

### 2. Update Project Detail Navigation
```typescript
// Add button after "Send RFQs" in ProjectDetail.tsx
<Button onClick={() => navigate(`/projects/${id}/subcontractor-matching`)}>
  <HardHat className="w-4 h-4 mr-2" />
  Select Subcontractors
</Button>
```

### 3. Update Workflow Status
```typescript
enum ProjectStatus {
  SCOPE_DIAGNOSIS
  BOM_GENERATION
  VENDOR_MATCHING         // Material suppliers
  SUBCONTRACTOR_MATCHING  // NEW: Labor selection
  RFQ_SENT
  QUOTE_COMPARISON
  AWARD_PENDING
  AWARDED
}
```

---

## Database Migration Required

**When ready to deploy:**
```bash
cd /Users/jonathanbodnar/gcinterface
npx prisma migrate dev --name add_labor_pricing_and_subcontractor_capabilities
npx prisma generate
npm run build
```

---

## Summary

### ✅ Backend Complete:
- MaterialRule uses actual labor rates
- Fuzzy matching for labor rules
- Subcontractor ranking service
- Labor coverage API
- VendorLaborPricing model

### 📋 Frontend TODO:
- Create SubcontractorMatching.tsx page
- Add route `/projects/:id/subcontractor-matching`
- Update ProjectDetail with "Select Subcontractors" button
- Add labor coverage tracking to dashboard
- Update project workflow status enum

### 🎯 User Experience:
1. **Import project** → BOM generated
2. **Select suppliers** → Get material quotes
3. **Select subcontractors** → Get labor quotes (NEW)
4. **Compare quotes** → Materials + Labor
5. **Award contracts** → Complete procurement

**Full material + labor procurement in one platform!** 🚀

