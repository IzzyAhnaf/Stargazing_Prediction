export interface LocationMetadata {
  latitude: number;
  longitude: number;
  elevation: number;
  bortle_scale: number;
  bortle_source: string;
  bortle_description: string;
}

export interface BestVisitWindow {
  start_time: string;
  end_time: string;
  peak_time: string;
  peak_score: number;
  milky_way_core_visible: boolean;
  key_recommendation: string;
}

export interface MoonSummary {
  phase_name: string;
  illumination_pct: number;
  moon_altitude_at_peak: number;
  moon_interference_note: string;
}

export interface ForecastSummary {
  overall_night_score: number;
  rating_category: "Poor" | "Fair" | "Good" | "Excellent" | string;
  best_window: BestVisitWindow;
  moon_summary: MoonSummary;
  primary_driver: string;
}

export interface SHAPExplanationPayload {
  predicted_score: number;
  base_score: number;
  verdict: string;
  primary_driver: string;
  positive_factors: string[];
  negative_factors: string[];
  feature_shap_values: Record<string, number>;
}

export interface HourlyForecastItem {
  timestamp_utc: string;
  stargazing_score: number;
  rating_category: string;
  is_astronomical_night: boolean;
  cloud_cover: number;
  cloud_cover_high: number;
  cloud_cover_mid: number;
  cloud_cover_low: number;
  relative_humidity: number;
  temperature?: number | null;
  dew_point?: number | null;
  dew_point_spread?: number | null;
  visibility_meters?: number | null;
  sun_altitude: number;
  moon_phase_name: string;
  moon_illumination: number;
  moon_altitude: number;
  moon_azimuth: number;
  milky_way_core_altitude: number;
  milky_way_core_azimuth: number;
  is_milky_way_prime_window: boolean;
  explanation: SHAPExplanationPayload;
}

export interface StargazingResponse {
  success: boolean;
  location: LocationMetadata;
  summary: ForecastSummary;
  hourly_forecast: HourlyForecastItem[];
  meta: {
    generated_at_utc: string;
    model_version: string;
    explainer: string;
    api_version: string;
    /** true when this payload is the client-side synthetic fallback, not a
     * real backend prediction (e.g. the backend request failed). UI should
     * show a visible warning rather than treat this as a real forecast. */
    is_fallback_data?: boolean;
  };
}
