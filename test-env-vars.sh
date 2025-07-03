#!/bin/bash

echo "Testing Environment Variables functionality..."

# Get auth token
AUTH_TOKEN=$(curl -s -k -X POST https://localhost:8430/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"token": "admin-token-changeme"}' | jq -r '.access_token')

if [ -z "$AUTH_TOKEN" ]; then
    echo "Failed to get auth token"
    exit 1
fi

echo -e "\n1. Creating test environment variables..."

# Create GOOGLE_SEARCH_API_KEY
curl -s -k -X POST https://localhost:8430/api/env-vars/ \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "GOOGLE_SEARCH_API_KEY",
        "value": "test-google-api-key-12345",
        "description": "Google Custom Search API Key",
        "is_secret": true
    }' | jq '.'

# Create GOOGLE_SEARCH_ENGINE_ID
curl -s -k -X POST https://localhost:8430/api/env-vars/ \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "GOOGLE_SEARCH_ENGINE_ID",
        "value": "test-search-engine-id",
        "description": "Google Custom Search Engine ID",
        "is_secret": true
    }' | jq '.'

echo -e "\n2. Listing environment variables..."
curl -s -k -X GET https://localhost:8430/api/env-vars/ \
    -H "Authorization: Bearer $AUTH_TOKEN" | jq '.'

echo -e "\n3. Checking GOOGLE_SEARCH_API_KEY status..."
curl -s -k -X GET https://localhost:8430/api/env-vars/check/GOOGLE_SEARCH_API_KEY \
    -H "Authorization: Bearer $AUTH_TOKEN" | jq '.'

echo -e "\n4. Testing skill with env vars (no params provided)..."
curl -s -k -X POST https://localhost:8430/api/skills/test/ \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "skill_name": "web_search",
        "skill_params": {},
        "function_name": "web_search",
        "test_args": {
            "query": "test search"
        }
    }' | jq '.'