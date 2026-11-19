"""
Phase 2 Validation Script:
1. Trains the XGBoost Regressor model on synthetic physics-informed data.
2. Evaluates performance metrics (R², MAE, RMSE).
3. Tests SHAP TreeExplainer and natural language insights.
4. Executes full inference pipeline on live Mount Bromo data from Phase 1.
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

from backend.app.ml.train import ModelTrainer
from backend.app.ml.predictor import StargazingPredictor
from backend.app.services.data_pipeline import StargazingDataPipeline


def run_phase2_demo():
    print("=" * 80)
    print("🤖 STARGAZING & MILKY WAY FORECAST PREDICTOR - PHASE 2 ML ENGINE")
    print("=" * 80)

    # ---------------------------------------------------------
    # Step 1: Model Training & Evaluation
    # ---------------------------------------------------------
    print("\n📦 STEP 1: TRAINING XGBOOST REGRESSOR ON PHYSICS-INFORMED SYNTHETIC DATA...")
    trainer = ModelTrainer()
    metrics = trainer.train(n_samples=10000)

    print("✅ Model Training Complete!")
    print(f"   • Train Samples     : {metrics['train_samples']}")
    print(f"   • Validation Samples: {metrics['val_samples']}")
    print(f"   • Test Set R² Score : {metrics['r2_score']} (Target >= 0.95)")
    print(f"   • Test Set MAE      : {metrics['mae']} pts")
    print(f"   • Test Set RMSE     : {metrics['rmse']} pts")

    # ---------------------------------------------------------
    # Step 2: Initialize Inference & SHAP Explainer
    # ---------------------------------------------------------
    print("\n🔍 STEP 2: INITIALIZING INFERENCE ENGINE & SHAP TREE-EXPLAINER...")
    predictor = StargazingPredictor.get_instance()
    print(f"   • SHAP Explainer Baseline Expected Value: {round(predictor.explainer.expected_value, 2)} pts")

    # ---------------------------------------------------------
    # Step 3: Run Inference & SHAP on Live Phase 1 Mount Bromo Data
    # ---------------------------------------------------------
    print("\n🌌 STEP 3: RUNNING ML PREDICTION & SHAP EXPLANATIONS ON REAL MOUNT BROMO DATA...")
    bromo_df = StargazingDataPipeline.execute(
        latitude=-7.9425,
        longitude=112.9530,
        elevation=2329.0,
        forecast_days=2,
    )

    # Run inference and SHAP explainability
    scored_df = predictor.predict(bromo_df, explain=True)

    # Focus on night hours (Sun Altitude < 0)
    night_scored = scored_df[scored_df["sun_altitude"] < 0].copy()

    print("\n" + "=" * 80)
    print("🔭 PREDICTED NIGHT SKY TIMELINE WITH ML RATINGS")
    print("=" * 80)
    display_cols = [
        "timestamp_utc",
        "cloud_cover",
        "dew_point_spread",
        "moon_altitude",
        "milky_way_core_altitude",
        "stargazing_score",
        "rating_category",
    ]
    print(night_scored[display_cols].head(10).to_string(index=False))

    # ---------------------------------------------------------
    # Step 4: Deep Dive SHAP Explanations (Best vs Worst Hour)
    # ---------------------------------------------------------
    best_row = night_scored.sort_values(by="stargazing_score", ascending=False).iloc[0]
    worst_row = night_scored.sort_values(by="stargazing_score", ascending=True).iloc[0]

    print("\n" + "=" * 80)
    print("💡 EXPLAINABLE AI (SHAP) CASE STUDIES")
    print("=" * 80)

    # Best Window Case
    best_exp = best_row["explanation"]
    print(f"\n🌟 HIGHEST RATED OBSERVATION WINDOW:")
    print(f"   Timestamp      : {best_row['timestamp_utc']} UTC")
    print(f"   Predicted Score: {best_row['stargazing_score']} / 100 ({best_row['rating_category']})")
    print(f"   Verdict        : {best_exp['verdict']}")
    print(f"   Primary Driver : {best_exp['primary_driver']}")
    if best_exp["positive_factors"]:
        print("   ✅ Positive Drivers:")
        for factor in best_exp["positive_factors"]:
            print(f"      + {factor}")
    if best_exp["negative_factors"]:
        print("   ⚠️ Negative Drags:")
        for factor in best_exp["negative_factors"]:
            print(f"      - {factor}")

    # Worst Window Case
    worst_exp = worst_row["explanation"]
    print(f"\n🌧️ LOWEST RATED OBSERVATION WINDOW:")
    print(f"   Timestamp      : {worst_row['timestamp_utc']} UTC")
    print(f"   Predicted Score: {worst_row['stargazing_score']} / 100 ({worst_row['rating_category']})")
    print(f"   Verdict        : {worst_exp['verdict']}")
    print(f"   Primary Driver : {worst_exp['primary_driver']}")
    if worst_exp["negative_factors"]:
        print("   ⚠️ Negative Drags:")
        for factor in worst_exp["negative_factors"]:
            print(f"      - {factor}")
    if worst_exp["positive_factors"]:
        print("   ✅ Positive Drivers:")
        for factor in worst_exp["positive_factors"]:
            print(f"      + {factor}")

    # Feature Importance via Mean Absolute SHAP values
    print("\n" + "=" * 80)
    print("📊 GLOBAL FEATURE IMPORTANCE (FROM TEST SET)")
    print("=" * 80)
    feature_importances = trainer.model.feature_importances_
    features = trainer.feature_columns
    feat_imp = sorted(zip(features, feature_importances), key=lambda x: x[1], reverse=True)
    for feat, imp in feat_imp:
        bar = "█" * int(imp * 40)
        print(f"   {feat:<25} : {imp*100:5.2f}% {bar}")

    print("\n" + "=" * 80)
    print("🎉 PHASE 2 COMPLETE: ML Model & SHAP Explainer are ready for FastAPI Backend (Phase 3)!")
    print("=" * 80)


if __name__ == "__main__":
    run_phase2_demo()
