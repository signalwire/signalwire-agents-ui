Write-Host "🔨 Rebuilding SignalWire Agent Builder containers..." -ForegroundColor Cyan

# Set build version to current timestamp (Unix epoch seconds)
$BUILD_VERSION = [int][double]::Parse((Get-Date -UFormat %s).ToString())
Write-Host "🏷️  Build version: $BUILD_VERSION" -ForegroundColor Yellow

# Set environment variable for Docker build
$env:BUILD_VERSION = $BUILD_VERSION

# Check if containers are running and stop them
docker-compose down

# Build and start containers
docker-compose up --build -d

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Done! Containers rebuilt and running." -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Access the application at:" -ForegroundColor Cyan
    Write-Host "   • HTTP:  http://localhost:8429  (no SSL warnings)"
    Write-Host "   • HTTPS: https://localhost:8430 (self-signed cert)"
}
else {
    Write-Host "❌ Build failed! Check the output above for errors." -ForegroundColor Red
    exit 1
}
