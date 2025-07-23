# Windows Setup Guide

This guide covers Windows-specific setup instructions and troubleshooting for the SignalWire Agent Builder.

## Prerequisites

### Required Software
1. **Docker Desktop for Windows**
   - Download from [docker.com](https://docs.docker.com/desktop/install/windows-install/)
   - Ensure WSL 2 backend is enabled
   - Minimum 4GB RAM allocated to Docker

2. **Git for Windows** (optional, for development)
   - Download from [git-scm.com](https://git-scm.com/download/win)

### Windows-Specific Files
The project now includes Windows-compatible scripts:
- `rebuild.bat` - Command Prompt version
- `rebuild.ps1` - PowerShell version  
- `scripts/init-db.sql` - Cross-platform SQL initialization (replaces shell script)

## Setup Instructions

### 1. Environment Configuration
```cmd
# Copy and edit environment file
copy .env.example .env
notepad .env
```

### 2. Database Initialization
The database initialization now uses a pure SQL script (`scripts/init-db.sql`) instead of a shell script, making it fully compatible with Windows Docker containers.

### 3. Building and Running

**Option A: Command Prompt**
```cmd
rebuild.bat
```

**Option B: PowerShell**
```powershell
.\rebuild.ps1
```

**Option C: Manual Docker Commands**
```cmd
docker-compose down
docker-compose up --build -d
```

## Troubleshooting

### Common Issues

#### 1. Line Ending Problems
If you encounter "exec /app/app-entrypoint.sh: no such file or directory" errors:

**Automatic Fix (Recommended):**
The Dockerfile now automatically converts Windows line endings during build:
```dockerfile
RUN sed -i 's/\r$//' /app/app-entrypoint.sh /app/scripts/start-backend.sh
```

**Manual Fix (if needed):**
```powershell
# Convert line endings using PowerShell
(Get-Content .\scripts\app-entrypoint.sh -Raw) -replace "`r`n", "`n" | Set-Content .\scripts\app-entrypoint.sh -NoNewline
(Get-Content .\scripts\start-backend.sh -Raw) -replace "`r`n", "`n" | Set-Content .\scripts\start-backend.sh -NoNewline
```

#### 2. Docker Volume Issues
Windows file paths in Docker volumes:
```yaml
# This works on Windows
volumes:
  - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/00-init-db.sql
```

#### 3. Permission Errors
Run PowerShell as Administrator if you encounter permission issues:
```powershell
# Enable script execution (run as Administrator)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### 4. WSL 2 Issues
If Docker fails to start:
1. Enable WSL 2 in Windows Features
2. Update WSL kernel: `wsl --update`
3. Restart Docker Desktop

### Database Issues

#### Connection Problems
If the database fails to initialize:
1. Check Docker Desktop is running
2. Verify WSL 2 backend is enabled
3. Restart Docker Desktop
4. Clear Docker volumes:
   ```cmd
   docker-compose down -v
   docker-compose up --build -d
   ```

#### Migration Failures
The new SQL-based initialization script is more reliable on Windows:
- No shell script dependencies
- Pure SQL execution
- Cross-platform compatibility
- Proper error handling with transactions

#### PWA Icon Issues
If you see "Download error or resource isn't a valid image" for PWA icons:
1. **Automatic Fix**: The manifest now uses SVG icons as fallbacks
2. **Manual Fix**: Clear browser cache and reload
3. **Complete Reset**: 
   ```cmd
   docker-compose down -v
   docker-compose up --build -d
   ```

## Performance Tips

### Docker Performance on Windows
1. **Allocate sufficient resources:**
   - Docker Desktop → Settings → Resources
   - RAM: Minimum 4GB, recommended 8GB
   - CPU: At least 2 cores

2. **Use WSL 2 backend:**
   - Much faster than Hyper-V
   - Better file system performance
   - Lower resource usage

3. **Store project in WSL filesystem:**
   ```bash
   # Clone to WSL filesystem for better performance
   cd /home/yourusername
   git clone <repository-url>
   ```

## Development on Windows

### Code Editing
- **VS Code**: Best IDE support with Docker extension
- **Windows Terminal**: Better PowerShell experience
- **Git Bash**: Unix-like environment for familiar commands

### File Watching
If auto-reload doesn't work:
1. Use WSL 2 filesystem
2. Or use Docker's polling mode:
   ```yaml
   environment:
     - CHOKIDAR_USEPOLLING=true
   ```

## Support

If you encounter Windows-specific issues:
1. Check Docker Desktop logs
2. Verify WSL 2 is properly configured
3. Try running commands as Administrator
4. Use the pure SQL initialization script (automatically used)

For general issues, refer to the main README.md file. 