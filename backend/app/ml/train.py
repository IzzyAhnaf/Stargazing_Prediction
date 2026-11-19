"""
Model Training Module: Trains an XGBoost Regressor to predict Stargazing Score.
Saves model artifacts and performance evaluation metrics.
"""

import json
import os
from typing import Dict, Any, Tuple
import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
import xgboost as xgb

from backend.app.ml.synthetic_data_generator import SyntheticStargazingDataGenerator
from backend.app.services.data_pipeline import get_feature_matrix_columns


class ModelTrainer:
    """Trains, evaluates, and serializes the XGBoost Stargazing Regressor."""

    def __init__(self, model_dir: str = os.path.dirname(__file__)):
        self.model_dir = model_dir
        self.feature_columns = get_feature_matrix_columns()
        self.target_column = "stargazing_score"
        self.model = None

    def prepare_data(
        self, n_samples: int = 10000
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.Series, pd.Series, pd.Series]:
        """Generates synthetic dataset and splits into 80/10/10 Train/Val/Test."""
        df = SyntheticStargazingDataGenerator.generate_dataset(n_samples=n_samples)
        X = df[self.feature_columns]
        y = df[self.target_column]

        X_train, X_temp, y_train, y_temp = train_test_split(
            X, y, test_size=0.20, random_state=42
        )
        X_val, X_test, y_val, y_test = train_test_split(
            X_temp, y_temp, test_size=0.50, random_state=42
        )

        return X_train, X_val, X_test, y_train, y_val, y_test

    def train(self, n_samples: int = 10000) -> Dict[str, Any]:
        """Executes model training and returns validation/test metrics."""
        X_train, X_val, X_test, y_train, y_val, y_test = self.prepare_data(n_samples=n_samples)

        self.model = xgb.XGBRegressor(
            n_estimators=250,
            learning_rate=0.04,
            max_depth=5,
            subsample=0.85,
            colsample_bytree=0.85,
            random_state=42,
            objective="reg:squarederror",
            n_jobs=-1,
        )

        # Train model with early stopping monitoring validation set
        self.model.fit(
            X_train,
            y_train,
            eval_set=[(X_val, y_val)],
            verbose=False,
        )

        # Evaluate on test set
        y_pred = self.model.predict(X_test)
        # Ensure predicted scores stay within valid [0, 100] range
        y_pred = np.clip(y_pred, 0.0, 100.0)

        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        r2 = r2_score(y_test, y_pred)

        metrics = {
            "r2_score": round(float(r2), 4),
            "mae": round(float(mae), 3),
            "rmse": round(float(rmse), 3),
            "train_samples": len(X_train),
            "val_samples": len(X_val),
            "test_samples": len(X_test),
        }

        self.save_artifacts(metrics)
        return metrics

    def save_artifacts(self, metrics: Dict[str, Any]) -> None:
        """Saves trained model file and metadata."""
        os.makedirs(self.model_dir, exist_ok=True)
        model_json_path = os.path.join(self.model_dir, "stargazing_xgb_model.json")
        model_joblib_path = os.path.join(self.model_dir, "stargazing_xgb_model.joblib")
        metadata_path = os.path.join(self.model_dir, "model_metadata.json")

        self.model.save_model(model_json_path)
        joblib.dump(self.model, model_joblib_path)

        metadata = {
            "features": self.feature_columns,
            "target": self.target_column,
            "metrics": metrics,
            "model_type": "XGBRegressor",
        }
        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)


if __name__ == "__main__":
    trainer = ModelTrainer()
    results = trainer.train()
    print("Training Complete! Test Set Performance:")
    print(f"R² Score : {results['r2_score']}")
    print(f"MAE      : {results['mae']} pts")
    print(f"RMSE     : {results['rmse']} pts")
