"""
Stage 1 (v2, full 2014-2026 range): Parse raw GaN-MN CSV files year-by-year,
filter invalid readings, and aggregate to one row per (device_code, hour).

v2 processes ONE YEAR AT A TIME (extract -> aggregate -> delete raw files)
instead of extracting all 13 years at once, because the raw CSVs for
2016-2026 alone total 10+ GB uncompressed -- most machines (and this
pipeline's original design) don't have room to hold all years extracted
simultaneously.

Input : GaN-MN_<year>.zip files (2014-2026), as distributed by globeatnight.org
Output: ganmn_hourly_aggregated.csv (one row per station per hour, full range)
"""

import glob
import os
import shutil
import zipfile

import pandas as pd

YEARS = list(range(2014, 2027))  # 2014-2026 inclusive
ZIP_DIR = "."          # folder containing GaN-MN_<year>.zip files
WORK_DIR = "_extract_tmp"
PER_YEAR_DIR = "_per_year_hourly"
OUTPUT_PATH = "ganmn_hourly_aggregated.csv"

NSB_MIN_VALID = 10.0
NSB_MAX_VALID = 23.0
USECOLS = ["received_utc", "nsb", "temperature", "device_code"]


def process_year(year: int) -> str | None:
    zip_path = os.path.join(ZIP_DIR, f"GaN-MN_{year}.zip")
    if not os.path.exists(zip_path):
        print(f"{year}: zip not found, skipping ({zip_path})")
        return None

    extract_dir = os.path.join(WORK_DIR, str(year))
    os.makedirs(extract_dir, exist_ok=True)
    with zipfile.ZipFile(zip_path) as z:
        z.extractall(extract_dir)

    files = sorted(glob.glob(os.path.join(extract_dir, "**", "*.csv"), recursive=True))
    print(f"{year}: {len(files)} CSV files found")

    chunks = []
    for f in files:
        try:
            df = pd.read_csv(f, usecols=USECOLS, parse_dates=["received_utc"])
        except Exception as e:
            print(f"  WARN: failed to read {f}: {e}")
            continue
        df = df[(df["nsb"] >= NSB_MIN_VALID) & (df["nsb"] <= NSB_MAX_VALID)]
        df["hour_utc"] = df["received_utc"].dt.floor("h")
        g = (
            df.groupby(["device_code", "hour_utc"])
            .agg(nsb_mean=("nsb", "mean"), n_readings=("nsb", "size"),
                 temperature_mean=("temperature", "mean"))
            .reset_index()
        )
        chunks.append(g)

    shutil.rmtree(extract_dir)  # free disk space immediately after reading

    if not chunks:
        print(f"{year}: no valid data")
        return None

    result = pd.concat(chunks, ignore_index=True)
    result = (
        result.groupby(["device_code", "hour_utc"])
        .agg(nsb_mean=("nsb_mean", "mean"), n_readings=("n_readings", "sum"),
             temperature_mean=("temperature_mean", "mean"))
        .reset_index()
    )
    out_path = os.path.join(PER_YEAR_DIR, f"hourly_{year}.csv")
    result.to_csv(out_path, index=False)
    print(f"{year}: {len(result):,} hourly rows, {result['device_code'].nunique()} stations")
    return out_path


def main():
    os.makedirs(WORK_DIR, exist_ok=True)
    os.makedirs(PER_YEAR_DIR, exist_ok=True)

    per_year_files = []
    for year in YEARS:
        out = process_year(year)
        if out:
            per_year_files.append(out)

    print("\nCombining all years ...")
    dfs = [pd.read_csv(f, parse_dates=["hour_utc"]) for f in per_year_files]
    combined = pd.concat(dfs, ignore_index=True)
    combined = (
        combined.groupby(["device_code", "hour_utc"])
        .agg(nsb_mean=("nsb_mean", "mean"), n_readings=("n_readings", "sum"),
             temperature_mean=("temperature_mean", "mean"))
        .reset_index()
    )
    combined.to_csv(OUTPUT_PATH, index=False)

    shutil.rmtree(WORK_DIR, ignore_errors=True)
    shutil.rmtree(PER_YEAR_DIR, ignore_errors=True)

    print(f"\nDone. {len(combined):,} hourly (station, hour) rows across "
          f"{combined['device_code'].nunique()} stations, "
          f"{combined['hour_utc'].min()} to {combined['hour_utc'].max()}.")


if __name__ == "__main__":
    main()
