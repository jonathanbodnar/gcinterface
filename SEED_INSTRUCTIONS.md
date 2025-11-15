# How to Seed Test Accounts in Railway

## Option 1: Using Railway CLI (Recommended)

1. **Login to Railway:**
   ```bash
   railway login
   ```

2. **Link to your project (if not already linked):**
   ```bash
   railway link
   ```

3. **Run the seed script:**
   ```bash
   railway run npm run db:seed
   ```

## Option 2: Using DATABASE_URL directly

1. **Get your DATABASE_URL from Railway:**
   - Go to your Railway project dashboard
   - Click on your PostgreSQL service
   - Copy the `DATABASE_URL` from the Variables tab

2. **Run the seed script with the connection string:**
   ```bash
   DATABASE_URL="postgresql://user:password@host:port/database" npm run db:seed
   ```

## Option 3: Create .env file

1. **Create a `.env` file in the project root:**
   ```bash
   DATABASE_URL="your-railway-postgresql-connection-string"
   ```

2. **Run the seed script:**
   ```bash
   npm run db:seed
   ```

## Test Accounts Created

After running the seed, these accounts will be available:

- **Admin:** `admin@test.com` / `admin123`
- **Estimator:** `user@test.com` / `user123`
- **Preconstruction Manager:** `pm@test.com` / `pm123`

## Verify

You can verify the accounts were created by:
- Trying to log in with one of the test accounts
- Or running: `railway run npx prisma studio` to view the database
