"""
Data Pipeline Orchestrator: Fuses meteorological data, ephemeris calculations,
and light pollution scales into an integrated feature set for Stargazing & Milky Way prediction.
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import pandas as pd

from backend.app.services.weather_service import WeatherService
from backend.app.services.astronomy_service import AstronomyService
from backend.app.services.light_pollution_service import LightPollutionService


class StargazingDataPipeline:
    """
    End-to-end data pipeline for Phase 1.
    Collects raw weather, astronomical, and light pollution telemetry
    and structures it into ML-ready tabular formats.
    """

    @classmethod
    def execute(
        cls,
        latitude: float,
        longitude: float,
        elevation: float = 0.0,
        date: Optional[str] = None,
        forecast_days: int = 2,
        override_bortle: Optional[int] = None,
    ) -> pd.DataFrame:
        """
        Execute full data pipeline for given coordinates.
        Returns a rich Pandas DataFrame indexed by hour.

        If `date` (YYYY-MM-DD) is provided, the weather/astronomy window is
        pinned to that date (spanning `forecast_days` days starting there)
        instead of defaulting to "today" at the Open-Meteo API level.
        """
        # Step 1: Fetch Weather Data
        if date:
            try:
                start_dt = datetime.strptime(date, "%Y-%m-%d")
            except ValueError as e:
                raise ValueError(
                    f"Invalid 'date' format: {date!r}. Expected YYYY-MM-DD."
                ) from e
            # Fetch one extra buffer day beyond `forecast_days`. Night hours
            # are picked out downstream by sun altitude, and a night that
            # starts late within the requested window (e.g. for a site far
            # west of UTC) can run past where a tight `forecast_days`-sized
            # window would end, truncating it before sunrise. The buffer day
            # gives that night room to finish without changing what "today"
            # means to the caller.
            end_dt = start_dt + timedelta(days=max(forecast_days, 1))
            weather_records = WeatherService.fetch_hourly_weather(
                latitude=latitude,
                longitude=longitude,
                start_date=start_dt.strftime("%Y-%m-%d"),
                end_date=end_dt.strftime("%Y-%m-%d"),
            )
        else:
            weather_records = WeatherService.fetch_hourly_weather(
                latitude=latitude,
                longitude=longitude,
                forecast_days=forecast_days,
            )

        timestamps = [rec["timestamp_utc"] for rec in weather_records]

        # Step 2: Compute Ephemeris & Astronomical Metrics
        astro_records = AstronomyService.calculate_hourly_series(
            latitude=latitude,
            longitude=longitude,
            elevation=elevation,
            timestamps_iso=timestamps,
        )

        # Step 3: Retrieve Bortle Light Pollution Metric
        bortle_info = LightPollutionService.get_bortle_scale(
            latitude=latitude,
            longitude=longitude,
            override_bortle=override_bortle,
        )

        # Step 4: Merge & Enrich Features
        merged_rows: List[Dict[str, Any]] = []
        for w, a in zip(weather_records, astro_records):
            row = {**w}
            row.update({k: v for k, v in a.items() if k != "timestamp_utc"})
            row["bortle_scale"] = bortle_info["bortle_scale"]
            row["bortle_description"] = bortle_info["description"]
            row["bortle_source"] = bortle_info["source"]

            # Effective Moon Impact Factor:
            # Moon creates severe interference only when illuminated AND above the horizon
            if row["moon_altitude"] > 0:
                row["effective_moon_impact"] = round(
                    row["moon_illumination"] * (row["moon_altitude"] / 90.0), 4
                )
            else:
                row["effective_moon_impact"] = 0.0

            # Astrophotography Prime Flag (Heuristic baseline indicator):
            # Truly dark sky (Sun < -18°), MW core high (> 15°), low cloud (< 25%), moon down/dim
            is_prime_mw = (
                row["is_astronomical_night"]
                and row["milky_way_core_altitude"] > 15.0
                and row["cloud_cover"] <= 25.0
                and row["effective_moon_impact"] < 0.20
            )
            row["is_milky_way_prime_window"] = is_prime_mw

            merged_rows.append(row)

        df = pd.DataFrame(merged_rows)
        return df


def get_feature_matrix_columns() -> List[str]:
    """Columns defined for the Phase 2 Machine Learning Model (X)."""
    return [
        "cloud_cover_high",
        "cloud_cover_mid",
        "cloud_cover_low",
        "relative_humidity",
        "dew_point_spread",
        "moon_illumination",
        "moon_altitude",
        "milky_way_core_altitude",
        "bortle_scale",
    ]
