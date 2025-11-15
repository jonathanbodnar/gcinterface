# Frontend Environment Variables

The frontend uses **Vite**, which requires environment variables to be prefixed with `VITE_` to be exposed to the client.

## Required Variables

### `VITE_API_URL`
**Description:** The backend API URL that the frontend will connect to.

**Local Development:**
```bash
VITE_API_URL=http://localhost:3001/api
```

**Production (Railway):**
```bash
VITE_API_URL=https://your-backend-service.railway.app/api
```

**Example:**
If your Railway backend is deployed at `gcinterface-production.up.railway.app`, set:
```bash
VITE_API_URL=https://gcinterface-production.up.railway.app/api
```

## Setup Instructions

1. **Create `.env` file** in the `frontend/` directory:
   ```bash
   cd frontend
   touch .env
   ```

2. **Add your environment variable:**
   ```bash
   VITE_API_URL=http://localhost:3001/api
   ```

3. **For Production Deployment:**
   - **Vercel/Netlify:** Add `VITE_API_URL` in the dashboard environment variables
   - **Railway:** Add `VITE_API_URL` in the service environment variables
   - **Docker:** Pass via `-e VITE_API_URL=...` or docker-compose.yml

## Important Notes

- ⚠️ **Vite prefix required:** Only variables starting with `VITE_` are exposed to the browser
- 🔒 **Public variables:** All `VITE_*` variables are bundled into the client code (don't put secrets here!)
- 🔄 **Restart needed:** After changing `.env`, restart the dev server (`npm run dev`)

## Current Usage

The frontend uses `VITE_API_URL` in:
- `src/contexts/AuthContext.tsx` - Authentication API calls
- `src/pages/Projects.tsx` - Project management API calls
- `src/pages/VendorMatching.tsx` - Vendor matching API calls

## Default Fallback

If `VITE_API_URL` is not set, the frontend defaults to:
```
http://localhost:3001/api
```
