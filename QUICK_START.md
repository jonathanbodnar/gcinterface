# Quick Start - Create Test Accounts

## The Easiest Way: Use the Register Endpoint

Your Railway app URL is probably something like: `https://gcinterface-development.up.railway.app`

### Step 1: Get Your Railway App URL

Go to your Railway dashboard and copy your app's URL (it should look like `https://something.up.railway.app`)

### Step 2: Create the Accounts

Open your browser and go to this URL (replace with your actual Railway URL):

```
https://YOUR-RAILWAY-URL.railway.app/api/docs
```

Then scroll down to the **"Authentication"** section and find the **"Register new user"** endpoint.

Click "Try it out" and create these 3 accounts one by one:

#### Account 1: Admin
```json
{
  "email": "admin@test.com",
  "password": "admin123",
  "name": "Admin User",
  "role": "ADMIN"
}
```

#### Account 2: Estimator
```json
{
  "email": "user@test.com",
  "password": "user123",
  "name": "Test Estimator",
  "role": "ESTIMATOR"
}
```

#### Account 3: Preconstruction Manager
```json
{
  "email": "pm@test.com",
  "password": "pm123",
  "name": "Preconstruction Manager",
  "role": "PRECONSTRUCTION_MANAGER"
}
```

### Step 3: Log In!

Go to your login page and use any of these accounts:
- **Admin:** `admin@test.com` / `admin123`
- **Estimator:** `user@test.com` / `user123`
- **PM:** `pm@test.com` / `pm123`

---

## Alternative: Use the Script

If you have the Railway URL, you can also run:

```bash
./create-test-accounts.sh https://your-railway-url.railway.app
```

---

## That's It!

Once you create the accounts, you can log in immediately. No database seeding needed!
