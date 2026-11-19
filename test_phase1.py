"""
Phase 1 Validation Script:
Fetches Open-Meteo weather data, calculates celestial ephemeris via ephem,
and integrates Bortle scale data for Stargazing & Milky Way forecasting.
"""

import os
import sys

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Ensure backend modules can be imported
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from backend.app.services.data_pipeline import (
    StargazingDataPipeline,
    get_feature_matrix_columns,
)


def run_phase1_demo():
    print("=" * 80)
    print("🌟 STARGAZING & MILKY WAY FORECAST PREDICTOR - PHASE 1 PIPELINE")
    print("=" * 80)

    # Test coordinate: Mount Bromo, Indonesia (Renowned Stargazing & Milky Way hotspot)
    location_name = "Mount Bromo, East Java, Indonesia"
    latitude = -7.9425
    longitude = 112.9530
    elevation = 2329.0  # meters above sea level

    print(f"\n📍 Target Location: {location_name}")
    print(f"🌐 Coordinates    : Lat {latitude}, Lon {longitude} | Elevation: {elevation}m")
    print("\n⏳ Fetching Open-Meteo weather and calculating celestial ephemeris via ephem...")

    # Execute pipeline
    df = StargazingDataPipeline.execute(
        latitude=latitude,
        longitude=longitude,
        elevation=elevation,
        forecast_days=2,
    )

    print(f"✅ Data pipeline executed successfully! Total hourly records retrieved: {len(df)}")
    print(f"📊 Bortle Classification: Class {df['bortle_scale'].iloc[0]} ({df['bortle_source'].iloc[0]})")
    print(f"📝 {df['bortle_description'].iloc[0]}")

    # Inspect night hours where Sun altitude < 0 (Dusk to Dawn)
    night_df = df[df["sun_altitude"] < 0].copy()

    print("\n" + "=" * 80)
    print("🌌 NIGHT SKY OBSERVATION TIMELINE (Dusk to Dawn Windows)")
    print("=" * 80)

    cols_to_display = [
        "timestamp_utc",
        "sun_altitude",
        "cloud_cover",
        "cloud_cover_high",
        "dew_point_spread",
        "moon_phase_name",
        "moon_illumination",
        "moon_altitude",
        "milky_way_core_altitude",
        "is_astronomical_night",
        "is_milky_way_prime_window",
    ]

    # Display first 12 night hours
    sample_view = night_df[cols_to_display].head(12)
    print(sample_view.to_string(index=False))

    # Highlight prime Milky Way windows
    prime_windows = night_df[night_df["is_milky_way_prime_window"] == True]
    print("\n" + "-" * 80)
    if not prime_windows.empty:
        print(f"✨ Found {len(prime_windows)} Prime Milky Way Astrophotography Hours:")
        for _, row in prime_windows.iterrows():
            print(
                f"   • {row['timestamp_utc']} UTC | MW Alt: {row['milky_way_core_altitude']}° | "
                f"Clouds: {row['cloud_cover']}% | Moon Alt: {row['moon_altitude']}° (Illum: {round(row['moon_illumination']*100, 1)}%)"
            )
    else:
        print("ℹ️ No hours met the strict heuristic criteria (either moon is up or clouds present).")
        print("   The upcoming Phase 2 ML model will produce smooth probabilistic scoring (0-100%).")

    # Display Phase 2 ML Feature Matrix Format
    feature_cols = get_feature_matrix_columns()
    print("\n" + "=" * 80)
    print("🤖 PHASE 2 READY: INPUT FEATURE MATRIX (X) PREVIEW")
    print("=" * 80)
    print(df[feature_cols].head(5).to_string(index=False))

    # Persist sample output for inspection
    output_dir = os.path.join("backend", "app", "data")
    os.makedirs(output_dir, exist_ok=True)
    csv_path = os.path.join(output_dir, "sample_phase1_output.csv")
    df.to_csv(csv_path, index=False)
    print(f"\n💾 Saved full hourly dataset to: {csv_path}")
    print("=" * 80)


if __name__ == "__main__":
    run_phase1_demo()
