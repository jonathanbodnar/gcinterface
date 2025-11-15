# GC Interface - Post-Takeoff Estimation & Procurement SaaS

## Overview
Picks up where the takeoff software leaves off (after Step 3.3), automating the entire estimation and procurement workflow from BOM generation through subcontract award.

## Database Architecture

### Existing Takeoff Database (READ ONLY)
- **URL**: `gondola.proxy.rlwy.net`
- **Purpose**: Pull extracted plan data (rooms, walls, pipes, measurements)
- **Tables**: File, Job, Sheet, Feature, Material
- **DO NOT MODIFY**: Read-only access to takeoff results

### New GC Interface Database
- **URL**: `postgresql://postgres:juuYZdLSolxwRSVmDkINLZskUwMqRSMO@postgres-oph1.railway.internal:5432/railway`
- **Purpose**: Store estimates, vendors, RFQs, quotes, subcontracts
- **New Tables**: Project, Estimate, BOM, Vendor, RFQ, Quote, Subcontract, etc.

## Environment Variables

```bash
# Existing Takeoff Database (READ ONLY)
TAKEOFF_DATABASE_URL=postgresql://user:pass@gondola.proxy.rlwy.net:5432/dbname

# New GC Interface Database  
DATABASE_URL=postgresql://postgres:juuYZdLSolxwRSVmDkINLZskUwMqRSMO@postgres-oph1.railway.internal:5432/railway

# Authentication
JWT_SECRET=your-secret-key
NEXTAUTH_URL=your-app-url
NEXTAUTH_SECRET=your-nextauth-secret

# Email (for RFQs and awards)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASSWORD=your-password

# AI/OpenAI
OPENAI_API_KEY=your-openai-key

# File Storage
WASABI_ACCESS_KEY_ID=your-key
WASABI_SECRET_ACCESS_KEY=your-secret
WASABI_BUCKET_NAME=your-bucket
WASABI_ENDPOINT=https://s3.wasabisys.com
```

## Core Modules (Post-Takeoff - Step 3.3+)

### 1. Scope Diagnosis (AI)
- Identify CSI divisions from extracted features
- Map to assemblies and materials
- Handle missing specifications from plans
- Verify material schedules

### 2. Auto BOM Generation
- Quantities with alternates
- Confidence scores (80-90% target)
- Vertical measurements for piping/wiring
- Fittings based on pipe angles

### 3. Vendor Matching Interface
- Vendor cards with stats and details
- Proximity filtering based on project location
- Material coverage tracking (show remaining materials needed)
- Trade-based vendor filtering
- Required vendor identification from plans

### 4. Labor & Equipment Modeling
- Admin-configurable rules (cost per LF, etc.)
- Trade-specific markups (M, E, P)
- Productivity libraries

### 5. RFQ Generation & Emailing
- Auto-send structured quote requests
- Scope of work with materials
- Project schedule (Gantt chart upload)
- Email templates (admin-configured)

### 6. Quote Parsing & Comparison
- Ingest vendor email responses
- Normalize data for bid leveling
- Compare quotes side-by-side
- Handle vendor VE alternatives

### 7. Award & Subcontract
- Generate subcontracts for M/E/P
- Send award/non-award emails
- Subcontractor interface similar to vendor
- Location-based filtering with ratings

### 8. Admin Center
- Vendor/subcontractor management (Excel upload)
- Material/labor rules configuration
- Markup settings per trade
- Email template editor
- Wholesale rate scanning (AI pre-fill)

## Key Features

### Vendor/Subcontractor Selection
- **Left panel**: List of materials needed
- **Right panel**: Vendor cards (clickable)
- **As you select vendors**: Materials are removed from left panel
- **Visual feedback**: See remaining materials that need suppliers

### Bid Proposal Templates
Based on your Starbucks examples:
- Trade-specific breakdowns (Plumbing, Mechanical, Electrical)
- Unit-based quantities with waste factors
- Manhours per SF/LF
- Summary rollups
- Vendor quotations integrated

## Tech Stack

- **Backend**: NestJS + Prisma (matching gclegacy pattern)
- **Frontend**: React + TypeScript (clean white/grey interface)
- **Databases**: 
  - Takeoff DB (read-only)
  - GC Interface DB (read/write)
- **AI**: OpenAI for scope diagnosis, cost intelligence
- **Email**: SMTP integration for RFQs and awards
- **Storage**: Wasabi for documents/schedules

## Repository
- **GitHub**: git@github.com:jonathanbodnar/gcinterface.git
- **Do NOT modify**: git@github.com:jonathanbodnar/gclegacy.git (reference only)


