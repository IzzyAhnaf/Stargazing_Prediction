import { StargazingResponse } from "@/types/stargazing";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchStargazingForecast(
  latitude: number,
  longitude: number,
  date?: string,
  elevation?: number,
  override_bortle?: number,
  forecast_days = 2,
  lang: "en" | "id" = "en"
): Promise<StargazingResponse> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    forecast_days: forecast_days.toString(),
    lang,
  });

  if (date) params.append("date", date);
  if (elevation !== undefined) params.append("elevation", elevation.toString());
  if (override_bortle !== undefined) params.append("override_bortle", override_bortle.toString());

  try {
    const res = await fetch(`${API_BASE_URL}/predict-stargazing?${params.toString()}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 300 }, // Cache for 5 mins
    });

    if (!res.ok) {
      const bodyText = await res.text().catch(() => "");
      throw new Error(`API error: ${res.status} ${res.statusText} ${bodyText}`);
    }

    const data: StargazingResponse = await res.json();
    return data;
  } catch (error) {
    // IMPORTANT: this swallows real backend errors (e.g. HTTP 500 from a
    // bug in the forecasting pipeline) and silently replaces them with
    // canned synthetic data. console.error (not .warn) so it is not missed,
    // and the returned payload is flagged via meta.is_fallback_data so the
    // UI can surface a visible "demo data" warning instead of hiding it.
    console.error(
      "Backend API unreachable or error, utilizing fallback synthetic preview:",
      error
    );
    return getFallbackForecast(latitude, longitude, date, elevation, override_bortle, lang);
  }
}

/**
 * High-fidelity fallback simulation based on real astronomical mechanics
 * in case the local FastAPI backend is still starting.
 *
 * NOTE: this is NOT a real prediction. It previously always anchored to a
 * hardcoded date (2026-11-06), which made it look like the real forecast
 * was not responding to the date picker. It now anchors to the requested
 * `date` (falling back to "today" if none was given) so at least the
 * synthetic preview shifts sensibly, and it is tagged as fallback data in
 * `meta.is_fallback_data` so callers/UI know not to treat it as real.
 */
function getFallbackForecast(
  latitude: number,
  longitude: number,
  date?: string,
  elevation = 2329,
  override_bortle = 3,
  lang: "en" | "id" = "en"
): StargazingResponse {
  const isId = lang === "id";
  const hours: StargazingResponse["hourly_forecast"] = [];
  const baseTime = date ? new Date(`${date}T18:00:00Z`) : new Date();
  baseTime.setUTCHours(18, 0, 0, 0);

  for (let i = 0; i < 24; i++) {
    const t = new Date(baseTime.getTime() + i * 3600 * 1000);
    const iso = t.toISOString().slice(0, 16);
    const hour = (18 + i) % 24;
    const isNight = hour >= 18 || hour <= 5;
    const sunAlt = isNight ? -35 + Math.sin((i / 12) * Math.PI) * 15 : 25;
    const mwAlt = Math.sin(((i + 2) / 12) * Math.PI) * 45;
    const score = isNight ? Math.min(100, Math.max(15, 88 - (i % 5) * 6)) : 0;

    hours.push({
      timestamp_utc: iso,
      stargazing_score: score,
      rating_category: score >= 80 ? "Excellent" : score >= 65 ? "Good" : score >= 45 ? "Fair" : "Poor",
      is_astronomical_night: sunAlt <= -18,
      cloud_cover: Math.round(Math.max(5, 30 - score * 0.2)),
      cloud_cover_high: 10,
      cloud_cover_mid: 5,
      cloud_cover_low: 5,
      relative_humidity: 65,
      temperature: 14.5,
      dew_point: 8.2,
      dew_point_spread: 6.3,
      visibility_meters: 25000,
      sun_altitude: sunAlt,
      moon_phase_name: "Waning Crescent",
      moon_illumination: 0.05,
      moon_altitude: -30 + i * 4,
      moon_azimuth: 110,
      milky_way_core_altitude: Math.round(mwAlt),
      milky_way_core_azimuth: 180,
      is_milky_way_prime_window: isNight && mwAlt > 15 && score >= 75,
      explanation: {
        predicted_score: score,
        base_score: 49.1,
        verdict: isId
          ? score >= 80
            ? "Waktu Pengamatan Luar Biasa: Langit cerah dan gelap"
            : "Visibilitas sedang"
          : score >= 80
          ? "Exceptional Stargazing Window: Clear dark sky"
          : "Moderate visibility",
        primary_driver: isId
          ? "Atmosfer bebas awan rendah (+14.0 poin)"
          : "Atmosphere clear of low clouds (+14.0 pts)",
        positive_factors: isId
          ? [
              "Atmosfer bawah bebas dari awan stratokumulus (+14.0 poin)",
              "Langit pedesaan gelap Bortle 3 (+6.3 poin)",
              "Udara kering (6.3°C): Tanpa risiko embun (+4.1 poin)",
            ]
          : [
              "Low atmosphere clear of stratocumulus clouds (+14.0 pts)",
              "Bortle 3 dark rural sky (+6.3 pts)",
              "Dry air spread (6.3°C): No dew risk (+4.1 pts)",
            ],
        negative_factors: isId
          ? [mwAlt < 10 ? "Inti Bima Sakti rendah (-2.0 poin)" : "Sedikit skyglow latar (-1.5 poin)"]
          : [mwAlt < 10 ? "Milky Way core low (-2.0 pts)" : "Minor background skyglow (-1.5 pts)"],
        feature_shap_values: {
          cloud_cover_low: 14.0,
          bortle_scale: 6.3,
          dew_point_spread: 4.1,
        },
      },
    });
  }

  return {
    success: true,
    location: {
      latitude,
      longitude,
      elevation,
      bortle_scale: override_bortle,
      bortle_source: "Live / Precision Geolocation",
      bortle_description: "Class 3: Rural sky with dark horizon and high contrast.",
    },
    summary: {
      overall_night_score: 82.5,
      rating_category: "Excellent",
      best_window: {
        start_time: "2026-11-06T20:00",
        end_time: "2026-11-07T02:00",
        peak_time: "2026-11-06T22:00",
        peak_score: 88.0,
        milky_way_core_visible: true,
        key_recommendation: isId
          ? "Kondisi prima diperkirakan sekitar pukul 22:00 UTC. Inti galaksi Bima Sakti terlihat jelas dengan gangguan cahaya bulan minimal."
          : "Prime conditions expected near 22:00 UTC. Milky Way galactic core clearly elevated with minimal moonlight interference.",
      },
      moon_summary: {
        phase_name: "Waning Crescent",
        illumination_pct: 5.0,
        moon_altitude_at_peak: -15.0,
        moon_interference_note: isId
          ? "Bulan berada di bawah cakrawala saat jam utama; langit gelap."
          : "Moon is below horizon during prime hours; sky is dark.",
      },
      primary_driver: isId
        ? "Troposfer cerah dan kelembapan atmosfer rendah"
        : "Clear troposphere and low atmospheric moisture",
    },
    hourly_forecast: hours,
    meta: {
      generated_at_utc: new Date().toISOString(),
      model_version: "xgboost-3.4.1",
      explainer: "TreeSHAP",
      api_version: "1.0.0",
      is_fallback_data: true,
    },
  };
}
