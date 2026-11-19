"""
train_real.py — pengganti train.py lama (yang pakai SyntheticStargazingDataGenerator).

Melatih XGBoost Regressor memakai dataset REAL: observasi Sky Quality Meter
GaN-MN (2024-2025, 45 stasiun) + cuaca historis asli Open-Meteo + astronomi
eksak dari ephem + bortle_scale yang diturunkan dari pembacaan SQM masing-
masing stasiun sendiri (lihat fill_bortle_scale.py).

Letakkan file ini di app/ml/ (sejajar dengan train.py & model_metadata.json
yang lama), lalu jalankan:

    pip install xgboost pandas scikit-learn
    python train_real.py

Catatan performa yang DIHARAPKAN (sudah divalidasi lewat sanity-check
RandomForest di luar skrip ini): R^2 sekitar 0.6-0.75, MAE sekitar 10-13.
Ini JAUH lebih rendah dari versi sintetis (R^2 0.976, MAE 3.2) -- itu
justru pertanda sehat: model sekarang belajar dari noise dan variasi dunia
nyata, bukan menghafal rumus buatan sendiri.
"""

import json

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from xgboost import XGBRegressor

DATA_PATH = "stargazing_real_dataset_bortled.csv"
MODEL_OUT = "model_stargazing_xgb_real.json"
METADATA_OUT = "model_metadata_real.json"

FEATURES = [
    "cloud_cover_high", "cloud_cover_mid", "cloud_cover_low",
    "relative_humidity", "dew_point_spread", "moon_illumination",
    "moon_altitude", "milky_way_core_altitude", "bortle_scale",
]
TARGET = "stargazing_score"


def main():
    df = pd.read_csv(DATA_PATH)
    X = df[FEATURES]
    y = df[TARGET]

    # Same 80/10/10 split convention as the original train.py
    X_train, X_temp, y_train, y_temp = train_test_split(X, y, test_size=0.20, random_state=42)
    X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.50, random_state=42)

    model = XGBRegressor(
        n_estimators=250,
        learning_rate=0.04,
        max_depth=5,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        eval_metric="mae",
    )
    model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        verbose=False,
    )

    pred = np.clip(model.predict(X_test), 0, 100)
    mae = mean_absolute_error(y_test, pred)
    rmse = np.sqrt(mean_squared_error(y_test, pred))
    r2 = r2_score(y_test, pred)

    print(f"Test MAE : {mae:.3f}")
    print(f"Test RMSE: {rmse:.3f}")
    print(f"Test R2  : {r2:.4f}")

    print("\nFeature importances:")
    for f, imp in sorted(zip(FEATURES, model.feature_importances_), key=lambda x: -x[1]):
        print(f"  {f}: {imp:.3f}")

    model.save_model(MODEL_OUT)

    metadata = {
        "features": FEATURES,
        "target": TARGET,
        "metrics": {
            "r2_score": round(float(r2), 3),
            "mae": round(float(mae), 3),
            "rmse": round(float(rmse), 3),
            "train_samples": len(X_train),
            "val_samples": len(X_val),
            "test_samples": len(X_test),
        },
        "model_type": "XGBRegressor",
        "data_source": "GaN-MN (globeatnight.org) 2024-2025, 45 stations, "
                        "weather from Open-Meteo Archive API, astronomy from ephem, "
                        "bortle_scale derived from each station's own p90 nsb_mean",
    }
    with open(METADATA_OUT, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"\nSaved {MODEL_OUT} and {METADATA_OUT}")


if __name__ == "__main__":
    main()
