"""
Explainable AI (XAI) Engine using SHAP (SHapley Additive exPlanations).
Computes exact Shapley values for XGBoost predictions and translates them
into natural language insights for stargazers and astrophotographers.
"""

from typing import Any, Dict, List, Tuple
import numpy as np
import pandas as pd
import shap


class StargazingSHAPExplainer:
    """Explains Stargazing Score predictions using SHAP TreeExplainer."""

    FEATURE_FRIENDLY_NAMES = {
        "en": {
            "cloud_cover_high": "High Cloud Cover (Cirrus)",
            "cloud_cover_mid": "Mid-Level Cloud Cover",
            "cloud_cover_low": "Low-Level Cloud Cover",
            "relative_humidity": "Relative Humidity",
            "dew_point_spread": "Dew Point Spread (Condensation Risk)",
            "moon_illumination": "Moon Illumination",
            "moon_altitude": "Moon Sky Altitude",
            "milky_way_core_altitude": "Milky Way Core Altitude",
            "bortle_scale": "Bortle Dark-Sky Scale",
        },
        "id": {
            "cloud_cover_high": "Tutupan Awan Tinggi (Cirrus)",
            "cloud_cover_mid": "Tutupan Awan Menengah",
            "cloud_cover_low": "Tutupan Awan Rendah",
            "relative_humidity": "Kelembapan Relatif",
            "dew_point_spread": "Selisih Titik Embun (Risiko Kondensasi)",
            "moon_illumination": "Tingkat Terang Bulan",
            "moon_altitude": "Ketinggian Bulan di Langit",
            "milky_way_core_altitude": "Ketinggian Inti Bima Sakti",
            "bortle_scale": "Skala Langit Gelap Bortle",
        },
    }

    VERDICTS = {
        "en": {
            "exceptional": "Exceptional Stargazing Window: Sky is clear, dark, and highly transparent.",
            "good": "Good Stargazing Window: Suitable for observation with minor atmospheric trade-offs.",
            "fair": "Fair/Mediocre Sky: Some celestial targets visible, but conditions are suboptimal.",
            "poor": "Poor Stargazing Conditions: Severe degradation from clouds, moonlight, or light pollution.",
        },
        "id": {
            "exceptional": "Langitnya lagi mantap banget: cerah, gelap, dan super jernih.",
            "good": "Langitnya lumayan bagus, oke buat ngamatin dengan sedikit gangguan atmosfer.",
            "fair": "Langitnya biasa aja: beberapa objek masih kelihatan, tapi kondisinya kurang ideal.",
            "poor": "Kondisinya kurang mendukung: ketutup parah sama awan, cahaya bulan, atau polusi cahaya.",
        },
    }

    def __init__(self, model):
        self.model = model
        self.explainer = shap.TreeExplainer(model)
        # Expected baseline score (safe scalar extraction)
        exp_val = self.explainer.expected_value
        if isinstance(exp_val, (np.ndarray, list)):
            self.expected_value = float(np.atleast_1d(exp_val)[0])
        else:
            self.expected_value = float(exp_val)

    @staticmethod
    def _norm_lang(lang: str) -> str:
        return "id" if str(lang).lower().startswith("id") else "en"

    def _generate_factor_narrative(
        self, feature: str, value: float, shap_val: float, lang: str = "en"
    ) -> str:
        """Translates a single feature's SHAP value into a human-readable sentence."""
        pts = abs(round(shap_val, 1))

        if lang == "id":
            if feature == "cloud_cover_high":
                if shap_val < 0:
                    return f"Awan cirrus tinggi ({value:.0f}%) bikin cahaya bintang jadi buram (-{pts} poin)"
                return f"Langit bagian atas cerah, awan tingginya tipis banget (+{pts} poin)"

            elif feature == "cloud_cover_mid":
                if shap_val < 0:
                    return f"Awan menengah ({value:.0f}%) ganggu kejernihan langit (-{pts} poin)"
                return f"Langit bagian tengah cerah (+{pts} poin)"

            elif feature == "cloud_cover_low":
                if shap_val < 0:
                    return f"Awan rendah lagi tebal ({value:.0f}%), jadi pandangan kehalang (-{pts} poin)"
                return f"Langit bagian bawah bersih dari awan stratokumulus (+{pts} poin)"

            elif feature == "bortle_scale":
                b_class = int(value)
                if shap_val < 0:
                    return f"Polusi cahaya kota (Bortle Kelas {b_class}) bikin langit jadi samar (-{pts} poin)"
                return f"Langitnya masih gelap (Bortle Kelas {b_class}), polusi cahaya rendah (+{pts} poin)"

            elif feature in ("moon_illumination", "moon_altitude"):
                if shap_val < 0:
                    return f"Cahaya bulan lagi silau, jadi bintang redup ikut keganggu (-{pts} poin)"
                return f"Langit malamnya gelap: bulan lagi terbenam atau gak ganggu (+{pts} poin)"

            elif feature == "dew_point_spread":
                if shap_val < 0:
                    return f"Selisih titik embun sempit ({value:.1f}°C), risiko lensa berembun tinggi (-{pts} poin)"
                return f"Selisih titik embun lebar ({value:.1f}°C), udaranya kering dan jernih (+{pts} poin)"

            elif feature == "relative_humidity":
                if shap_val < 0:
                    return f"Udaranya lembap ({value:.0f}%), jadi cahaya gampang berhamburan (-{pts} poin)"
                return f"Kelembapannya pas ({value:.0f}%) (+{pts} poin)"

            elif feature == "milky_way_core_altitude":
                if shap_val > 0:
                    return f"Inti Bima Sakti lagi di posisi bagus, {value:.1f}° di atas cakrawala (+{pts} poin)"
                return f"Inti Bima Sakti-nya rendah atau malah di bawah cakrawala (-{pts} poin)"

            friendly = self.FEATURE_FRIENDLY_NAMES["id"].get(feature, feature)
            sign = "+" if shap_val > 0 else "-"
            return f"{friendly}: {value:.1f} ({sign}{pts} poin)"

        # English (default / fallthrough)
        if feature == "cloud_cover_high":
            if shap_val < 0:
                return f"High cirrus clouds ({value:.0f}%) diffusing starlight (-{pts} pts)"
            return f"Clear upper atmosphere with minimal high clouds (+{pts} pts)"

        elif feature == "cloud_cover_mid":
            if shap_val < 0:
                return f"Mid-level cloud cover ({value:.0f}%) obstructing sky clarity (-{pts} pts)"
            return f"Clear mid-troposphere (+{pts} pts)"

        elif feature == "cloud_cover_low":
            if shap_val < 0:
                return f"Heavy low clouds ({value:.0f}%) blocking visibility (-{pts} pts)"
            return f"Low atmosphere clear of stratocumulus clouds (+{pts} pts)"

        elif feature == "bortle_scale":
            b_class = int(value)
            if shap_val < 0:
                return f"Urban light pollution wash-out (Bortle Class {b_class}) (-{pts} pts)"
            return f"Dark-sky preservation (Bortle Class {b_class}) with low light pollution (+{pts} pts)"

        elif feature in ("moon_illumination", "moon_altitude"):
            if shap_val < 0:
                return f"Moonlight skyglow glare interfering with faint stars (-{pts} pts)"
            return f"Dark night sky: Moon is down or non-interfering (+{pts} pts)"

        elif feature == "dew_point_spread":
            if shap_val < 0:
                return f"Narrow dew point spread ({value:.1f}°C) poses high optics fogging risk (-{pts} pts)"
            return f"Wide dew point spread ({value:.1f}°C) ensures dry, crisp air (+{pts} pts)"

        elif feature == "relative_humidity":
            if shap_val < 0:
                return f"High air humidity ({value:.0f}%) causing light scatter (-{pts} pts)"
            return f"Comfortable relative humidity ({value:.0f}%) (+{pts} pts)"

        elif feature == "milky_way_core_altitude":
            if shap_val > 0:
                return f"Milky Way galactic core elevated nicely at {value:.1f}° (+{pts} pts)"
            return f"Milky Way galactic core low or below horizon (-{pts} pts)"

        friendly = self.FEATURE_FRIENDLY_NAMES["en"].get(feature, feature)
        sign = "+" if shap_val > 0 else "-"
        return f"{friendly}: {value:.1f} ({sign}{pts} pts)"

    def explain_instance(
        self, feature_row: pd.Series, predicted_score: float, lang: str = "en"
    ) -> Dict[str, Any]:
        """
        Explain a single hourly prediction.
        Returns top positive factors, top negative factors, and narrative summary,
        written in `lang` ("en" or "id").
        """
        lang = self._norm_lang(lang)
        X_single = pd.DataFrame([feature_row])
        shap_values = self.explainer.shap_values(X_single)[0]

        # Pair features with values and SHAP contributions
        contributions = []
        for feat, shap_val in zip(feature_row.index, shap_values):
            contributions.append(
                {
                    "feature": feat,
                    "value": float(feature_row[feat]),
                    "shap_value": float(shap_val),
                }
            )

        # Sort contributions by absolute impact
        contributions_sorted = sorted(
            contributions, key=lambda x: abs(x["shap_value"]), reverse=True
        )

        positive_reasons = []
        negative_reasons = []

        for item in contributions_sorted:
            feat = item["feature"]
            val = item["value"]
            s_val = item["shap_value"]

            # Filter out near-zero noise (|shap| >= 1.0)
            if abs(s_val) >= 1.0:
                sentence = self._generate_factor_narrative(feat, val, s_val, lang=lang)
                if s_val > 0:
                    positive_reasons.append(sentence)
                else:
                    negative_reasons.append(sentence)

        # Determine primary driver
        strongest = contributions_sorted[0]
        primary_driver = self._generate_factor_narrative(
            strongest["feature"], strongest["value"], strongest["shap_value"], lang=lang
        )

        # Verdict summary
        verdicts = self.VERDICTS[lang]
        if predicted_score >= 80:
            verdict = verdicts["exceptional"]
        elif predicted_score >= 60:
            verdict = verdicts["good"]
        elif predicted_score >= 40:
            verdict = verdicts["fair"]
        else:
            verdict = verdicts["poor"]

        return {
            "predicted_score": round(float(predicted_score), 1),
            "base_score": round(self.expected_value, 1),
            "primary_driver": primary_driver,
            "verdict": verdict,
            "positive_factors": positive_reasons[:4],
            "negative_factors": negative_reasons[:4],
            "feature_shap_values": {
                item["feature"]: round(item["shap_value"], 2) for item in contributions
            },
        }

    def explain_batch(
        self, features_df: pd.DataFrame, predicted_scores: np.ndarray, lang: str = "en"
    ) -> List[Dict[str, Any]]:
        """Explain predictions for a batch of hourly observations, in `lang`."""
        lang = self._norm_lang(lang)
        results = []
        for i in range(len(features_df)):
            row = features_df.iloc[i]
            score = predicted_scores[i]
            results.append(self.explain_instance(row, score, lang=lang))
        return results
