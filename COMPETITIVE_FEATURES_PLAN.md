# 🚀 GC Interface - Competitive Features Roadmap

## Competing with Procure & Similar Platforms

### Selected Strategic Features for Development

---

## 📋 **Priority Features Selected**

1. **Interactive Plan Viewer with Material Overlay** ⭐⭐⭐ (HIGHEST PRIORITY)
2. **Real-Time Collaboration** ⭐⭐
3. **Schedule Integration** ⭐⭐  
4. **Advanced Reporting Dashboard** ⭐⭐⭐
5. **Value Engineering Tracker** ⭐⭐

---

## 🎨 **FEATURE #1: Interactive Plan Viewer** (PRIMARY DIFFERENTIATOR)

### Vision
Display project plans (PDFs) with an interactive overlay showing exactly where each material is used. As users navigate through pages, the materials panel updates to show only items on that page. Hovering over materials highlights their location on the PDF.

### User Experience Flow

```
┌──────────────────────────────────────────────────────────────────┐
│  Project: Mock Commercial Building          Page 3 of 15  [◀ ▶] │
├────────────────────────────────┬─────────────────────────────────┤
│  PDF VIEWER (60%)              │  MATERIALS PANEL (40%)          │
│  ─────────────────────────     │  ────────────────────────────   │
│                                 │                                 │
│  ┌──────────────────────────┐  │  📄 Page 3: Plumbing Plan       │
│  │                          │  │                                 │
│  │   [Plumbing Floor Plan]  │  │  🔵 Plumbing (8 items)         │
│  │                          │  │  ├─ 3" PVC Pipe - 180 LF       │
│  │  *Pipe runs highlighted* │  │  │  └─ Hover: Shows blue line  │
│  │   in blue when hovering  │  │  ├─ 4" PVC Pipe - 120 LF       │
│  │                          │  │  ├─ Water Closet × 4           │
│  │  Room labels, fixtures   │  │  │  └─ Hover: Shows fixtures   │
│  │  dimensions visible      │  │  └─ Lavatory × 4               │
│  │                          │  │                                 │
│  └──────────────────────────┘  │  🟡 Architectural (2 items)    │
│                                 │  ├─ Floor Drain × 3            │
│  [🔍 Zoom] [✋ Pan]             │  └─ Access Panel × 2           │
│  [📏 Measure] [📐 Area]         │                                 │
│  [🎨 Toggle Trades]             │  [🔍 Search materials]         │
│                                 │  [Filter: All Trades ▼]        │
│  Scale: 1/4" = 1'-0"            │  [☑ Show on plan]              │
└────────────────────────────────┴─────────────────────────────────┘
```

### Core Components

#### A. PDF Viewer
- **Library**: PDF.js (proven, used by Mozilla Firefox)
- **Zoom**: 25%, 50%, 75%, 100%, 150%, 200%, 400%
- **Pan**: Click and drag or scroll
- **Navigation**: Page forward/back, jump to page
- **Fit modes**: Fit width, fit page, actual size

#### B. Materials Panel (Right Side)
**Per-Page Filtering:**
- Shows ONLY materials extracted from current page
- Updates automatically when page changes
- Grouped by trade (M/E/P/A)
- Search within page materials
- Toggle visibility per trade

**Material List Items:**
```
☑ VCT Flooring
   2,500 SF | 90% confidence
   [Highlight on plan]
```

#### C. Overlay & Highlighting System
**Visual Layers:**
- Base: PDF page
- Layer 1: Feature outlines (from takeoff)
- Layer 2: Material highlights (on hover)
- Layer 3: Measurements (user-created)

**Color Coding:**
- 🔴 Mechanical (M)
- 🔵 Plumbing (P)
- 🟢 Electrical (E)
- 🟡 Architectural (A)

**Highlight Behaviors:**
- **Hover material in list** → Highlight ALL instances on PDF (30% opacity fill, 100% stroke)
- **Click material** → Zoom to first instance
- **Hover on PDF** → Show tooltip with material name
- **Click on PDF area** → Select related material in list

#### D. Basic Measurement Tools

**Tools Available:**
1. **Length Tool** 📏
   - Click start, click end
   - Shows: "45.5 LF"
   - Optional: Add to BOM

2. **Area Tool** 📐
   - Click polygon points
   - Double-click to close
   - Shows: "2,500 SF"
   - Add as note or BOM item

3. **Count Tool** 🔢
   - Click items to count
   - Shows running count
   - Useful for fixtures, openings

4. **Scale Calibration** ⚙️
   - User selects known dimension
   - Enters actual length
   - System calculates scale
   - Applied to all measurements

**Toolbar:**
```
[📏 Length] [📐 Area] [🔢 Count] [⚙️ Scale] [🎨 Layers] [💾 Save]
```

### Technical Architecture

#### Database Schema
```prisma
model PlanPage {
  id          String @id @default(cuid())
  projectId   String
  pageNumber  Int
  fileName    String
  pdfUrl      String // S3 URL to original PDF
  thumbnail   String? // S3 URL to page thumbnail
  
  // Metadata
  sheetName   String? // "A1.1 - Floor Plan"
  scale       String? // "1/4\" = 1'-0\""
  discipline  String? // A, P, M, E
  
  // Extracted from takeoff (denormalized for performance)
  materialsOnPage Json[] // Array of material summaries
  featuresOnPage  Json[] // Array of feature summaries with locations
  
  createdAt   DateTime @default(now())
  
  project     Project @relation(fields: [projectId], references: [id])
  
  @@unique([projectId, pageNumber])
  @@map("plan_pages")
}

model FeatureLocation {
  id          String @id @default(cuid())
  projectId   String
  featureId   String // Links to gclegacy Feature
  pageNumber  Int
  
  // Geometry on PDF (% based for responsiveness)
  coordinates Json // { x: 0.25, y: 0.30, width: 0.15, height: 0.10 } or polygon points
  geometryType String // 'rectangle', 'polygon', 'line', 'point'
  
  // Links
  materialId  String? // Links to Material in materials DB
  bomItemId   String? // Links to BOM item
  
  // Visual
  color       String? // Hex color for this feature
  label       String? // Display label
  
  createdAt   DateTime @default(now())
  
  @@index([projectId, pageNumber])
  @@map("feature_locations")
}
```

#### API Endpoints
```typescript
// Get plan pages for project
GET /api/projects/:id/plan-pages
Response: { 
  pages: [{
    pageNumber, fileName, pdfUrl, thumbnail,
    materialsCount, featuresCount, discipline
  }]
}

// Get materials for specific page with locations
GET /api/projects/:id/plan-pages/:pageNumber
Response: {
  page: { pageNumber, pdfUrl, scale, sheetName },
  materials: [{ id, description, qty, uom, locations: [...] }],
  features: [{ id, type, geometry, materialId }]
}

// Upload plan PDF for project
POST /api/projects/:id/upload-plan
Body: FormData with PDF file
Response: { pages: 15, processed: true, pdfUrl }

// Get feature locations for highlighting
GET /api/projects/:id/feature-locations?pageNumber=3
Response: { locations: [{ featureId, coordinates, materialId, geometryType }] }
```

#### Frontend Components

```
frontend/src/components/plan-viewer/
  ├── PlanViewer.tsx           // Main container component
  ├── PDFRenderer.tsx          // PDF.js wrapper
  ├── SVGOverlay.tsx           // Highlight layer
  ├── MaterialsPanel.tsx       // Right sidebar
  │   ├── MaterialsList.tsx    // Per-page material list
  │   ├── MaterialItem.tsx     // Individual material with hover
  │   └── TradeFilter.tsx      // Filter by M/E/P/A
  ├── MeasurementTools.tsx     // Toolbar with tools
  │   ├── LengthTool.tsx       // Line measurement
  │   ├── AreaTool.tsx         // Polygon measurement
  │   └── CountTool.tsx        // Click-to-count
  ├── PageNavigator.tsx        // Page thumbnails
  ├── ZoomControls.tsx         // Zoom buttons
  └── types.ts                 // TypeScript interfaces
```

### Data Flow

```
1. User imports job from gclegacy
   ↓
2. gcinterface fetches takeoff data
   GET /v1/takeoff/{jobId} from gclegacy
   Response includes: rooms, pipes, fixtures WITH geometry
   ↓
3. Process & store plan pages
   - Extract page count from job
   - Get PDF URL from gclegacy
   - Parse features per page
   - Store in PlanPage table
   ↓
4. Map features to PDF coordinates
   - Feature.geom contains coordinates
   - Convert to PDF page % (0-1 scale)
   - Store in FeatureLocation table
   ↓
5. Display in Plan Viewer
   - Load PDF via PDF.js
   - Render SVG overlay
   - Filter materials by page
   - Enable hover interactions
```

### Integration with gclegacy

**Required from gclegacy:**
- PDF URL for each job
- Feature geometry (coordinates on page)
- Page number for each feature
- Sheet names/disciplines

**If gclegacy has coordinates:**
```json
{
  "feature": {
    "type": "PIPE",
    "geometry": {
      "page": 3,
      "coordinates": [[x1,y1], [x2,y2]], // Line
      "bounds": { x, y, width, height }   // Bounding box
    }
  }
}
```

**If gclegacy doesn't have coordinates:**
- Use GPT-4 Vision to detect locations
- One-time processing per import
- Store results in gcinterface

### Implementation Phases

**Phase 1: Basic PDF Viewer** (Week 1 - 5 days)
- [ ] Install PDF.js and react-pdf
- [ ] Create PlanViewer page route
- [ ] Display PDF with zoom/pan
- [ ] Page navigation
- [ ] Mobile responsive

**Phase 2: Materials Panel** (Week 2 - 3 days)
- [ ] Right sidebar with materials list
- [ ] Per-page filtering
- [ ] Group by trade
- [ ] Search functionality

**Phase 3: Overlay System** (Week 2-3 - 5 days)
- [ ] SVG overlay layer
- [ ] Basic rectangle highlighting
- [ ] Hover interactions (material → PDF)
- [ ] Color coding by trade
- [ ] Click to zoom

**Phase 4: Advanced Interactions** (Week 3 - 4 days)
- [ ] Reverse hover (PDF → material list)
- [ ] Polygon/line highlighting
- [ ] Toggle layers on/off
- [ ] Show/hide by trade

**Phase 5: Measurement Tools** (Week 4 - 5 days)
- [ ] Length measurement tool
- [ ] Area measurement tool
- [ ] Count tool
- [ ] Scale calibration
- [ ] Save measurements

---

## 🤝 **FEATURE #2: Real-Time Collaboration**

### Priority: ⭐⭐ MEDIUM

### Features

**1. Presence Awareness**
- See who's online
- See who's viewing project
- See who's editing BOM

**2. Live Updates**
- BOM changes broadcast to all users
- Quote uploads notify team
- RFQ sent notifications

**3. Comments System**
- Comment on BOM items
- @mention teammates
- Resolve threads
- Activity feed

### Implementation
```typescript
// WebSocket integration
import { io } from 'socket.io-client';

// Events
'project:join' - User opens project
'project:leave' - User closes project
'bom:updated' - BOM item changed
'quote:received' - New quote uploaded
'comment:added' - New comment

// Redis for presence
SET user:{userId}:online {projectId}
EXPIRE user:{userId}:online 30
```

---

## 📅 **FEATURE #3: Schedule Integration**

### Priority: ⭐⭐ MEDIUM

### Features

**1. Gantt Chart Viewer**
- Upload PDF/Excel schedule
- Display timeline
- Show milestones
- Critical path

**2. Material Lead Time Integration**
- Track vendor lead times
- Alert if material delayed
- Impact on schedule

**3. Vendor Schedule Coordination**
- Share schedule with vendors
- Track vendor mobilization
- Coordinate between trades

### Implementation
- **Library**: dhtmlx-gantt or Frappe Gantt
- **Storage**: project.schedule JSON field
- **PDF Upload**: Parse PDF for milestones

---

## 📊 **FEATURE #4: Advanced Reporting Dashboard**

### Priority: ⭐⭐⭐ HIGH

### Dashboards

#### Executive Dashboard
**Metrics:**
- Total pipeline value
- Win rate % (awarded / total RFQs)
- Average margin per project
- Active projects count
- YTD savings from VE
- Quote response rate

**Charts:**
- Pipeline trend line (last 12 months)
- Win rate by trade (bar chart)
- Cost variance by project (waterfall)
- Top 10 vendors by volume

#### Project Dashboard
**Metrics:**
- Budget: Estimated vs Actual
- Variance: $ and %
- VE savings captured
- Quote spread (high vs low)
- Days from import to award

**Charts:**
- Cost breakdown pie (by trade)
- Budget vs actual waterfall
- Quote comparison bars
- Timeline gantt

#### Vendor Analytics
**Metrics:**
- Response rate per vendor
- Average turnaround time
- Win rate per vendor
- Price competitiveness index
- On-time delivery %

**Charts:**
- Vendor response times (scatter)
- Quote-to-award funnel
- Price trends by vendor
- Performance scores radar

### Implementation
```typescript
// New routes
/reports/executive
/reports/projects
/reports/vendors

// Charts library
import { LineChart, BarChart, PieChart } from 'recharts';

// API endpoints
GET /api/reports/executive
GET /api/reports/project/:id
GET /api/reports/vendor-analytics?dateRange=last30days
```

---

## 💎 **FEATURE #5: Value Engineering Tracker**

### Priority: ⭐⭐ MEDIUM-HIGH

### Features

**1. VE Proposal Management**
- Vendors submit VE alternatives
- Side-by-side comparison table
- Cost savings calculation
- Schedule impact notes
- Quality assessment

**2. VE Library**
- Database of past VE decisions
- Search by material type
- Filter by: Approved/Rejected/Project type
- Reuse successful alternates

**3. Approval Workflow**
```
Vendor submits VE
  ↓
Estimator reviews → Approve/Reject/Request Info
  ↓ (if approved)
PM reviews → Approve/Reject
  ↓ (if approved)
Owner/Architect reviews → Final approval
  ↓
VE applied to project
```

### UI Components

**VE Proposal Card:**
```
┌────────────────────────────────────────────────┐
│ VE Proposal #12 - Ferguson Plumbing            │
│ ─────────────────────────────────────────────  │
│                                                 │
│ Original: Kohler K-3989 Water Closet           │
│ Cost: $485 ea × 4 = $1,940                     │
│                                                 │
│ Alternative: American Standard Cadet           │
│ Cost: $395 ea × 4 = $1,580                     │
│                                                 │
│ 💰 Savings: $360 (18.6%)                       │
│ 📅 Schedule: No impact                         │
│ ⭐ Quality: Equivalent per spec                │
│ ⚠️ Risk: Low                                   │
│                                                 │
│ [✅ Approve] [❌ Reject] [💬 Request Info]     │
└────────────────────────────────────────────────┘
```

### Database Schema
```prisma
model VEProposal {
  id                  String @id @default(cuid())
  projectId           String
  vendorId            String
  quoteItemId         String?
  
  // Original
  originalMaterial    String
  originalCost        Float
  originalManufacturer String?
  
  // Alternative
  alternativeMaterial String
  alternativeCost     Float
  alternativeManufacturer String?
  
  // Analysis
  costSavings         Float
  savingsPercent      Float
  scheduleImpact      String? // "None", "+2 days", "-1 week"
  qualityAssessment   String? // "Equivalent", "Upgrade", "Downgrade"
  riskLevel           String? // "Low", "Medium", "High"
  
  // Workflow
  status              String // "Pending", "Approved", "Rejected"
  submittedBy         String? // Vendor user
  reviewedBy          String? // GC user
  approvedBy          String? // Final approver
  approvedAt          DateTime?
  rejectionReason     String?
  
  notes               String?
  attachments         String[] // URLs to spec sheets, photos
  
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  project             Project @relation(fields: [projectId], references: [id])
  vendor              Vendor @relation(fields: [vendorId], references: [id])
  
  @@map("ve_proposals")
}
```

---

## 🎯 **Implementation Priority Order**

### Month 1: Plan Viewer (Flagship Feature)
**Goal:** Launch interactive plan viewer as main differentiator

**Week 1:**
- Install PDF.js, create basic viewer
- Add zoom/pan controls
- Page navigation

**Week 2:**
- Materials panel with per-page filtering
- Basic hover highlighting (rectangles)

**Week 3:**
- SVG overlay system
- Color coding by trade
- Click-to-zoom

**Week 4:**
- Measurement tools
- Polish and mobile responsive
- Performance optimization

**Deliverable:** `/projects/:id/plans` route with full functionality

### Month 2: Analytics & Collaboration
**Goal:** Add business intelligence and team features

**Week 1-2:** Reporting Dashboard
- Executive dashboard
- Project reports
- Vendor analytics

**Week 3-4:** Real-Time Features
- WebSocket integration
- Presence awareness
- Live updates

**Deliverable:** `/reports` section + real-time updates

### Month 3: VE & Schedule
**Goal:** Complete advanced features

**Week 1-2:** VE Tracker
- Proposal submission
- Approval workflow
- VE library

**Week 3-4:** Schedule Integration
- Gantt chart upload/display
- Material lead times
- Vendor coordination

**Deliverable:** Complete feature set

---

## 💡 **Competitive Advantages vs Procure**

### What Makes GC Interface Unique

1. **Visual Plan Integration** ⭐⭐⭐
   - See materials ON the plans
   - Hover to highlight
   - Per-page filtering
   - **Procure likely doesn't have this**

2. **Intelligent Separation**
   - Suppliers vs Contractors
   - Different RFQ templates
   - Different workflows
   - **More sophisticated than competitors**

3. **Materials Database**
   - Learns from every project
   - Auto-populates
   - Deduplicates across projects
   - **Builds value over time**

4. **Complete Automation**
   - Auto-BOM generation
   - Auto-RFQ creation
   - Auto-quote parsing
   - **Less manual work**

5. **Modern Tech Stack**
   - React + TypeScript
   - Real-time updates
   - Mobile responsive
   - **Better UX**

---

## 📊 **Success Metrics**

### User Engagement
- Time spent in plan viewer
- Materials verified per hour
- Measurement tool usage

### Business Impact
- Time from import to award (target: < 2 days)
- Quote response rate (target: 85%+)
- Cost accuracy (target: ±3%)
- VE savings (target: 5-10% per project)

### System Performance
- Plan page load time (target: < 2 seconds)
- Hover response time (target: < 100ms)
- Concurrent users supported (target: 50+)

---

## 🚀 **Getting Started**

### Immediate Next Steps

1. **Create Plan Viewer structure** (Today)
   - New route: `/projects/:id/plans`
   - Basic PDF viewer component
   - Materials panel skeleton

2. **Test with mock project** (This week)
   - Use existing mock project PDF
   - Display materials from BOM
   - Basic highlighting

3. **Iterate based on feedback** (Ongoing)
   - User testing
   - Performance tuning
   - Feature refinement

### Resources Needed

**Frontend:**
- PDF.js / react-pdf integration
- SVG overlay system
- Recharts for analytics

**Backend:**
- PDF storage (S3/Railway)
- Feature location processing
- Analytics aggregation queries

**Design:**
- Plan viewer UI mockups
- Measurement tool icons
- Color scheme for trades

---

## ✨ **The Vision**

**GC Interface becomes the platform where:**
- Estimators can SEE what they're pricing
- Every material is visually verified against plans
- Teams collaborate in real-time
- Data intelligence guides decisions
- Vendors compete for the best price
- VE opportunities are never missed

**Goal:** Best-in-class post-takeoff estimation platform with unique visual verification capabilities that competitors can't match.

---

**Ready to start building the Plan Viewer!** 🚀

