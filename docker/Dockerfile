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
    libmagic1 \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js from NodeSource
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

# Create app directory
WORKDIR /app

# Layer 2a: Install signalwire-python (local or from pip)
# Use build arg to bust cache when SDK changes
ARG SDK_CACHE_BUST=1
# Copy signalwire-python if it exists locally
COPY signalwire-python* ./signalwire-python/

# Set python3.11 as default python3
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1

# Upgrade pip and install build tools
RUN python3.11 -m pip install --upgrade pip setuptools wheel

# Install signalwire-python - use local if present, otherwise from pip
RUN if [ -d "./signalwire-python" ]; then \
        echo "Installing local signalwire-python with search-all..." && \
        python3.11 -m pip install --no-cache-dir -e "./signalwire-python[search-all]" && \
        python3.11 -m pip install --no-cache-dir signalwire-pom==2.7.1; \
    else \
        echo "Installing signalwire-python from pip with search-all..." && \
        python3.11 -m pip install --no-cache-dir "signalwire-python[search-all]"; \
    fi

# Download spaCy language model for NLP features
RUN python3.11 -m spacy download en_core_web_sm

# Layer 2b: Python dependencies (changes less frequently)
COPY backend/requirements.txt ./backend/
RUN python3.11 -m pip install --no-cache-dir -r backend/requirements.txt

# Layer 3: Frontend dependencies (changes less frequently)
COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm ci

# Layer 4: Frontend build
COPY frontend/ .
RUN npm run build

# Layer 5: Backend application code
WORKDIR /app
COPY backend/ ./backend/
COPY scripts/ ./scripts/
COPY polly_voices.json ./backend/
COPY alembic.ini ./alembic.ini
COPY alembic/ ./alembic/

# Layer 6: Configuration files
COPY docker/nginx.conf /etc/nginx/sites-available/default
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Handle SSL certificates - copy if exists, create self-signed if not
COPY certs/ /certs/
RUN if [ ! -f "/certs/server.pem" ]; then \
        echo "No SSL certificate found, generating self-signed certificate..." && \
        openssl req -x509 -newkey rsa:4096 -keyout /certs/server.pem -out /tmp/cert.crt -days 365 -nodes \
            -subj "/C=US/ST=State/L=City/O=SignalWire Agent Builder/CN=localhost" && \
        cat /tmp/cert.crt >> /certs/server.pem && \
        rm /tmp/cert.crt && \
        echo "Self-signed certificate created at /certs/server.pem"; \
    else \
        echo "Using provided SSL certificate..."; \
    fi

# Create necessary directories
RUN mkdir -p /var/log/supervisor /var/log/nginx /app/logs /app/data/knowledge_base /app/data/media/audio /app/data/media/video

# Set Python path
ENV PYTHONPATH=/app

# DB_PASSWORD will be set by docker-compose at runtime

# Copy entrypoint script and fix Windows line endings
COPY scripts/app-entrypoint.sh /app/app-entrypoint.sh
RUN sed -i 's/\r$//' /app/app-entrypoint.sh /app/scripts/start-backend.sh && \
    chmod +x /app/app-entrypoint.sh /app/scripts/start-backend.sh

# Expose port
EXPOSE 8430

# Use entrypoint that waits for database
ENTRYPOINT ["/app/app-entrypoint.sh"]