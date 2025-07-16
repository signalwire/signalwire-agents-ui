#!/bin/bash
# Quick rebuild script for SignalWire Agent Builder

echo "🔨 Rebuilding SignalWire Agent Builder containers..."

# Generate build version based on current timestamp
BUILD_VERSION=$(date +%s)
echo "🏷️  Build version: $BUILD_VERSION"

# If local SDK exists, use timestamp-based cache busting
if [ -d "signalwire-agents" ]; then
    # Use cross-platform stat command (macOS uses -f %m, Linux uses -c %Y)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        SDK_MTIME=$(find signalwire-agents -name "*.py" -type f -exec stat -f '%m' {} \; | sort -n | tail -1)
    else
        SDK_MTIME=$(find signalwire-agents -name "*.py" -type f -exec stat -c '%Y' {} \; | sort -n | tail -1)
    fi
    echo "🔍 SDK latest change timestamp: $SDK_MTIME"
    BUILD_VERSION=$BUILD_VERSION docker-compose build --build-arg SDK_CACHE_BUST=$SDK_MTIME app
    if [ $? -eq 0 ] ; then
	BUILD_VERSION=$BUILD_VERSION docker-compose up -d
    else
	echo "ERROR: The build did not work.";
	exit -1;
    fi
else
    BUILD_VERSION=$BUILD_VERSION docker-compose up --build -d
fi

if [ $? -ne 0 ] ; then
    echo "ERROR: The build did not work.";
else
    echo "✅ Done! Containers rebuilt and running."
fi
