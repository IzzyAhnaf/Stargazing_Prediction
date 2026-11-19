"""
compare_models.py — membandingkan 4 model pada dataset real yang sama,
dengan split train/val/test yang identik (random_state=42) supaya hasilnya
benar-benar adil dibandingkan.

Sudah divalidasi untuk Linear Regression, Ridge, dan Random Forest (lihat
README untuk angka hasilnya). XGBoost perlu dijalankan di komputer Anda
sendiri karena library-nya tidak tersedia di lingkungan yang dipakai untuk
menyiapkan pipeline ini.

    pip install pandas scikit-learn xgboost
    python compare_models.py
"""

import json

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

try:
    from xgboost import XGBRegressor
    HAS_XGB = True
except ImportError:
    HAS_XGB = False
    print("xgboost belum terinstall -- jalankan `pip install xgboost` untuk menyertakannya.\n")

DATA_PATH = "stargazing_real_dataset_bortled.csv"
OUTPUT_PATH = "comparison_results.json"

FEATURES = [
    "cloud_cover_high", "cloud_cover_mid", "cloud_cover_low",
    "relative_humidity", "dew_point_spread", "moon_illumination",
    "moon_altitude", "milky_way_core_altitude", "bortle_scale",
]
TARGET = "stargazing_score"


def evaluate(name, model, X_train, y_train, X_test, y_test, results):
    model.fit(X_train, y_train)
    pred = np.clip(model.predict(X_test), 0, 100)
    mae = mean_absolute_error(y_test, pred)
    rmse = np.sqrt(mean_squared_error(y_test, pred))
    r2 = r2_score(y_test, pred)
    results[name] = {"MAE": round(float(mae), 3), "RMSE": round(float(rmse), 3), "R2": round(float(r2), 4)}
    print(f"{name:20s} MAE={mae:7.3f}  RMSE={rmse:7.3f}  R2={r2:.4f}")


def main():
    df = pd.read_csv(DATA_PATH)
    X, y = df[FEATURES], df[TARGET]

    X_train, X_temp, y_train, y_temp = train_test_split(X, y, test_size=0.20, random_state=42)
    X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.50, random_state=42)

    print(f"train={len(X_train)}  val={len(X_val)}  test={len(X_test)}\n")

    results = {}
    evaluate("Linear Regression", LinearRegression(), X_train, y_train, X_test, y_test, results)
    evaluate("Ridge Regression", Ridge(alpha=1.0), X_train, y_train, X_test, y_test, results)
    evaluate("Random Forest", RandomForestRegressor(n_estimators=200, max_depth=12, random_state=42, n_jobs=-1),
              X_train, y_train, X_test, y_test, results)

    if HAS_XGB:
        xgb = XGBRegressor(n_estimators=250, learning_rate=0.04, max_depth=5,
                            subsample=0.8, colsample_bytree=0.8, random_state=42)
        evaluate("XGBoost", xgb, X_train, y_train, X_test, y_test, results)

    with open(OUTPUT_PATH, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved comparison to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
