#!/bin/bash
# Rebuild script that ensures the latest signalwire-python SDK is included

echo "🔨 Rebuilding SignalWire Agent Builder with updated SDK..."

# Force rebuild by changing the build arg
export REBUILD_TRIGGER=$(date +%s)

# Build and restart containers
docker-compose up --build -d

if [ $? -ne 0 ] ; then
    echo "❌ ERROR: The build did not work."
    exit 1
else
    echo "✅ Done! Containers rebuilt with latest signalwire-python SDK."
    echo ""
    echo "You can check the logs with: docker-compose logs -f app"
fi