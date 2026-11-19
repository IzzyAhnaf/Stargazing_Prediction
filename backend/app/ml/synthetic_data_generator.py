"""
Synthetic Data Generator for Stargazing & Astrophotography ML Training.
Simulates realistic atmospheric, celestial, and light pollution conditions
paired with a physics-informed ground-truth Stargazing Index (0-100).
"""

import numpy as np
import pandas as pd


class SyntheticStargazingDataGenerator:
    """
    Generates synthetic samples representing diverse global stargazing conditions.
    Target (Stargazing Score 0-100) is synthesized using domain-informed optical
    and atmospheric physics rules with stochastic variance.
    """

    @classmethod
    def generate_dataset(cls, n_samples: int = 8000, random_seed: int = 42) -> pd.DataFrame:
        rng = np.random.default_rng(random_seed)

        # 1. Cloud Cover Features (%)
        # Bimodal distribution: many completely clear or heavily overcast nights
        raw_clouds = rng.beta(0.5, 0.5, size=n_samples) * 100.0
        cloud_cover_low = np.clip(raw_clouds * rng.uniform(0.0, 0.9, size=n_samples), 0, 100)
        cloud_cover_mid = np.clip(raw_clouds * rng.uniform(0.0, 0.9, size=n_samples), 0, 100)
        cloud_cover_high = np.clip(raw_clouds * rng.uniform(0.2, 1.0, size=n_samples), 0, 100)

        # 2. Humidity & Dew Point Spread
        relative_humidity = rng.uniform(20.0, 99.0, size=n_samples)
        # Dew point spread is usually correlated inversely with humidity
        # High humidity (e.g. 95%) -> dew point spread is small (0.5 - 2°C)
        dew_point_spread = np.clip(
            (100.0 - relative_humidity) * rng.uniform(0.15, 0.35, size=n_samples)
            + rng.normal(0, 0.5, size=n_samples),
            0.1,
            25.0,
        )

        # 3. Moon Parameters
        moon_illumination = rng.uniform(0.0, 1.0, size=n_samples)  # 0 (New) to 1.0 (Full)
        moon_altitude = rng.uniform(-75.0, 85.0, size=n_samples)  # Can be below or above horizon

        # 4. Milky Way Core (Galactic Center) Altitude
        milky_way_core_altitude = rng.uniform(-60.0, 85.0, size=n_samples)

        # 5. Bortle Scale (Light pollution 1 to 9)
        # Discrete integer between 1 and 9, weighted slightly towards suburban/rural
        bortle_scale = rng.choice(
            np.arange(1, 10),
            size=n_samples,
            p=[0.08, 0.12, 0.18, 0.20, 0.16, 0.12, 0.08, 0.04, 0.02],
        )

        # -------------------------------------------------------------
        # Physics-based Ground Truth Target Calculation (Score: 0 to 100)
        # -------------------------------------------------------------
        # Start from ideal sky baseline
        base_score = 100.0

        # A. Cloud penalties:
        # Low and mid clouds cause severe blockage; high cirrus causes blur/glare
        cloud_penalty = (
            (cloud_cover_low * 0.45)
            + (cloud_cover_mid * 0.35)
            + (cloud_cover_high * 0.20)
        )
        # Heavy overcast cliff: if average cloud > 60%, score drops precipitously
        overcast_multiplier = np.where(raw_clouds > 65.0, 1.4, 1.0)
        cloud_penalty = cloud_penalty * overcast_multiplier

        # B. Light Pollution (Bortle Scale) penalty:
        # Bortle 1 = ~0 pt, Bortle 4 = ~12 pts, Bortle 9 = ~45 pts
        bortle_penalty = (bortle_scale - 1) * 5.2

        # C. Lunar interference penalty:
        # Physical law: If moon is below horizon (alt <= 0), it causes ZERO sky brightness!
        # If moon is above horizon, sky brightness is proportional to illumination * sin(alt)
        moon_altitude_rad = np.radians(np.maximum(0.0, moon_altitude))
        effective_moon_flux = moon_illumination * np.sin(moon_altitude_rad)
        moon_penalty = effective_moon_flux * 38.0  # Max ~38 points penalty for high full moon

        # D. Dew Point & Condensation risk penalty:
        # If dew point spread < 2.5°C, high risk of optics fogging and ground mist
        dew_penalty = np.where(
            dew_point_spread < 2.5,
            (2.5 - dew_point_spread) * 4.5,
            0.0,
        )

        # E. Milky Way Bonus for astrophotographers:
        # If core is well above horizon (> 15°), add positive visibility reward
        mw_bonus = np.where(
            milky_way_core_altitude > 15.0,
            np.clip((milky_way_core_altitude - 15.0) * 0.15, 0.0, 8.0),
            0.0,
        )

        # Combine terms
        computed_score = (
            base_score
            - cloud_penalty
            - bortle_penalty
            - moon_penalty
            - dew_penalty
            + mw_bonus
        )

        # Add stochastic natural measurement noise (Gaussian sigma = 2.0)
        noise = rng.normal(0.0, 2.0, size=n_samples)
        stargazing_score = np.clip(computed_score + noise, 0.0, 100.0)

        df = pd.DataFrame(
            {
                "cloud_cover_high": np.round(cloud_cover_high, 1),
                "cloud_cover_mid": np.round(cloud_cover_mid, 1),
                "cloud_cover_low": np.round(cloud_cover_low, 1),
                "relative_humidity": np.round(relative_humidity, 1),
                "dew_point_spread": np.round(dew_point_spread, 2),
                "moon_illumination": np.round(moon_illumination, 4),
                "moon_altitude": np.round(moon_altitude, 2),
                "milky_way_core_altitude": np.round(milky_way_core_altitude, 2),
                "bortle_scale": bortle_scale,
                "stargazing_score": np.round(stargazing_score, 1),
            }
        )

        return df
