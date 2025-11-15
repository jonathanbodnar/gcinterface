# Test Accounts

Quick reference for test accounts created by the seed script.

## How to Seed Test Accounts

Run the seed script to create test accounts in your database:

```bash
npm run db:seed
```

Or:

```bash
npm run seed
```

## Test Accounts

### 👤 Admin Account
- **Email:** `admin@test.com`
- **Password:** `admin123`
- **Role:** `ADMIN`
- **Access:** Full system access, can manage all settings, users, and configurations

### 👤 Estimator Account
- **Email:** `user@test.com`
- **Password:** `user123`
- **Role:** `ESTIMATOR`
- **Access:** Can create estimates, view projects, and manage BOMs

### 👤 Preconstruction Manager Account
- **Email:** `pm@test.com`
- **Password:** `pm123`
- **Role:** `PRECONSTRUCTION_MANAGER`
- **Access:** Can manage projects, approve estimates, and oversee procurement

## Quick Login

The login page includes quick login buttons for each test account. Simply click the button to automatically log in with that account's credentials.

## Notes

- All test accounts use simple passwords for development/testing purposes
- In production, these accounts should be removed or have their passwords changed
- The seed script uses `upsert`, so running it multiple times is safe (won't create duplicates)
