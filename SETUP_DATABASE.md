# Database Setup - Quick Fix

The 500 error is because **the database tables don't exist yet**. You need to run Prisma migrations on Railway.

## Quick Solution (2 minutes)

### Option 1: Railway CLI (Easiest)

1. **Login to Railway:**
   ```bash
   railway login
   ```

2. **Link to your project:**
   ```bash
   railway link
   ```

3. **Run migrations:**
   ```bash
   railway run npx prisma migrate deploy
   ```

That's it! Then try registering again.

---

### Option 2: Railway Dashboard

1. Go to your Railway project
2. Click on your **backend service**
3. Go to **Settings** → **Deploy**
4. Add a **Deploy Command**:
   ```
   npx prisma migrate deploy && npm run start
   ```

5. Redeploy the service

---

### Option 3: Manual SQL (If migrations fail)

If you have access to Railway's database, you can run this SQL directly:

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'ESTIMATOR',
  "password" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
```

---

## After Setup

Once the tables exist, you can:
1. Use the **register endpoint** to create accounts
2. Or use the **seed endpoint** to create all 3 test accounts at once

**Test accounts:**
- Admin: `admin@test.com` / `admin123`
- Estimator: `user@test.com` / `user123`
- PM: `pm@test.com` / `pm123`
