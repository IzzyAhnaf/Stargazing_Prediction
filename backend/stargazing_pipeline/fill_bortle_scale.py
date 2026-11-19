"""
Fill bortle_scale using the station's OWN measured data (not a guess from
location name): for each station, take the 90th percentile of its nsb_mean
readings (a proxy for the darkest/clearest-sky conditions that station
actually experiences), then map that to a Bortle class using the standard
SQM-to-Bortle correspondence table (Duriscoe et al. / commonly cited by
dark-sky resources).

Input : stargazing_real_dataset.csv   (output of stage2_enrich_with_weather_astronomy.py)
Output: stargazing_real_dataset_bortled.csv   (ready for train_real.py)
"""
import pandas as pd

INPUT_PATH = "stargazing_real_dataset.csv"
OUTPUT_PATH = "stargazing_real_dataset_bortled.csv"


def nsb_to_bortle(nsb: float) -> int:
    if nsb >= 21.99: return 1
    if nsb >= 21.89: return 2
    if nsb >= 21.69: return 3
    if nsb >= 20.49: return 4
    if nsb >= 19.50: return 5
    if nsb >= 18.95: return 6
    if nsb >= 18.38: return 7
    if nsb >= 17.00: return 8
    return 9


def main():
    df = pd.read_csv(INPUT_PATH, parse_dates=["hour_utc"])

    station_p90 = df.groupby("device_code")["nsb_mean"].quantile(0.90)
    bortle_map = station_p90.apply(nsb_to_bortle)
    df["bortle_scale"] = df["device_code"].map(bortle_map)

    print("Bortle class per station (derived from each station's own p90 nsb_mean):")
    summary = pd.DataFrame({"nsb_p90": station_p90, "bortle_scale": bortle_map}).sort_values("bortle_scale")
    print(summary.to_string())

    df.to_csv(OUTPUT_PATH, index=False)
    print(f"\nSaved {len(df)} rows with bortle_scale filled to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
