"""
Light Pollution Service: Manages Bortle Scale classification (1-9)
and Sky Quality Meter (SQM) estimates for observation sites.
"""

from typing import Any, Dict, Optional
import math


class LightPollutionService:
    """
    Bortle Dark-Sky Scale (1 = Pristine dark sky, 9 = Inner-city sky).
    Provides coordinate-based estimation, database lookups for famous sites,
    and user override support.
    """

    KNOWN_SITES = [
        # Dark Sky reserves / observatories
        {"name": "Mauna Kea Observatory", "lat": 19.8206, "lon": -155.4681, "bortle": 1},
        {"name": "Atacama / Paranal", "lat": -24.6272, "lon": -70.4042, "bortle": 1},
        {"name": "Aoraki Mackenzie", "lat": -43.9856, "lon": 170.4633, "bortle": 1},
        {"name": "Mount Bromo, ID", "lat": -7.9425, "lon": 112.9530, "bortle": 3},
        {"name": "Joshua Tree National Park", "lat": 33.8734, "lon": -115.9010, "bortle": 3},
        {"name": "Death Valley National Park", "lat": 36.5054, "lon": -117.0794, "bortle": 1},
        {"name": "Canary Islands (Roque de los Muchachos)", "lat": 28.7606, "lon": -17.8817, "bortle": 2},
        # Major Metropolitan Cities
        {"name": "Jakarta Pusat", "lat": -6.1751, "lon": 106.8650, "bortle": 9},
        {"name": "New York City (Times Square)", "lat": 40.7580, "lon": -73.9855, "bortle": 9},
        {"name": "Tokyo Center", "lat": 35.6762, "lon": 139.6503, "bortle": 9},
        {"name": "London Center", "lat": 51.5074, "lon": -0.1278, "bortle": 8},
        {"name": "Los Angeles Downtown", "lat": 34.0522, "lon": -118.2437, "bortle": 8},
        {"name": "Bandung City", "lat": -6.9175, "lon": 107.6191, "bortle": 8},
        {"name": "Yogyakarta City", "lat": -7.7956, "lon": 110.3695, "bortle": 7},
    ]

    BORTLE_DESCRIPTIONS = {
        1: "Class 1: Excellent dark-sky site. Zodiacal light visible, Milky Way casts diffuse shadows.",
        2: "Class 2: Typical truly dark site. Milky Way highly detailed, zodiacal light prominent.",
        3: "Class 3: Rural sky. Light pollution faint along horizons, clouds dimly illuminated near horizons.",
        4: "Class 4: Rural/suburban transition. Light domes visible, Milky Way still impressive.",
        5: "Class 5: Suburban sky. Only hints of Milky Way seen near zenith, wash-out around horizons.",
        6: "Class 6: Bright suburban sky. Milky Way only visible in zenith, skyglow dominates.",
        7: "Class 7: Suburban/urban transition. Entire sky has grayish hue, strong light pollution.",
        8: "Class 8: City sky. Sky glows whitish-gray, only bright stars and planets visible.",
        9: "Class 9: Inner-city sky. Entire sky brightly lit, faint stars invisible to the naked eye.",
    }

    @staticmethod
    def _haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Haversine distance between two latitude/longitude points in kilometers."""
        r = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(math.radians(lat1))
            * math.cos(math.radians(lat2))
            * math.sin(dlon / 2) ** 2
        )
        return 2 * r * math.asin(math.sqrt(max(0.0, min(1.0, a))))

    @classmethod
    def get_bortle_scale(
        cls,
        latitude: float,
        longitude: float,
        override_bortle: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Estimate Bortle scale based on nearby anchor points or default empirical fallback.
        Accepts explicit user override.
        """
        if override_bortle is not None:
            clamped = max(1, min(9, int(override_bortle)))
            return {
                "bortle_scale": clamped,
                "description": cls.BORTLE_DESCRIPTIONS.get(clamped, ""),
                "source": "manual_override",
            }

        # Check proximity to known anchor sites (< 35 km)
        nearest_site = None
        min_dist = float("inf")

        for site in cls.KNOWN_SITES:
            dist = cls._haversine_distance_km(latitude, longitude, site["lat"], site["lon"])
            if dist < min_dist:
                min_dist = dist
                nearest_site = site

        if nearest_site and min_dist <= 35.0:
            scale = nearest_site["bortle"]
            source = f"matched_nearby_site: {nearest_site['name']} ({round(min_dist, 1)}km)"
        else:
            # Empirical fallback: suburban/rural transition default (Bortle 4)
            scale = 4
            source = "empirical_regional_default"

        return {
            "bortle_scale": scale,
            "description": cls.BORTLE_DESCRIPTIONS.get(scale, ""),
            "source": source,
        }
