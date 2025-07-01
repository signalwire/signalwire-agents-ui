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

# Install Node.js from NodeSource
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

# Create app directory
WORKDIR /app

# Layer 2a: Install signalwire-agents (local or from pip)
# Use build arg to bust cache when SDK changes
ARG SDK_CACHE_BUST=1
# Copy signalwire-agents if it exists locally
COPY signalwire-agents* ./signalwire-agents/

# Set python3.11 as default python3
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1

# Upgrade pip and install build tools
RUN python3.11 -m pip install --upgrade pip setuptools wheel

# Install signalwire-agents - use local if present, otherwise from pip
RUN if [ -d "./signalwire-agents" ]; then \
        echo "Installing local signalwire-agents..." && \
        python3.11 -m pip install --no-cache-dir -e ./signalwire-agents && \
        python3.11 -m pip install --no-cache-dir signalwire-pom==2.7.1; \
    else \
        echo "Installing signalwire-agents from pip..." && \
        python3.11 -m pip install --no-cache-dir signalwire-agents>=1.0.0; \
    fi

# Layer 2b: Python dependencies (changes less frequently)
COPY backend/requirements.txt ./backend/
RUN python3.11 -m pip install --no-cache-dir -r backend/requirements.txt

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
COPY certs/ /certs/

# Create necessary directories
RUN mkdir -p /var/log/supervisor /var/log/nginx /app/logs

# Set Python path
ENV PYTHONPATH=/app

# Expose port
EXPOSE 8430

# Use supervisor to run both nginx and uvicorn
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]