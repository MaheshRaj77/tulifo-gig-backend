#!/bin/bash

# 1. Register a new client
RESPONSE=$(curl -s -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"testclient11@example.com","password":"Password123!","firstName":"Test","lastName":"Client","role":"client"}')

echo "Register response: $RESPONSE"

# Extract token
TOKEN=$(echo $RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Failed to get token"
  exit 1
fi

echo "Got token: $TOKEN..."

# 2. Submit profile
PROFILE_RESPONSE=$(curl -s -X POST http://localhost:8000/api/auth/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "role": "client",
    "clientType": "individual",
    "location": "New York",
    "country": "United States",
    "timezone": "US/Eastern",
    "budgetRange": "$5k-$10k",
    "preferredContractTypes": ["Fixed Price"],
    "contactName": "Test Contact",
    "businessPhone": "1234567890",
    "businessEmail": "testclient11@example.com"
  }')

echo "Profile response: $PROFILE_RESPONSE"
