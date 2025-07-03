#!/bin/bash

# Test that the web_search skill properly shows swaig_fields parameter

echo "Testing web_search skill parameters..."

# Get auth token
AUTH_TOKEN=$(curl -s -k -X POST https://localhost:8430/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"token": "admin-token-changeme"}' | jq -r '.access_token')

if [ -z "$AUTH_TOKEN" ]; then
    echo "Failed to get auth token"
    exit 1
fi

# Get web_search skill details
echo -e "\nFetching web_search skill details..."
curl -s -k -X GET https://localhost:8430/api/skills/unified/web_search \
    -H "Authorization: Bearer $AUTH_TOKEN" | jq '.parameters'