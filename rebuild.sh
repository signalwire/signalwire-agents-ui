#!/bin/bash
# Quick rebuild script for SignalWire Agent Builder

echo "🔨 Rebuilding SignalWire Agent Builder containers..."
docker-compose up --build -d

echo "✅ Done! Containers rebuilt and running."