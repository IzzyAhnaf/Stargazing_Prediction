"""
Main FastAPI Application Entrypoint
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.v1.endpoints import router as api_v1_router
from backend.app.core.config import settings
from backend.app.ml.predictor import StargazingPredictor


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Pre-warm XGBoost model and SHAP TreeExplainer
    print("🚀 Pre-warming XGBoost Regressor and SHAP TreeExplainer...")
    try:
        predictor = StargazingPredictor.get_instance()
        print("✅ ML Engine successfully loaded and ready for inferences.")
    except Exception as e:
        print(f"⚠️ Warning during ML pre-warming: {e}")
    yield
    # Shutdown logic if needed
    print("🛑 Stargazing API service shutting down.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="High-Precision Machine Learning Decision Support System for Stargazing & Milky Way Astrophotography Visibility.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Enable Cross-Origin Resource Sharing (CORS) for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routes
app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX, tags=["Stargazing Forecast v1"])
app.include_router(api_v1_router, prefix="", tags=["Root Endpoints"])


@app.get("/", tags=["Root"])
async def root():
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "health": "/health",
        "predict_endpoint": "/predict-stargazing",
    }
