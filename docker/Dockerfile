FROM ubuntu:22.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Layer 1: System dependencies and Node.js
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    python3.11 \
    python3.11-dev \
    python3-pip \
    postgresql-client \
    nginx \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Remove any existing Node.js and install from NodeSource
RUN apt-get remove -y nodejs npm && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

# Create app directory
WORKDIR /app

# Layer 2: Python dependencies (changes less frequently)
COPY backend/requirements.txt ./backend/
RUN pip3 install --no-cache-dir -r backend/requirements.txt

# Layer 3: Frontend dependencies (changes less frequently)
COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm ci --only=production

# Layer 4: Frontend build
COPY frontend/ .
RUN npm run build

# Layer 5: Backend application code
WORKDIR /app
COPY backend/ ./backend/

# Layer 6: Configuration files
COPY docker/nginx.conf /etc/nginx/sites-available/default
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Create necessary directories
RUN mkdir -p /var/log/supervisor /var/log/nginx /app/logs

# Set Python path
ENV PYTHONPATH=/app

# Expose port
EXPOSE 8430

# Use supervisor to run both nginx and uvicorn
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]