#!/bin/bash

# Test API endpoints with proper authentication

# Get auth token
echo "Getting auth token..."
TOKEN=$(curl -s -k -X POST https://localhost:8430/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"token": "admin-token-changeme"}' | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('access_token', data.get('token', '')))")

if [ -z "$TOKEN" ]; then
  echo "Failed to get auth token"
  exit 1
fi

echo "Token obtained successfully"

# Function to make authenticated requests
api_get() {
  local endpoint=$1
  echo -e "\n=== GET $endpoint ==="
  curl -s -k -X GET "https://localhost:8430$endpoint" \
    -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -20
}

api_post() {
  local endpoint=$1
  local data=$2
  echo -e "\n=== POST $endpoint ==="
  curl -s -k -X POST "https://localhost:8430$endpoint" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$data" | python3 -m json.tool | head -20
}

# Test endpoints
case "${1:-all}" in
  agents)
    api_get "/api/agents"
    ;;
  summaries)
    api_get "/api/call-summaries?limit=5"
    ;;
  agent-summaries)
    # Get first agent ID
    AGENT_ID=$(curl -s -k -X GET "https://localhost:8430/api/agents" \
      -H "Authorization: Bearer $TOKEN" | python3 -c "import sys, json; agents=json.load(sys.stdin); print(agents[0]['id']) if agents else print('')")
    
    if [ ! -z "$AGENT_ID" ]; then
      api_get "/api/agents/$AGENT_ID/summaries"
    else
      echo "No agents found"
    fi
    ;;
  create-agent)
    api_post "/api/agents" '{
      "name": "Test Agent",
      "description": "Test agent created by script",
      "config": {
        "voice": "en-US-Standard-A",
        "temperature": 0.7
      }
    }'
    ;;
  all)
    api_get "/api/agents"
    api_get "/api/call-summaries?limit=5"
    api_get "/api/changes/check"
    ;;
  *)
    echo "Usage: $0 [agents|summaries|agent-summaries|create-agent|all]"
    exit 1
    ;;
esac