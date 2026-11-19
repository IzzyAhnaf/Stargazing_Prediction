"""
Weather Service: Fetches high-resolution hourly meteorological data from Open-Meteo API.
"""

import time
from typing import Any, Dict, List, Optional
import requests


class WeatherService:
    BASE_URL = "https://api.open-meteo.com/v1/forecast"

    @classmethod
    def fetch_hourly_weather(
        cls,
        latitude: float,
        longitude: float,
        forecast_days: int = 2,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        timeout: int = 30,
        max_retries: int = 3,
        backoff_seconds: float = 1.5,
    ) -> List[Dict[str, Any]]:
        """
        Fetch hourly weather variables critical for stargazing:
        - Cloud cover (Total, High, Mid, Low)
        - Relative humidity (%)
        - Temperature & Dew Point (°C)
        - Visibility (meters)

        Retries transient network failures (timeouts, connection resets) with
        exponential backoff before giving up, since a single slow response
        from Open-Meteo should not immediately surface as a 500 to the user.
        """
        params: Dict[str, Any] = {
            "latitude": latitude,
            "longitude": longitude,
            "hourly": [
                "cloud_cover",
                "cloud_cover_low",
                "cloud_cover_mid",
                "cloud_cover_high",
                "relative_humidity_2m",
                "dew_point_2m",
                "temperature_2m",
                "visibility",
            ],
            "timezone": "UTC",
        }

        if start_date and end_date:
            params["start_date"] = start_date
            params["end_date"] = end_date
        else:
            params["forecast_days"] = forecast_days

        last_error: Optional[Exception] = None
        data: Optional[Dict[str, Any]] = None

        for attempt in range(1, max_retries + 1):
            try:
                response = requests.get(cls.BASE_URL, params=params, timeout=timeout)
                response.raise_for_status()
                data = response.json()
                last_error = None
                break
            except requests.RequestException as e:
                last_error = e
                if attempt < max_retries:
                    time.sleep(backoff_seconds * attempt)  # 1.5s, 3s, ...
                    continue

        if data is None:
            raise RuntimeError(
                f"Failed to fetch weather data from Open-Meteo after {max_retries} "
                f"attempts: {last_error}"
            ) from last_error

        hourly = data.get("hourly", {})
        times = hourly.get("time", [])
        total_steps = len(times)

        records = []
        for i in range(total_steps):
            temp = hourly.get("temperature_2m", [None])[i]
            dew = hourly.get("dew_point_2m", [None])[i]
            spread = (temp - dew) if (temp is not None and dew is not None) else None

            record = {
                "timestamp_utc": times[i],
                "cloud_cover": hourly.get("cloud_cover", [0])[i],
                "cloud_cover_low": hourly.get("cloud_cover_low", [0])[i],
                "cloud_cover_mid": hourly.get("cloud_cover_mid", [0])[i],
                "cloud_cover_high": hourly.get("cloud_cover_high", [0])[i],
                "relative_humidity": hourly.get("relative_humidity_2m", [0])[i],
                "temperature": temp,
                "dew_point": dew,
                "dew_point_spread": spread,
                "visibility_meters": hourly.get("visibility", [0])[i],
            }
            records.append(record)

        return records
