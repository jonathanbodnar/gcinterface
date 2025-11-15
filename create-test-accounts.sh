#!/bin/bash

# Simple script to create test accounts via the API
# Replace YOUR_RAILWAY_URL with your actual Railway app URL

RAILWAY_URL="${1:-http://localhost:3001}"

echo "Creating test accounts..."
echo ""

# Create Admin Account
echo "Creating Admin account..."
curl -X POST "${RAILWAY_URL}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "admin123",
    "name": "Admin User",
    "role": "ADMIN"
  }'
echo ""
echo ""

# Create Estimator Account
echo "Creating Estimator account..."
curl -X POST "${RAILWAY_URL}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@test.com",
    "password": "user123",
    "name": "Test Estimator",
    "role": "ESTIMATOR"
  }'
echo ""
echo ""

# Create Preconstruction Manager Account
echo "Creating Preconstruction Manager account..."
curl -X POST "${RAILWAY_URL}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "pm@test.com",
    "password": "pm123",
    "name": "Preconstruction Manager",
    "role": "PRECONSTRUCTION_MANAGER"
  }'
echo ""
echo ""

echo "✅ Done! Test accounts created."
echo ""
echo "You can now log in with:"
echo "  - Admin: admin@test.com / admin123"
echo "  - Estimator: user@test.com / user123"
echo "  - PM: pm@test.com / pm123"
