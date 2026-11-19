"""
FastAPI Endpoints for Stargazing & Milky Way Forecast API
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status

from backend.app.schemas.stargazing import StargazingRequest, StargazingResponse
from backend.app.services.forecast_service import ForecastService

router = APIRouter()


@router.post(
    "/predict-stargazing",
    response_model=StargazingResponse,
    status_code=status.HTTP_200_OK,
    summary="Predict Stargazing & Milky Way Visibility (POST)",
    description="Calculates real-time astronomical ephemeris, weather forecasts, XGBoost Stargazing Score, and SHAP explainability.",
)
async def predict_stargazing_post(request: StargazingRequest) -> StargazingResponse:
    try:
        response = ForecastService.generate_forecast(request)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Forecasting engine error: {str(e)}",
        ) from e


@router.get(
    "/predict-stargazing",
    response_model=StargazingResponse,
    status_code=status.HTTP_200_OK,
    summary="Predict Stargazing & Milky Way Visibility (GET)",
    description="Convenience GET endpoint accepting coordinates and date as query parameters.",
)
async def predict_stargazing_get(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees", examples=[-7.9425]),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees", examples=[112.9530]),
    date: Optional[str] = Query(None, description="Forecast date (YYYY-MM-DD)", examples=["2026-11-06"]),
    elevation: Optional[float] = Query(0.0, description="Elevation in meters", examples=[2329.0]),
    forecast_days: Optional[int] = Query(2, ge=1, le=7, description="Number of days"),
    override_bortle: Optional[int] = Query(None, ge=1, le=9, description="Manual Bortle Scale override (1-9)"),
    lang: Optional[str] = Query("en", description="Language for generated prose fields: 'en' or 'id'"),
) -> StargazingResponse:
    req = StargazingRequest(
        latitude=latitude,
        longitude=longitude,
        date=date,
        elevation=elevation,
        forecast_days=forecast_days,
        override_bortle=override_bortle,
        lang=lang,
    )
    try:
        response = ForecastService.generate_forecast(req)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Forecasting engine error: {str(e)}",
        ) from e


@router.get(
    "/health",
    summary="API Health & Diagnostics",
    status_code=status.HTTP_200_OK,
)
async def health_check():
    return {
        "status": "healthy",
        "service": "Stargazing & Milky Way Forecast API",
        "ml_engine": "XGBoost + SHAP TreeExplainer",
        "version": "1.0.0",
    }
