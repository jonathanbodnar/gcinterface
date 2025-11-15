#!/bin/bash

# Seed Database Script for Railway PostgreSQL
# This script will seed the database with test accounts

echo "🌱 Seeding GC Interface Database..."
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL environment variable is not set"
  echo ""
  echo "Please either:"
  echo "  1. Run: railway login"
  echo "  2. Then run: railway run npm run db:seed"
  echo ""
  echo "OR"
  echo ""
  echo "  1. Get your DATABASE_URL from Railway dashboard"
  echo "  2. Run: DATABASE_URL='your-connection-string' npm run db:seed"
  exit 1
fi

echo "✅ DATABASE_URL is set"
echo "📦 Running seed script..."
echo ""

npm run db:seed

echo ""
echo "✅ Done! Test accounts should now be created."
