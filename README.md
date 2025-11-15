# GC Interface - Post-Takeoff Estimation & Procurement SaaS

AI-powered estimation and procurement platform that picks up where the takeoff software leaves off.

## Overview

**GC Interface** automates the complete post-takeoff workflow from BOM generation through subcontract award, replacing the traditional estimator role with AI-driven automation.

### What This Does
- **Starts at**: Step 3.3 (after PDF plans are scanned and measurements extracted)
- **Integrates with**: Existing takeoff software (gclegacy) database
- **Automates**: Scope diagnosis → BOM → Vendor matching → RFQ → Quote comparison → Award

### What This Doesn't Do
- ❌ PDF plan scanning (handled by gclegacy takeoff software)
- ❌ Measurement extraction (handled by gclegacy takeoff software)
- ❌ Initial quantity takeoffs (handled by gclegacy takeoff software)

## Architecture

### Two-Database Setup

#### 1. Existing Takeoff Database (READ ONLY)
- **Purpose**: Pull extracted plan data
- **Connection**: `gondola.proxy.rlwy.net`
- **Data**: Files, Jobs, Sheets, Features, Materials from takeoff analysis
- **Access**: Read-only, do NOT modify

#### 2. New GC Interface Database  
- **Purpose**: Store estimates, vendors, RFQs, quotes, subcontracts
- **Connection**: `postgresql://postgres:***@postgres-oph1.railway.internal:5432/railway`
- **Data**: Projects, Estimates, BOM, Vendors, RFQs, Quotes, Subcontracts

## Required Environment Variables

### For Takeoff Database Connection (READ ONLY)

You need to provide the full connection string from gclegacy:

```bash
# From gclegacy dev branch, get the DATABASE_URL value
TAKEOFF_DATABASE_URL="postgresql://[user]:[password]@gondola.proxy.rlwy.net:[port]/[database]"
```

**To find this:**
1. Check gclegacy Railway service environment variables
2. Look for the `DATABASE_URL` connected to gondola.proxy.rlwy.net
3. Copy the full connection string

### All Environment Variables

See `env.example` for complete list. Key variables:

```bash
# Databases
DATABASE_URL="postgresql://postgres:juuYZdLSolxwRSVmDkINLZskUwMqRSMO@postgres-oph1.railway.internal:5432/railway"
TAKEOFF_DATABASE_URL="postgresql://[FROM_GCLEGACY]"

# Authentication  
JWT_SECRET="your-secret"
NEXTAUTH_SECRET="your-nextauth-secret"

# Email (for RFQs)
SMTP_HOST="smtp.gmail.com"
SMTP_USER="your-email"
SMTP_PASSWORD="your-password"

# AI
OPENAI_API_KEY="your-key"

# Storage
WASABI_ACCESS_KEY_ID="your-key"
WASABI_SECRET_ACCESS_KEY="your-secret"
```

## Core Features

### 1. Scope Diagnosis (AI)
- Identify CSI divisions from extracted features
- Map assemblies and materials
- Handle missing specifications
- Verify material schedules

### 2. Auto BOM Generation
- Quantities with alternates
- Confidence scores (80-90% target)
- Vertical measurements (piping, wiring)
- Calculate fittings based on pipe angles

### 3. Vendor Matching
- **Visual interface**: Materials needed (left) + Vendor cards (right)
- **Proximity filtering**: Based on project location
- **Material coverage**: Track remaining materials as vendors selected
- **Trade-based**: Filter by M/E/P specialties
- **Required vendors**: Identify plan-specified vendors

### 4. RFQ Generation
- Auto-email structured quotes
- Scope of work with materials
- Project schedule integration
- Admin-configured templates

### 5. Quote Comparison
- Bid leveling view
- Normalize vendor responses
- Side-by-side comparison
- VE alternatives tracking

### 6. Subcontract Award
- Generate subcontracts for M/E/P
- Email notifications (award/non-award)
- Location-based subcontractor filtering
- Rating system

### 7. Admin Center
- Vendor/subcontractor management (Excel upload)
- Material/labor rules (cost per LF)
- Trade-specific markups
- Email template editor
- Wholesale rate management

## Installation

```bash
# Clone repository
git clone git@github.com:jonathanbodnar/gcinterface.git
cd gcinterface

# Install dependencies
npm install

# Set up environment
cp env.example .env
# Edit .env with your database connections

# Set up database
npx prisma generate
npx prisma db push

# Start development
npm run dev
```

## Tech Stack

- **Backend**: NestJS + Prisma
- **Frontend**: React + TypeScript
- **Databases**: PostgreSQL (2 databases - takeoff + gcinterface)
- **AI**: OpenAI GPT-4 for scope diagnosis
- **Email**: Nodemailer for RFQs
- **Maps**: Google Maps API for proximity
- **Storage**: Wasabi S3-compatible

## Reference Materials

The `reference/` folder contains example bid proposals and templates from real projects:
- Starbucks Material Breakdown
- Plumbing/Mechanical/Electrical Bid Proposals
- Bid templates and notes
- Use these to match output format expectations

## Development

### Database Setup

Two Prisma clients for two databases:
```typescript
// GC Interface database (read/write)
import { PrismaClient } from '@prisma/client';

// Takeoff database (read-only)  
import { PrismaClient as TakeoffPrismaClient } from './generated/takeoff-client';
```

### Key Workflows

1. **Import takeoff data** from gclegacy database
2. **Generate BOM** with AI scope diagnosis
3. **Match vendors** based on trades and proximity
4. **Send RFQs** via email
5. **Compare quotes** in bid leveling view
6. **Award subcontracts** with notifications

## Repository

- **GitHub**: git@github.com:jonathanbodnar/gcinterface.git
- **Reference**: git@github.com:jonathanbodnar/gclegacy.git (do not modify)

## License

Copyright (c) 2025 GC Legacy Construction. All rights reserved.


