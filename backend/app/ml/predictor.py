"""
ML Inference Service: Loads trained XGBoost model and SHAP Explainer
to provide real-time Stargazing Score predictions and explainability payloads.
"""

import os
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd
import xgboost as xgb

from backend.app.ml.explainer import StargazingSHAPExplainer
from backend.app.services.data_pipeline import get_feature_matrix_columns


class StargazingPredictor:
    """Singleton-style predictor for XGBoost model inference & SHAP explanation."""

    _instance: Optional["StargazingPredictor"] = None

    def __init__(self, model_path: Optional[str] = None):
        if model_path is None:
            model_path = os.path.join(os.path.dirname(__file__), "stargazing_xgb_model.json")

        self.model_path = model_path
        self.feature_columns = get_feature_matrix_columns()
        self.model = xgb.XGBRegressor()
        self.model.load_model(self.model_path)
        self.explainer = StargazingSHAPExplainer(self.model)

    @classmethod
    def get_instance(cls, model_path: Optional[str] = None) -> "StargazingPredictor":
        """Thread-safe singleton accessor."""
        if cls._instance is None:
            cls._instance = StargazingPredictor(model_path)
        return cls._instance

    def predict(
        self, input_df: pd.DataFrame, explain: bool = True, lang: str = "en"
    ) -> pd.DataFrame:
        """
        Run inference on input DataFrame containing meteorological and astronomical features.
        Returns the original DataFrame enriched with:
        - 'stargazing_score' (0.0 to 100.0)
        - 'rating_category' ('Poor', 'Fair', 'Good', 'Excellent') — always this
          fixed English enum, regardless of `lang`, since callers (including
          the frontend) match against these exact values.
        - 'explanation' (dict containing SHAP breakdown and drivers, written
          in `lang`: "en" or "id")
        """
        X = input_df[self.feature_columns].copy()

        # Handle missing values if any
        X = X.fillna(X.median())

        raw_preds = self.model.predict(X)
        clipped_scores = [round(float(s), 1) for s in np.clip(raw_preds, 0.0, 100.0)]

        result_df = input_df.copy()
        result_df["stargazing_score"] = clipped_scores

        # Rating categorization
        categories = []
        for s in result_df["stargazing_score"]:
            if s >= 80.0:
                categories.append("Excellent")
            elif s >= 65.0:
                categories.append("Good")
            elif s >= 45.0:
                categories.append("Fair")
            else:
                categories.append("Poor")
        result_df["rating_category"] = categories

        if explain:
            explanations = self.explainer.explain_batch(X, clipped_scores, lang=lang)
            result_df["explanation"] = explanations

        return result_df
