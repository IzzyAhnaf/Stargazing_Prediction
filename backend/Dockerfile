# ==============================================================================
# Backend Dockerfile for FastAPI + XGBoost + SHAP + pyephem ML Inference Engine
# ==============================================================================

# Build Stage
FROM python:3.11-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt


# Production Runtime Stage
FROM python:3.11-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Security: Create non-root application user
RUN useradd -m -u 1000 appuser

# Copy installed python dependencies from builder
COPY --from=builder /root/.local /home/appuser/.local

# Copy backend application package
COPY --chown=appuser:appuser . /app/backend

ENV PATH=/home/appuser/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
