"""
Stage 2 (v3): Enrich hourly GaN-MN aggregates with REAL weather (Open-Meteo
Archive API) and REAL astronomy (ephem).

v3 changes vs v2:
  - v2 fetched weather for a station's ENTIRE date range in ONE API call.
    For stations spanning many years (44 of 51 stations span >365 days,
    several span 10+ years), this silently returned fewer rows than
    expected -- likely an undocumented response-size/range limit on
    Open-Meteo's side. Result: only 299,076 of the expected 830,453 rows
    survived the merge in the v2 run.
  - v3 fetches weather ONE CALENDAR YEAR AT A TIME per station, then
    concatenates. This avoids whatever limit was truncating long-range
    requests, at the cost of more API calls (but still very manageable:
    ~51 stations x a handful of active years each = a few hundred calls,
    not thousands).
  - Cache directory renamed to cache_v3/ so this never gets confused with
    (or silently reuses) the v2 cache, which is known to be incomplete.

Requires internet access and the `ephem` package.
    pip install pandas requests ephem

Usage:
    python stage2_enrich_with_weather_astronomy.py
"""

import math
import os
import time
from datetime import datetime

import ephem
import pandas as pd
import requests

AGG_PATH = "ganmn_hourly_aggregated.csv"
COORDS_PATH = "station_coordinates.csv"
OUTPUT_PATH = "stargazing_real_dataset.csv"
CACHE_DIR = "cache_v3"

MAX_RETRIES = 5
BASE_BACKOFF_SECONDS = 3
DELAY_BETWEEN_CALLS_SECONDS = 1.0

SCORE_NSB_FLOOR = 17.0
SCORE_NSB_CEIL = 22.0

GALACTIC_CENTER_RA = "17:45:40.04"
GALACTIC_CENTER_DEC = "-29:00:28.1"


def nsb_to_score(nsb: float) -> float:
    pct = (nsb - SCORE_NSB_FLOOR) / (SCORE_NSB_CEIL - SCORE_NSB_FLOOR)
    return round(max(0.0, min(100.0, pct * 100.0)), 1)


def fetch_weather_chunk(lat: float, lon: float, start_date: str, end_date: str) -> pd.DataFrame:
    """One Open-Meteo Archive API call for a SHORT date range (<= 1 calendar
    year), with retry/backoff for transient connection errors."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start_date,
        "end_date": end_date,
        "hourly": ["cloud_cover_low", "cloud_cover_mid", "cloud_cover_high",
                   "relative_humidity_2m", "dew_point_2m", "temperature_2m"],
        "timezone": "UTC",
    }
    last_err = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.get(
                "https://archive-api.open-meteo.com/v1/archive",
                params=params, timeout=60,
                headers={"Connection": "close"},
            )
            resp.raise_for_status()
            hourly = resp.json().get("hourly", {})
            df = pd.DataFrame(hourly)
            if df.empty:
                return df
            df["hour_utc"] = pd.to_datetime(df["time"])
            return df.drop(columns=["time"])
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
            last_err = e
            wait = BASE_BACKOFF_SECONDS * (2 ** (attempt - 1))
            print(f"      attempt {attempt}/{MAX_RETRIES} failed ({e.__class__.__name__}), retrying in {wait}s ...")
            time.sleep(wait)
    raise RuntimeError(f"Failed after {MAX_RETRIES} attempts: {last_err}")


def fetch_weather_for_station(lat: float, lon: float, start_date: str, end_date: str) -> pd.DataFrame:
    """Splits the station's full date range into calendar-year chunks and
    fetches each separately, to avoid the truncation seen with multi-year
    single requests."""
    start_year = int(start_date[:4])
    end_year = int(end_date[:4])

    chunks = []
    for year in range(start_year, end_year + 1):
        chunk_start = f"{year}-01-01" if year != start_year else start_date
        chunk_end = f"{year}-12-31" if year != end_year else end_date
        print(f"    fetching {chunk_start} to {chunk_end} ...")
        chunk = fetch_weather_chunk(lat, lon, chunk_start, chunk_end)
        if not chunk.empty:
            chunks.append(chunk)
        time.sleep(DELAY_BETWEEN_CALLS_SECONDS)

    if not chunks:
        return pd.DataFrame(columns=["hour_utc"])
    return pd.concat(chunks, ignore_index=True)


def astronomy_for_row(lat: float, lon: float, dt_utc: datetime) -> dict:
    obs = ephem.Observer()
    obs.lat, obs.lon = str(lat), str(lon)
    obs.date = ephem.Date(dt_utc)

    moon = ephem.Moon(obs)
    moon_alt = math.degrees(moon.alt)
    moon_illum = moon.phase / 100.0

    gc = ephem.FixedBody()
    gc._ra, gc._dec, gc._epoch = ephem.hours(GALACTIC_CENTER_RA), ephem.degrees(GALACTIC_CENTER_DEC), ephem.J2000
    gc.compute(obs)
    mw_alt = math.degrees(gc.alt)

    return {"moon_altitude": round(moon_alt, 2), "moon_illumination": round(moon_illum, 4),
            "milky_way_core_altitude": round(mw_alt, 2)}


def process_station(code: str, lat: float, lon: float, sub: pd.DataFrame) -> pd.DataFrame:
    start_date = sub["hour_utc"].min().strftime("%Y-%m-%d")
    end_date = sub["hour_utc"].max().strftime("%Y-%m-%d")
    print(f"Fetching weather for {code} ({start_date} to {end_date}) ...")

    weather = fetch_weather_for_station(lat, lon, start_date, end_date)
    if weather.empty:
        raise RuntimeError("No weather data returned for any year chunk")

    merged = sub.merge(weather, on="hour_utc", how="inner")
    print(f"    GaN-MN rows: {len(sub)}  Weather rows: {len(weather)}  Merged: {len(merged)}")

    astro_records = [astronomy_for_row(lat, lon, ts.to_pydatetime()) for ts in merged["hour_utc"]]
    astro_df = pd.DataFrame(astro_records)
    merged = pd.concat([merged.reset_index(drop=True), astro_df], axis=1)

    merged["dew_point_spread"] = merged["temperature_2m"] - merged["dew_point_2m"]
    merged["bortle_scale"] = None
    merged["stargazing_score"] = merged["nsb_mean"].apply(nsb_to_score)
    merged["device_code"] = code
    return merged


def main():
    os.makedirs(CACHE_DIR, exist_ok=True)

    agg = pd.read_csv(AGG_PATH, parse_dates=["hour_utc"])
    coords = pd.read_csv(COORDS_PATH)
    coords = coords[coords["confidence"] != "unmapped"].dropna(subset=["latitude", "longitude"])

    stations_total = len(coords)
    for i, (_, station) in enumerate(coords.iterrows(), 1):
        code = station["device_code"]
        cache_path = os.path.join(CACHE_DIR, f"{code}.csv")

        if os.path.exists(cache_path):
            print(f"[{i}/{stations_total}] {code}: already cached (v3), skipping.")
            continue

        sub = agg[agg["device_code"] == code]
        if sub.empty:
            continue

        try:
            merged = process_station(code, station["latitude"], station["longitude"], sub)
            merged.to_csv(cache_path, index=False)
            print(f"[{i}/{stations_total}] {code}: done, {len(merged)} rows cached.")
        except RuntimeError as e:
            print(f"[{i}/{stations_total}] {code}: SKIPPED after repeated failures ({e}). "
                  f"Re-run the script later to retry this station.")

    cached_files = [os.path.join(CACHE_DIR, f) for f in os.listdir(CACHE_DIR) if f.endswith(".csv")]
    if not cached_files:
        print("No stations succeeded yet -- nothing to combine.")
        return

    final = pd.concat([pd.read_csv(f) for f in cached_files], ignore_index=True)
    final = final.rename(columns={"relative_humidity_2m": "relative_humidity"})
    final.to_csv(OUTPUT_PATH, index=False)
    print(f"\nDone. {len(final):,} real training rows from {len(cached_files)}/{stations_total} stations "
          f"written to {OUTPUT_PATH}")
    if len(cached_files) < stations_total:
        print(f"{stations_total - len(cached_files)} station(s) still missing -- just run this script again, "
              f"it will only retry the ones that failed.")


if __name__ == "__main__":
    main()
