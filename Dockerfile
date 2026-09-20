# ==============================================================================
# VidSnap.AI — Multi-Stage Production Dockerfile
# Stage 1: Install Python dependencies (cached layer)
# Stage 2: Runtime image with FFmpeg and non-root user
# ==============================================================================

# ---------- Stage 1: Dependency Builder ----------
FROM python:3.11-slim AS builder

WORKDIR /build

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ---------- Stage 2: Runtime ----------
FROM python:3.11-slim

# Install system dependencies (FFmpeg, curl for healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy pre-built Python packages from builder
COPY --from=builder /install /usr/local

# Set working directory
WORKDIR /app

# Create non-root user and required directories
RUN useradd -m -u 1000 appuser && \
    mkdir -p /app/media_storage /tmp/vidsnap && \
    chown -R appuser:appuser /app /tmp/vidsnap

# Copy application source code
COPY --chown=appuser:appuser . .

# Switch to non-root user
USER appuser

# Expose API port
EXPOSE 8000

# Health check (liveness probe)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health/live || exit 1

# Default command: API server with 2 workers
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
