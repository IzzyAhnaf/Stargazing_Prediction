"""
Astronomy Service: Precision celestial ephemeris calculations using pyephem.
Calculates Lunar phases/altitudes, Milky Way Core (Galactic Center) position,
and Solar altitudes (Astronomical Twilight/Night detection).
"""

import math
from datetime import datetime
from typing import Any, Dict, List
import ephem


class AstronomyService:
    # Galactic Center coordinates (Sagittarius A*), Epoch J2000
    GALACTIC_CENTER_RA = "17:45:40.04"
    GALACTIC_CENTER_DEC = "-29:00:28.1"

    @staticmethod
    def _get_phase_name(elongation_deg: float) -> str:
        """Categorize moon phase by Sun-Moon ecliptic elongation (0-360 degrees)."""
        elongation = elongation_deg % 360
        if elongation < 22.5 or elongation >= 337.5:
            return "New Moon"
        elif 22.5 <= elongation < 67.5:
            return "Waxing Crescent"
        elif 67.5 <= elongation < 112.5:
            return "First Quarter"
        elif 112.5 <= elongation < 157.5:
            return "Waxing Gibbous"
        elif 157.5 <= elongation < 202.5:
            return "Full Moon"
        elif 202.5 <= elongation < 247.5:
            return "Waning Gibbous"
        elif 247.5 <= elongation < 292.5:
            return "Last Quarter"
        else:
            return "Waning Crescent"

    @classmethod
    def calculate_celestial_metrics(
        cls,
        latitude: float,
        longitude: float,
        elevation: float,
        utc_dt: datetime,
    ) -> Dict[str, Any]:
        """
        Calculate celestial positions for an observer at given coordinates and UTC timestamp.
        """
        obs = ephem.Observer()
        obs.lat = str(latitude)
        obs.lon = str(longitude)
        obs.elevation = elevation
        obs.date = ephem.Date(utc_dt)

        # 1. Sun
        sun = ephem.Sun(obs)
        sun_alt = math.degrees(sun.alt)
        sun_az = math.degrees(sun.az)
        is_astronomical_night = sun_alt <= -18.0

        # 2. Moon
        moon = ephem.Moon(obs)
        moon_alt = math.degrees(moon.alt)
        moon_az = math.degrees(moon.az)
        moon_illumination = moon.phase / 100.0  # 0.0 to 1.0

        # Ecliptic elongation for phase naming
        m_ecl = ephem.Ecliptic(moon)
        s_ecl = ephem.Ecliptic(sun)
        elongation_deg = math.degrees((m_ecl.lon - s_ecl.lon) % (2 * math.pi))
        phase_name = cls._get_phase_name(elongation_deg)

        # 3. Milky Way Core (Galactic Center)
        gc = ephem.FixedBody()
        gc._ra = ephem.hours(cls.GALACTIC_CENTER_RA)
        gc._dec = ephem.degrees(cls.GALACTIC_CENTER_DEC)
        gc._epoch = ephem.J2000
        gc.compute(obs)
        mw_alt = math.degrees(gc.alt)
        mw_az = math.degrees(gc.az)
        is_mw_core_above_horizon = mw_alt > 0.0

        return {
            "sun_altitude": round(sun_alt, 2),
            "sun_azimuth": round(sun_az, 2),
            "is_astronomical_night": is_astronomical_night,
            "moon_phase_name": phase_name,
            "moon_illumination": round(moon_illumination, 4),
            "moon_phase_pct": round(moon.phase, 2),
            "moon_altitude": round(moon_alt, 2),
            "moon_azimuth": round(moon_az, 2),
            "is_moon_up": moon_alt > 0.0,
            "milky_way_core_altitude": round(mw_alt, 2),
            "milky_way_core_azimuth": round(mw_az, 2),
            "is_milky_way_visible": is_mw_core_above_horizon and is_astronomical_night,
        }

    @classmethod
    def calculate_hourly_series(
        cls,
        latitude: float,
        longitude: float,
        elevation: float,
        timestamps_iso: List[str],
    ) -> List[Dict[str, Any]]:
        """Calculate celestial metrics for a list of ISO-formatted UTC timestamps."""
        results = []
        for ts in timestamps_iso:
            # Parse ISO timestamp (e.g. '2026-11-06T20:00')
            dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            metrics = cls.calculate_celestial_metrics(latitude, longitude, elevation, dt)
            results.append({"timestamp_utc": ts, **metrics})
        return results
