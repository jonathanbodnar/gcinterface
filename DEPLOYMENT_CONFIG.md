# 🚀 GC Interface Deployment Configuration

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│ INTERFACE FRONTEND (Railway)                           │
│ athletic-contentment-development.up.railway.app         │
│                                                         │
│ User Interface for estimation & procurement            │
└────────────────────────┬────────────────────────────────┘
                         ↓ HTTP API calls
┌─────────────────────────────────────────────────────────┐
│ INTERFACE BACKEND (Railway)                            │
│ gcinterface-development.up.railway.app                  │
│                                                         │
│ Business logic, quotes, vendors, RFQs                  │
└────────┬───────────────────────────┬────────────────────┘
         ↓                           ↓
┌────────────────────┐    ┌─────────────────────────────┐
│ INTERFACE DATABASE │    │ TAKEOFF API                 │
│ (Railway Postgres) │    │ https://165.22.162.176...   │
│                    │    │                             │
│ Projects, Vendors, │    │ Jobs, Measurements, BOM     │
│ Quotes, RFQs       │    └──────────┬──────────────────┘
└────────────────────┘               ↓
                          ┌──────────────────────────────┐
                          │ TAKEOFF DATABASE             │
                          │ 165.22.162.176:5432          │
                          │                              │
                          │ Raw takeoff data storage     │
                          └──────────────────────────────┘
```

---

## 📋 Environment Variables Configuration

### **1. Interface Frontend** (Railway Service)

**Service:** `athletic-contentment-development`

| Variable | Value | Purpose |
|----------|-------|---------|
| `VITE_API_URL` | `https://gcinterface-development.up.railway.app/api` | Points frontend to interface backend |

**How it's used:**
- All frontend API calls use this base URL
- Auth, projects, vendors, quotes, materials, etc.
- Set in Railway dashboard under frontend service environment variables

---

### **2. Interface Backend** (Railway Service)

**Service:** `gcinterface-development`

| Variable | Value | Purpose |
|----------|-------|---------|
| `DATABASE_URL` | `postgresql://postgres:juuYZdLSolxwRSVmDkINLZskUwMqRSMO@gondola.proxy.rlwy.net:55584/railway` | Interface's own database (projects, vendors, quotes) |
| `TAKEOFF_API_URL` | `https://165.22.162.176.sslip.io/v1` | **NEW** - Connects to takeoff API for job data |
| `JWT_SECRET` | `your-secret-key` | JWT authentication |
| `JWT_EXPIRES_IN` | `7d` | Token expiration |
| `PORT` | `3001` | Backend port |
| `API_PREFIX` | `api` | API route prefix |
| `NODE_ENV` | `production` | Environment mode |

**How it's used:**
- `DATABASE_URL`: Interface's own data (READ/WRITE)
- `TAKEOFF_API_URL`: Fetches completed takeoff jobs (READ ONLY via HTTP)

---

## 🔄 Data Flow

### **When user imports a takeoff job:**

1. **Frontend** calls: `GET /api/projects/available-takeoff-jobs`
2. **Interface Backend** calls: `GET https://165.22.162.176.sslip.io/v1/jobs`
3. **Takeoff API** returns: List of completed jobs
4. **Interface Backend** marks which are already imported
5. **Frontend** displays: Available takeoffs with "Import" button

### **When user clicks "Import":**

1. **Frontend** calls: `POST /api/projects/import`
2. **Interface Backend** calls:
   - `GET https://165.22.162.176.sslip.io/v1/jobs/{id}` - Get job details
   - `GET https://165.22.162.176.sslip.io/v1/jobs/{id}/features` - Get measurements
3. **Interface Backend** creates:
   - New project in interface database
   - Auto-generates BOM from features
   - Links to takeoff job ID
4. **Frontend** displays: New project in "Imported Projects" tab

---

## 🔌 API Endpoints Used

The interface backend expects these endpoints from the takeoff API:

| Endpoint | Method | Purpose | Response |
|----------|--------|---------|----------|
| `/jobs` | GET | List all completed jobs | `[{id, filename, createdAt, status, fileId}]` |
| `/jobs/:id` | GET | Get job details | `{id, filename, createdAt, status, ...}` |
| `/jobs/:id/features` | GET | Get measurements | `[{id, jobId, type, area, length, ...}]` |

**Alternative endpoints supported:**
- `/takeoff/jobs` (if `/jobs` doesn't exist)
- `/takeoff/:id` (if `/jobs/:id` doesn't exist)
- `/materials/:jobId` (legacy endpoint for features)

---

## ✅ Deployment Checklist

### **Step 1: Backend Environment Variables**
- [ ] Set `TAKEOFF_API_URL=https://165.22.162.176.sslip.io/v1` in Railway
- [ ] Verify `DATABASE_URL` is correct (should be auto-set by Railway)
- [ ] Keep other existing env vars (`JWT_SECRET`, etc.)

### **Step 2: Frontend Environment Variables**
- [ ] Set `VITE_API_URL=https://gcinterface-development.up.railway.app/api`
- [ ] Trigger frontend rebuild to pick up new env var

### **Step 3: Test Connection**
- [ ] Check backend logs for: `✅ Takeoff API client initialized`
- [ ] Go to `/projects` → "Available Takeoffs" tab
- [ ] Should see list of jobs from takeoff API
- [ ] Try importing a job

### **Step 4: Verify Data Flow**
- [ ] Import a takeoff job
- [ ] Check project detail page shows BOM items
- [ ] Verify measurements are correct
- [ ] Test vendor matching, quotes, RFQ flow

---

## 🐛 Troubleshooting

### **"Takeoff API not configured"**
**Problem:** `TAKEOFF_API_URL` not set or incorrect

**Solution:**
```bash
# In Railway backend service environment variables
TAKEOFF_API_URL=https://165.22.162.176.sslip.io/v1
```

### **"Failed to fetch takeoff jobs"**
**Problem:** API endpoint doesn't exist or returns different format

**Check:**
1. Is takeoff API running at `165.22.162.176.sslip.io`?
2. Does `/v1/jobs` endpoint exist?
3. Check backend logs for specific error message

**The TakeoffApiService will automatically try alternate endpoints:**
- `/jobs` → `/takeoff/jobs`
- `/jobs/:id` → `/takeoff/:id`
- `/jobs/:id/features` → `/materials/:jobId`

### **"No jobs showing in Available Takeoffs"**
**Problem:** No data or API connection issue

**Debug:**
1. Check Railway backend logs
2. Look for: `🔍 Fetching jobs from takeoff API...`
3. Check response: `✅ Found X jobs from takeoff API`
4. If 0 jobs, verify takeoff API has data

### **Frontend shows old backend URL**
**Problem:** Environment variable not picked up

**Solution:**
1. Verify `VITE_API_URL` is set in Railway
2. Trigger fresh deployment (not just restart)
3. Clear browser cache
4. Check console network tab for API calls

---

## 📊 Monitoring

### **Backend Health Check**
```bash
curl https://gcinterface-development.up.railway.app/api/health
```

### **Takeoff API Connection Test**
The backend automatically attempts to connect to the takeoff API on startup.

**Look for these log messages:**
```
✅ Takeoff API client initialized: https://165.22.162.176.sslip.io/v1
✅ GC Interface database connected
```

### **Available Takeoff Jobs Check**
```bash
curl https://gcinterface-development.up.railway.app/api/projects/available-takeoff-jobs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🔒 Security Notes

- Interface backend never writes to takeoff database
- All takeoff data is READ ONLY via API
- Interface maintains its own database for business logic
- JWT tokens required for all authenticated endpoints
- CORS configured to allow frontend domain only

---

## 🎯 Summary

**What changed:**
- ❌ Removed: Direct database connection to takeoff database
- ✅ Added: HTTP API client for takeoff data
- ✅ Added: Smart endpoint detection with fallbacks
- ✅ Added: Better error handling and logging

**What to set:**
1. Backend: `TAKEOFF_API_URL=https://165.22.162.176.sslip.io/v1`
2. Frontend: `VITE_API_URL=https://gcinterface-development.up.railway.app/api`

**Result:**
- Clean architecture with API boundaries
- Interface imports completed takeoff jobs
- Auto-generates BOM from measurements
- Ready for vendor matching, quotes, RFQs

🚀 **System is ready to deploy!**

