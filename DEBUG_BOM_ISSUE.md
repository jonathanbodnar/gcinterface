# 🐛 Debugging BOM Generation Issue

## Problem
Project "25017 Melissa TX CDs SS-min (2)" shows:
- 0 BOM Items
- $0 Estimated Cost
- No materials generated from takeoff

## Possible Causes

### 1. Features Don't Exist in Takeoff Database
**Check if features exist:**
```sql
SELECT COUNT(*) FROM "Feature" WHERE "jobId" = 'the-job-id-here';
SELECT type, COUNT(*) FROM "Feature" WHERE "jobId" = 'the-job-id-here' GROUP BY type;
```

### 2. BOM Generation Failed Silently
**Check backend logs during import:**
- Look for "🔧 Auto-generating BOM..."
- Look for "✅ BOM generated: X items"
- Look for "⚠️ BOM generation failed"

### 3. Wrong Database Connection
**Verify TAKEOFF_DATABASE_URL is set:**
- Should connect to: `postgresql://plantakeoff:password@165.22.162.176:5432/plantakeoff`
- Check if `TakeoffPrismaService` connected successfully

### 4. Feature Table Case Sensitivity
**The query uses:** `SELECT * FROM "Feature"`
**But table might be:** `features` or `Features`

Check actual table name:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name ILIKE '%feature%';
```

---

## PDF Viewing Issue

### Problem
Plan viewer shows hardcoded demo PDF instead of actual project PDF

### Root Cause
`frontend/src/pages/PlanViewer.tsx` line 37:
```typescript
const pdfUrl = 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf';
```

### Solution Needed
1. Add `fileUrl` or `s3Url` to the `files` table query in `projects.service.ts`
2. Return PDF URL with project data
3. Use actual PDF URL in plan viewer

---

## Quick Debugging Steps

### Step 1: Check if job was imported correctly
```bash
# Backend logs should show:
✅ Imported takeoff job XXXXX as project YYYYY
📐 Total SF: ZZZZ
```

### Step 2: Check if BOM generation was attempted
```bash
# Look for:
🔧 Auto-generating BOM for project YYYYY...
```

### Step 3: Check if features were found
```bash
# If no features:
⚠️ Could not calculate total SF: [error message]
```

### Step 4: Manually trigger BOM generation
Use the "Regenerate BOM" button on the project detail page to try again.

---

## Files to Check
1. `/src/modules/projects/projects.service.ts` - Import logic
2. `/src/modules/bom/bom-generator.service.ts` - BOM generation
3. `/src/common/prisma/prisma.service.ts` - Database connection

## Next Actions
1. Get the actual job ID for this project from the interface database
2. Query the takeoff database to see if features exist
3. Check the table name (Feature vs features)
4. Add PDF URL retrieval logic
5. Test manual BOM regeneration

