#!/bin/bash

# Configuration
API_URL="http://localhost:4000/api/v1/users"

echo "=== Testing @maw/users endpoints ==="

echo -e "\n1. Creating a new user..."
USER_RESPONSE=$(curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe.'$RANDOM'@example.com",
    "phone": "1234567890",
    "password": "SecurePassword123!"
  }')

echo $USER_RESPONSE | jq .

USER_ID=$(echo $USER_RESPONSE | jq -r '.data.id')

if [ "$USER_ID" == "null" ] || [ -z "$USER_ID" ]; then
  echo "Failed to create user. Exiting."
  exit 1
fi

echo -e "\n2. Getting user details..."
curl -s -X GET "$API_URL/$USER_ID" | jq .

echo -e "\n3. Updating user..."
curl -s -X PATCH "$API_URL/$USER_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Johnny"
  }' | jq .

echo -e "\n4. Listing users..."
curl -s -X GET "$API_URL" | jq .

echo -e "\n5. Deactivating user..."
curl -s -X POST "$API_URL/$USER_ID/deactivate" | jq .

echo -e "\n6. Deleting user..."
curl -s -X DELETE "$API_URL/$USER_ID" | jq .

echo -e "\nDone!"
