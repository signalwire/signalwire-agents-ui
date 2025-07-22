#!/usr/bin/env pwsh

Write-Host "🔨 Rebuilding SignalWire Agent Builder containers..." -ForegroundColor Blue

# Set build version to current timestamp
$BUILD_VERSION = [Math]::Floor((Get-Date -UFormat %s))
Write-Host "🏷️  Build version: $BUILD_VERSION" -ForegroundColor Yellow

# Set environment variable for Docker build
$env:BUILD_VERSION = $BUILD_VERSION

# Check if containers are running and stop them
Write-Host "⏹️  Stopping existing containers..." -ForegroundColor Yellow
docker-compose down

# Build and start containers
Write-Host "🏗️  Building and starting containers..." -ForegroundColor Yellow
docker-compose up --build -d

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Done! Containers rebuilt and running." -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Access the application at:" -ForegroundColor Cyan
    Write-Host "   • HTTP:  http://localhost:8429  (no SSL warnings)" -ForegroundColor Gray
    Write-Host "   • HTTPS: https://localhost:8430 (self-signed cert)" -ForegroundColor Gray
} else {
    Write-Host "❌ Build failed! Check the output above for errors." -ForegroundColor Red
    exit 1
} 