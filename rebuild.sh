#!/bin/bash
# Quick rebuild script for SignalWire Agent Builder

echo "🔨 Rebuilding SignalWire Agent Builder containers..."

# If local SDK exists, use timestamp-based cache busting
if [ -d "signalwire-agents" ]; then
    SDK_MTIME=$(find signalwire-agents -name "*.py" -type f -exec stat -c '%Y' {} \; | sort -n | tail -1)
    echo "🔍 SDK latest change timestamp: $SDK_MTIME"
    docker-compose build --build-arg SDK_CACHE_BUST=$SDK_MTIME app
    if [ $? -eq 0 ] ; then
	docker-compose up -d
    else
	echo "ERROR: The build did not work.";
	exit -1;
    fi
else
    docker-compose up --build -d
fi

if [ $? -ne 0 ] ; then
    echo "ERROR: The build did not work.";
else
    echo "✅ Done! Containers rebuilt and running."
fi
