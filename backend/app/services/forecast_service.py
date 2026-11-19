"""
Forecast Application Service:
Coordinates data pipeline, ML inference, SHAP explainability,
and synthesizes high-level summary & best visit windows for the API.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import pandas as pd

from backend.app.ml.predictor import StargazingPredictor
from backend.app.schemas.stargazing import (
    BestVisitWindow,
    ForecastSummary,
    HourlyForecastItem,
    LocationMetadata,
    MoonSummary,
    SHAPExplanationPayload,
    StargazingRequest,
    StargazingResponse,
)
from backend.app.services.data_pipeline import StargazingDataPipeline


def _norm_lang(lang: Optional[str]) -> str:
    return "id" if str(lang).lower().startswith("id") else "en"


class ForecastService:
    @classmethod
    def generate_forecast(cls, request: StargazingRequest) -> StargazingResponse:
        """
        Executes end-to-end forecasting:
        1. Ingests raw weather + ephemeris + Bortle data (Phase 1)
        2. Executes XGBoost Regressor and SHAP TreeExplainer (Phase 2)
        3. Formulates executive stargazing windows & recommendations (Phase 3)
        """
        # Step 1: Data Pipeline
        df = StargazingDataPipeline.execute(
            latitude=request.latitude,
            longitude=request.longitude,
            elevation=request.elevation or 0.0,
            date=request.date,
            forecast_days=request.forecast_days or 2,
            override_bortle=request.override_bortle,
        )

        if df.empty:
            raise ValueError("No meteorological or astronomical data could be generated.")

        lang = _norm_lang(request.lang)

        # Step 2: ML Inference & SHAP Explainability
        predictor = StargazingPredictor.get_instance()
        scored_df = predictor.predict(df, explain=True, lang=lang)

        # Step 3: Extract Location Metadata
        first_row = scored_df.iloc[0]
        location_meta = LocationMetadata(
            latitude=request.latitude,
            longitude=request.longitude,
            elevation=request.elevation or 0.0,
            bortle_scale=int(first_row["bortle_scale"]),
            bortle_source=str(first_row["bortle_source"]),
            bortle_description=str(first_row["bortle_description"]),
        )

        # Step 4: Analyze Night Hours & Best Window
        # Night is defined when the Sun is below the horizon (sun_altitude < 0)
        night_df = scored_df[scored_df["sun_altitude"] < 0].copy()
        if night_df.empty:
            # Polar summer edge case or fallback to all hours
            night_df = scored_df.copy()

        # Overall night score (average of night hours)
        avg_night_score = round(float(night_df["stargazing_score"].mean()), 1)
        peak_night_score = round(float(night_df["stargazing_score"].max()), 1)

        # Determine overall rating
        if peak_night_score >= 80.0:
            rating_cat = "Excellent"
        elif peak_night_score >= 65.0:
            rating_cat = "Good"
        elif peak_night_score >= 45.0:
            rating_cat = "Fair"
        else:
            rating_cat = "Poor"

        # Find Peak Hour & Best Observation Window
        best_row = night_df.loc[night_df["stargazing_score"].idxmax()]
        peak_time = best_row["timestamp_utc"]

        # Find contiguous window around peak where score >= 60 (or top 3 hours)
        high_score_hours = night_df[night_df["stargazing_score"] >= max(50.0, peak_night_score - 20)]
        if not high_score_hours.empty:
            start_time = high_score_hours.iloc[0]["timestamp_utc"]
            end_time = high_score_hours.iloc[-1]["timestamp_utc"]
        else:
            start_time = peak_time
            end_time = peak_time

        mw_visible_at_peak = bool(best_row["milky_way_core_altitude"] > 10.0 and best_row["is_astronomical_night"])

        # Formulate actionable recommendation.
        # NOTE: astrophotography gear advice (wide-aperture lenses) is only
        # relevant when the Milky Way core is actually visible at peak time
        # (mw_visible_at_peak). A high sky-clarity score alone does not mean
        # the galactic core is above the horizon, so that advice must be
        # gated on mw_visible_at_peak rather than on peak_night_score alone.
        # Text is generated in `lang` ("en" or "id") since these are fixed
        # templates with variable interpolation, not freeform model output.
        if lang == "id":
            if peak_night_score >= 80:
                if mw_visible_at_peak:
                    rec = (
                        f"Kondisinya bakal prima sekitar jam {peak_time} UTC. Inti Bima Sakti lagi "
                        f"di posisi oke banget di atas cakrawala — bawa lensa wide-aperture, "
                        f"langitnya gelap bersih dan gangguan atmosfernya minim banget."
                    )
                else:
                    rec = (
                        f"Kondisinya bakal prima sekitar jam {peak_time} UTC. Langitnya gelap dan "
                        f"bersih, gangguan atmosfer minim, cuma inti Bima Sakti-nya emang lagi "
                        f"nggak di posisi pas di atas cakrawala — tapi tetap oke buat "
                        f"astrofotografi deep-sky dan wide-field secara umum."
                    )
            elif peak_night_score >= 65:
                if mw_visible_at_peak:
                    rec = (
                        f"Ada jendela waktu yang lumayan bagus antara jam {start_time} dan "
                        f"{end_time} UTC, inti Bima Sakti-nya kelihatan di atas cakrawala. "
                        f"Kecerahannya oke, cuma ada sedikit kabut atmosfer atau awan tipis."
                    )
                else:
                    rec = (
                        f"Ada jendela waktu yang lumayan bagus antara jam {start_time} dan "
                        f"{end_time} UTC. Kecerahannya oke, cuma ada sedikit kabut atmosfer atau "
                        f"awan tipis; inti Bima Sakti-nya kebetulan lagi nggak pas posisinya buat "
                        f"difoto di jendela waktu ini."
                    )
            elif peak_night_score >= 45:
                rec = (
                    f"Kondisinya pas-pasan aja. Mungkin ada jeda cerah singkat sekitar jam "
                    f"{peak_time} UTC, tapi tetap waspada gangguan dari awan atau cahaya."
                )
            else:
                rec = (
                    "Malam ini kurang disaranin buat stargazing. Awan tebal, kelembapan tinggi, "
                    "atau cahaya bulan yang kuat bakal bikin objek langit yang redup susah "
                    "kelihatan."
                )
        else:
            if peak_night_score >= 80:
                if mw_visible_at_peak:
                    rec = (
                        f"Prime conditions expected around {peak_time} UTC. Milky Way core is "
                        f"well-placed above the horizon — bring wide-aperture lenses; pristine "
                        f"dark sky with minimal atmospheric disturbance."
                    )
                else:
                    rec = (
                        f"Prime conditions expected around {peak_time} UTC. Pristine dark sky with "
                        f"minimal atmospheric disturbance, though the Milky Way core is not well "
                        f"placed above the horizon at this time — still excellent for general "
                        f"deep-sky and wide-field astrophotography."
                    )
            elif peak_night_score >= 65:
                if mw_visible_at_peak:
                    rec = (
                        f"Favorable window between {start_time} and {end_time} UTC, with the Milky "
                        f"Way core visible above the horizon. Good clarity with slight atmospheric "
                        f"haze or minor cloud presence."
                    )
                else:
                    rec = (
                        f"Favorable window between {start_time} and {end_time} UTC. Good clarity "
                        f"with slight atmospheric haze or minor cloud presence; Milky Way core is "
                        f"not well-positioned for imaging during this window."
                    )
            elif peak_night_score >= 45:
                rec = f"Marginal conditions. Brief clear spells may occur near {peak_time} UTC, but expect noticeable interference from clouds or light."
            else:
                rec = "Stargazing not recommended tonight. Heavy cloud cover, dense moisture, or strong moonlight will obscure faint sky objects."

        best_window = BestVisitWindow(
            start_time=start_time,
            end_time=end_time,
            peak_time=peak_time,
            peak_score=peak_night_score,
            milky_way_core_visible=mw_visible_at_peak,
            key_recommendation=rec,
        )

        # Moon Summary
        moon_illum_pct = round(float(best_row["moon_illumination"]) * 100, 1)
        moon_alt_peak = round(float(best_row["moon_altitude"]), 1)
        if lang == "id":
            if moon_alt_peak <= 0:
                moon_note = "Bulannya lagi di bawah cakrawala pas jam puncak, jadi langitnya gelap alami."
            else:
                moon_note = (
                    f"Bulannya lagi di atas cakrawala ({moon_alt_peak}°) dengan tingkat terang "
                    f"{moon_illum_pct}%, jadi ada sedikit tambahan cahaya di langit."
                )
        else:
            if moon_alt_peak <= 0:
                moon_note = "Moon is below the horizon during peak hours, providing natural dark sky."
            else:
                moon_note = f"Moon is above horizon ({moon_alt_peak}°) with {moon_illum_pct}% illumination, causing some sky illumination."

        moon_summary = MoonSummary(
            phase_name=str(best_row["moon_phase_name"]),
            illumination_pct=moon_illum_pct,
            moon_altitude_at_peak=moon_alt_peak,
            moon_interference_note=moon_note,
        )

        # Primary Driver from SHAP of the peak hour
        default_driver = "Langitnya lagi cerah banget" if lang == "id" else "Optimal sky clarity"
        primary_driver = str(best_row["explanation"].get("primary_driver", default_driver))

        summary = ForecastSummary(
            overall_night_score=avg_night_score,
            rating_category=rating_cat,
            best_window=best_window,
            moon_summary=moon_summary,
            primary_driver=primary_driver,
        )

        # Step 5: Format Hourly Items
        hourly_items: List[HourlyForecastItem] = []
        for _, r in scored_df.iterrows():
            exp_dict = r["explanation"]
            shap_payload = SHAPExplanationPayload(
                predicted_score=float(exp_dict["predicted_score"]),
                base_score=float(exp_dict["base_score"]),
                verdict=str(exp_dict["verdict"]),
                primary_driver=str(exp_dict["primary_driver"]),
                positive_factors=list(exp_dict["positive_factors"]),
                negative_factors=list(exp_dict["negative_factors"]),
                feature_shap_values=dict(exp_dict["feature_shap_values"]),
            )

            item = HourlyForecastItem(
                timestamp_utc=str(r["timestamp_utc"]),
                stargazing_score=float(r["stargazing_score"]),
                rating_category=str(r["rating_category"]),
                is_astronomical_night=bool(r["is_astronomical_night"]),
                cloud_cover=float(r["cloud_cover"]),
                cloud_cover_high=float(r["cloud_cover_high"]),
                cloud_cover_mid=float(r["cloud_cover_mid"]),
                cloud_cover_low=float(r["cloud_cover_low"]),
                relative_humidity=float(r["relative_humidity"]),
                temperature=float(r["temperature"]) if r["temperature"] is not None else None,
                dew_point=float(r["dew_point"]) if r["dew_point"] is not None else None,
                dew_point_spread=float(r["dew_point_spread"]) if r["dew_point_spread"] is not None else None,
                visibility_meters=float(r["visibility_meters"]) if r["visibility_meters"] is not None else None,
                sun_altitude=float(r["sun_altitude"]),
                moon_phase_name=str(r["moon_phase_name"]),
                moon_illumination=float(r["moon_illumination"]),
                moon_altitude=float(r["moon_altitude"]),
                moon_azimuth=float(r["moon_azimuth"]),
                milky_way_core_altitude=float(r["milky_way_core_altitude"]),
                milky_way_core_azimuth=float(r["milky_way_core_azimuth"]),
                is_milky_way_prime_window=bool(r["is_milky_way_prime_window"]),
                explanation=shap_payload,
            )
            hourly_items.append(item)

        return StargazingResponse(
            success=True,
            location=location_meta,
            summary=summary,
            hourly_forecast=hourly_items,
            meta={
                "generated_at_utc": datetime.now(timezone.utc).isoformat(),
                "model_version": "xgboost-3.4.1",
                "explainer": "TreeSHAP",
                "api_version": "1.0.0",
            },
        )
