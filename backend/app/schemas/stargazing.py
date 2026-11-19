"""
Pydantic Schemas for Stargazing & Milky Way Forecast API
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class StargazingRequest(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees", examples=[-7.9425])
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees", examples=[112.9530])
    date: Optional[str] = Field(None, description="Target forecast date in YYYY-MM-DD format (UTC). Defaults to today.", examples=["2026-11-06"])
    elevation: Optional[float] = Field(0.0, description="Elevation in meters above sea level", examples=[2329.0])
    forecast_days: Optional[int] = Field(2, ge=1, le=7, description="Number of days to forecast (1-7)")
    override_bortle: Optional[int] = Field(None, ge=1, le=9, description="Optional manual override for Bortle Dark-Sky Scale (1-9)")
    lang: Optional[str] = Field(
        "en",
        description=(
            "Language for generated prose fields (verdict, primary_driver, "
            "positive_factors, negative_factors, key_recommendation, "
            "moon_interference_note): 'en' or 'id'. Does not affect "
            "rating_category or moon_phase_name, which stay as fixed English "
            "enum values for stable client-side matching."
        ),
        examples=["en"],
    )


class LocationMetadata(BaseModel):
    latitude: float
    longitude: float
    elevation: float
    bortle_scale: int
    bortle_source: str
    bortle_description: str


class BestVisitWindow(BaseModel):
    start_time: str
    end_time: str
    peak_time: str
    peak_score: float
    milky_way_core_visible: bool
    key_recommendation: str


class MoonSummary(BaseModel):
    phase_name: str
    illumination_pct: float
    moon_altitude_at_peak: float
    moon_interference_note: str


class ForecastSummary(BaseModel):
    overall_night_score: float
    rating_category: str
    best_window: Optional[BestVisitWindow]
    moon_summary: MoonSummary
    primary_driver: str


class SHAPExplanationPayload(BaseModel):
    predicted_score: float
    base_score: float
    verdict: str
    primary_driver: str
    positive_factors: List[str]
    negative_factors: List[str]
    feature_shap_values: Dict[str, float]


class HourlyForecastItem(BaseModel):
    timestamp_utc: str
    stargazing_score: float
    rating_category: str
    is_astronomical_night: bool
    cloud_cover: float
    cloud_cover_high: float
    cloud_cover_mid: float
    cloud_cover_low: float
    relative_humidity: float
    temperature: Optional[float] = None
    dew_point: Optional[float] = None
    dew_point_spread: Optional[float] = None
    visibility_meters: Optional[float] = None
    sun_altitude: float
    moon_phase_name: str
    moon_illumination: float
    moon_altitude: float
    moon_azimuth: float
    milky_way_core_altitude: float
    milky_way_core_azimuth: float
    is_milky_way_prime_window: bool
    explanation: SHAPExplanationPayload


class StargazingResponse(BaseModel):
    success: bool
    location: LocationMetadata
    summary: ForecastSummary
    hourly_forecast: List[HourlyForecastItem]
    meta: Dict[str, Any]
