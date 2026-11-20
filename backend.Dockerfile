# ============================================================
# Backend Dockerfile — FastAPI + XGBoost + SHAP
#
# IMPORTANT — build context must be the REPO ROOT (one level above the
# `backend/` folder), not the `backend/` folder itself. That's because
# every internal import in this codebase is written as an absolute import
# rooted at `backend`, e.g.:
#
#     from backend.app.ml.predictor import StargazingPredictor
#     from backend.app.api.v1.endpoints import router as api_v1_router
#
# For those imports to resolve, Python needs to see a `backend/` package
# sitting in the current working directory — so this image copies the
# WHOLE `backend/` folder in under that name and runs uvicorn pointed at
# `backend.app.main:app`, never `app.main:app`.
#
# In docker-compose.yml this is wired up as:
#   build:
#     context: .                     # repo root
#     dockerfile: backend/Dockerfile
# ============================================================

FROM python:3.11-slim AS base

# xgboost/shap need a C/C++ runtime (libgomp) that the slim image doesn't
# ship by default.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /srv

# Install deps first so this layer is cached across code-only changes.
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Now copy the actual application code (and the trained model file inside
# app/ml/, if that's how your repo ships it).
COPY backend/ ./backend/

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

EXPOSE 8000

# Basic container healthcheck hitting the app's own /health route.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health', timeout=3)" || exit 1

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
