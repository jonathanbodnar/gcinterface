#!/bin/bash

# Get auth token
TOKEN=$(curl -s -X POST https://gcinterface-development.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}' | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

echo "🔑 Got auth token"
echo "👥 Creating mock vendors..."

# Vendor 2: Premier Paint
curl -s -X POST https://gcinterface-development.up.railway.app/api/vendors \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Premier Paint & Coatings",
    "type": "MATERIAL_SUPPLIER",
    "email": "sales@premierpaint.com",
    "phone": "(415) 555-0102",
    "address": "456 Paint Blvd, Oakland, CA 94601",
    "trades": ["A"],
    "materials": ["Interior Paint - Eggshell"],
    "alternates": ["Sherwin Williams", "Benjamin Moore"],
    "serviceRadius": 75,
    "rating": 4.8,
    "active": true
  }' > /dev/null && echo "✓ Premier Paint"

# Vendor 3: Bay Area Plumbing Supply
curl -s -X POST https://gcinterface-development.up.railway.app/api/vendors \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bay Area Plumbing Supply",
    "type": "MATERIAL_SUPPLIER",
    "email": "orders@bayareaplumbing.com",
    "phone": "(415) 555-0103",
    "address": "789 Pipe Street, San Jose, CA 95110",
    "trades": ["P"],
    "materials": ["Copper Pipe Type L 1\"", "PVC DWV Pipe 3\"", "PVC DWV Pipe 4\"", "90° Elbow Copper 1\"", "Tee Copper 1\""],
    "serviceRadius": 60,
    "rating": 4.6,
    "active": true
  }' > /dev/null && echo "✓ Bay Area Plumbing Supply"

# Vendor 4: Ferguson Plumbing Fixtures (REQUIRED)
curl -s -X POST https://gcinterface-development.up.railway.app/api/vendors \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ferguson Plumbing Fixtures",
    "type": "MATERIAL_SUPPLIER",
    "email": "commercial@ferguson.com",
    "phone": "(415) 555-0104",
    "address": "321 Fixture Ave, Fremont, CA 94538",
    "trades": ["P"],
    "materials": ["Water Closet - Kohler K-3989", "Lavatory - American Standard Studio", "Urinal - Sloan WEUS-1000", "Water Heater - Rheem RTGH-95"],
    "alternates": ["Toto", "American Standard", "Moen"],
    "isRequired": true,
    "requiredFor": ["Water Closet - Kohler K-3989"],
    "serviceRadius": 100,
    "rating": 4.9,
    "active": true
  }' > /dev/null && echo "✓ Ferguson Plumbing Fixtures (REQUIRED)"

# Vendor 5: West Coast HVAC Supply
curl -s -X POST https://gcinterface-development.up.railway.app/api/vendors \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "West Coast HVAC Supply",
    "type": "MATERIAL_SUPPLIER",
    "email": "info@westcoasthvac.com",
    "phone": "(415) 555-0105",
    "address": "555 HVAC Drive, Sacramento, CA 95814",
    "trades": ["M"],
    "materials": ["Galvanized Duct 12x8", "Galvanized Duct 10x6", "RTU - Carrier 48VL-A06A", "VAV Box - Trane CVHE"],
    "serviceRadius": 150,
    "rating": 4.4,
    "active": true
  }' > /dev/null && echo "✓ West Coast HVAC Supply"

# Vendor 6: NorCal Electrical
curl -s -X POST https://gcinterface-development.up.railway.app/api/vendors \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "NorCal Electrical Distributors",
    "type": "MATERIAL_SUPPLIER",
    "email": "sales@norcalelec.com",
    "phone": "(415) 555-0106",
    "address": "987 Electric Way, Hayward, CA 94544",
    "trades": ["E"],
    "materials": ["Electrical Panel - Square D QO"],
    "serviceRadius": 80,
    "rating": 4.7,
    "active": true
  }' > /dev/null && echo "✓ NorCal Electrical"

# Contractor 1: Golden State Contractors
curl -s -X POST https://gcinterface-development.up.railway.app/api/vendors \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Golden State Contractors",
    "type": "SUBCONTRACTOR",
    "email": "bids@goldenstatecontractors.com",
    "phone": "(415) 555-0201",
    "address": "111 Construction Blvd, San Mateo, CA 94402",
    "trades": ["A"],
    "services": ["Flooring Installation", "Ceiling Installation", "Painting"],
    "crewSize": 12,
    "equipmentList": ["Lifts", "Floor Sanders", "Spray Equipment"],
    "certifications": ["OSHA 30-Hour", "CA Contractors License"],
    "insurance": {"liability": 2000000, "workers_comp": 1000000, "expiry": "2025-12-31"},
    "serviceRadius": 100,
    "rating": 4.6,
    "active": true
  }' > /dev/null && echo "✓ Golden State Contractors"

# Contractor 2: Pacific Plumbing
curl -s -X POST https://gcinterface-development.up.railway.app/api/vendors \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pacific Plumbing Contractors",
    "type": "SUBCONTRACTOR",
    "email": "estimating@pacificplumbing.com",
    "phone": "(415) 555-0202",
    "address": "222 Plumber Lane, Concord, CA 94520",
    "trades": ["P"],
    "services": ["Rough-in Plumbing", "Fixture Installation", "Water Heater Installation", "Backflow Testing"],
    "crewSize": 8,
    "equipmentList": ["Pipe Threading Machines", "Drain Cameras", "Service Trucks"],
    "certifications": ["Master Plumber", "C-36 License", "Backflow Certified"],
    "insurance": {"liability": 3000000, "workers_comp": 1500000, "expiry": "2025-10-15"},
    "serviceRadius": 75,
    "rating": 4.8,
    "active": true
  }' > /dev/null && echo "✓ Pacific Plumbing Contractors"

# Contractor 3: Bay Mechanical
curl -s -X POST https://gcinterface-development.up.railway.app/api/vendors \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bay Mechanical Services",
    "type": "SUBCONTRACTOR",
    "email": "quotes@baymechanical.com",
    "phone": "(415) 555-0203",
    "address": "333 HVAC Court, Richmond, CA 94801",
    "trades": ["M"],
    "services": ["HVAC Installation", "Ductwork Fabrication", "Balancing & Testing"],
    "crewSize": 10,
    "equipmentList": ["Cranes", "Sheet Metal Shop", "Test Equipment"],
    "certifications": ["C-20 HVAC License", "EPA Universal", "NATE Certified"],
    "insurance": {"liability": 2500000, "workers_comp": 1500000, "expiry": "2025-11-30"},
    "serviceRadius": 90,
    "rating": 4.7,
    "active": true
  }' > /dev/null && echo "✓ Bay Mechanical Services"

# Contractor 4: Elite Electrical
curl -s -X POST https://gcinterface-development.up.railway.app/api/vendors \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Elite Electrical Contractors",
    "type": "SUBCONTRACTOR",
    "email": "bids@eliteelectrical.com",
    "phone": "(415) 555-0204",
    "address": "444 Electric Plaza, Walnut Creek, CA 94596",
    "trades": ["E"],
    "services": ["Electrical Installation", "Panel Installation", "Testing & Commissioning"],
    "crewSize": 15,
    "equipmentList": ["Lifts", "Wire Pulling Equipment", "Test Instruments"],
    "certifications": ["C-10 Electrical License", "OSHA 30-Hour", "NFPA 70E"],
    "insurance": {"liability": 3000000, "workers_comp": 2000000, "expiry": "2025-09-01"},
    "serviceRadius": 100,
    "rating": 4.9,
    "active": true
  }' > /dev/null && echo "✓ Elite Electrical Contractors"

echo ""
echo "🎉 All mock vendors created!"
echo ""
echo "📊 Summary:"
echo "  • 6 Material Suppliers (Flooring, Paint, Plumbing, HVAC, Electrical)"  
echo "  • 4 Subcontractors (Architectural, Plumbing, Mechanical, Electrical)"
echo "  • All match materials in Mock Commercial Building project"
echo ""
echo "✨ Ready to test vendor matching!"

