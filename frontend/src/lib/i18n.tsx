"use client";

/**
 * Lightweight EN/ID UI translation — no external i18n library, just a
 * React context + a plain dictionary, so it works without adding a
 * dependency.
 *
 * SCOPE NOTE: this translates static UI chrome written in this frontend
 * (labels, headings, buttons, legends, status words), plus the closed,
 * known sets of values that come back from the API (`rating_category`,
 * `moon_phase_name`) via `tValue`.
 *
 * The free-form prose the backend generates at request time —
 * `key_recommendation`, `explanation.verdict`, `explanation.primary_driver`,
 * `explanation.positive_factors` / `negative_factors`, and
 * `moon_summary.moon_interference_note` — is NOT translated by this file.
 * Those are fixed templates assembled in `forecast_service.py` and the SHAP
 * explainer (`app/ml/explainer.py`), which accept a `lang` ("en"/"id")
 * parameter and generate the prose directly in the requested language
 * server-side. The frontend's job is just to pass the current `lang` from
 * this context into `fetchStargazingForecast(...)` (see `src/lib/api.ts`
 * and `src/app/page.tsx`) so the backend returns the right language.
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Lang = "en" | "id";

const STORAGE_KEY = "stargazing.lang";
export const DEFAULT_LANG: Lang = "en";

const dict = {
  en: {
    header: {
      title: "Stargazing & Milky Way forecast",
      timezoneLabel: "Display timezone",
      languageLabel: "Language",
      refresh: "Refresh",
      fetching: "Fetching…",
    },
    banner: {
      demoOnly: "Just demo data.",
      demoBody:
        "The forecast request failed, so what you're seeing is a made-up preview, not a real prediction for {date}. Check that the backend is running, then hit Refresh.",
    },
    hero: {
      skyAt: "Sky at",
      forecastFor: "Forecast for",
      customLocation: "Custom location",
      latitude: "Latitude (°)",
      longitude: "Longitude (°)",
      elevation: "Elevation",
      bortleClass: "Bortle class",
    },
    locationSearch: {
      observingSite: "Observing site",
      forecastDate: "Forecast date",
      useMyLocation: "Use my location",
      locating: "Locating…",
      coordinates: "Coordinates",
      latitude: "Latitude (°)",
      longitude: "Longitude (°)",
      elevationM: "Elevation (m)",
      optional: "Optional",
      getForecast: "Get forecast",
      geoNotSupported: "Geolocation is not supported by your browser.",
      indonesia: "Indonesia",
      international: "International",
    },
    nav: {
      about: "About",
      backToForecast: "Back to forecast",
    },
    about: {
      title: "About this site",
      intro:
        "A little tool that guesses how good the sky will be for stargazing and Milky Way photography at a given place and time — built as a university project.",
      howItWorksTitle: "How it works",
      howItWorksBody:
        "Hourly weather (cloud cover at three altitude bands, humidity, dew point) comes from Open-Meteo, while the Sun, Moon and Milky Way core positions are worked out with PyEphem. All of that feeds an XGBoost model trained to guess a 0–100 sky clarity score, and SHAP (TreeExplainer) breaks that score down into the specific factors helping or hurting it each hour.",
      dataSourcesTitle: "Data & model",
      dataSourcesBody:
        "Weather forecasts from the Open-Meteo API. Astronomical positions computed with PyEphem. The prediction model is XGBoost 3.4.1, explained with SHAP TreeExplainer. Light pollution is measured against the Bortle Dark-Sky Scale (1–9).",
      stackTitle: "Built with",
      stackBody: "FastAPI and Python on the backend; Next.js, React and TypeScript on the frontend.",
      authorTitle: "Team",
      authorBody: "Izzy Ahnaf · NIM J0404241153",
      nim: "NIM",
      disclaimerTitle: "A quick heads-up",
      disclaimerBody:
        "These forecasts are statistical guesses, not guarantees — always double-check current local conditions and official weather sources before heading out, especially somewhere remote.",
    },
    scoreGauge: {
      clarityScore: "Clarity score",
      selectedHour: "Selected hour",
      outOf100: "out of 100",
      bestWindow: "Best window",
      peak: "Peak",
      milkyWayCore: "Milky Way core",
      aboveHorizon: "Above the horizon",
      belowHorizon: "Below the horizon",
    },
    conditions: {
      conditionsAt: "Conditions at",
      cloudCover: "Cloud cover",
      clear: "Clear",
      partlyCloudy: "Partly cloudy",
      overcast: "Overcast",
      high: "High",
      mid: "Mid",
      low: "Low",
      milkyWayCore: "Milky Way core",
      primeWindow: "Prime window",
      aboveHorizon: "Above the horizon",
      belowHorizon: "Below the horizon",
      altitudeUnit: "° altitude",
      azimuth: "Azimuth",
      moon: "Moon",
      moonDown: "Moon down",
      faint: "Faint",
      bright: "Bright",
      litUnit: "% lit",
      altitude: "Altitude",
      glare: "Glare",
      none: "None",
      active: "Active",
      dewMargin: "Dew margin",
      dry: "Dry",
      dewRisk: "Dew risk",
      dewUnit: "°C between air and dew point",
      air: "Air",
      dewPoint: "Dew point",
      lightPollution: "Light pollution",
      darkSky: "Dark sky",
      rural: "Rural",
      suburban: "Suburban",
      urban: "Urban",
      bortleUnit: "Bortle class, 1 to 9",
      elevation: "Elevation",
      source: "Source",
      transparency: "Transparency",
      excellent: "Excellent",
      moderate: "Moderate",
      kmVisibility: "km visibility",
      humidity: "Humidity",
      astronomicalNight: "Astronomical night",
      twilight: "Twilight",
    },
    timeline: {
      title: "Clarity through the night",
      subtitle: "Dusk to dawn, in {zone}. Select an hour to see its conditions.",
      legendExcellent: "Excellent",
      legendGood: "Good",
      legendFair: "Fair",
      legendPoor: "Poor",
      rangeExcellent: "80 and up",
      rangeGood: "65 to 79",
      rangeFair: "45 to 64",
      rangePoor: "under 45",
      footerNote:
        "Dashed lines mark scores of 45, 65 and 80. The violet figure under each hour is how high the Milky Way core stands above the horizon.",
    },
    shap: {
      whyThisScore: "Why this score",
      modelStarts: "The model starts at",
      andLandsOn: "and lands on",
      forLabel: "for",
      biggestFactor: "Biggest factor:",
      pointsAdded: "Points each factor added or removed",
      helping: "Helping",
      holdingBack: "Holding it back",
      nothingBoosting: "Nothing is boosting the score this hour.",
      nothingPulling: "Nothing is pulling the score down this hour.",
    },
    camera: {
      title: "Camera settings",
      subtitle: "Starting points for Bortle class {bortle} and the moon at this hour.",
      iso: "ISO",
      shutter: "Shutter (NPF rule)",
      aperture: "Aperture",
      dewHeaterBand: "Dew heater band",
      required: "Required",
      notNeeded: "Not needed",
      isoNoteLow: "Low light pollution, so high sensitivity works without blowing out highlights.",
      isoNoteBright: "Bright skyglow or moonlight. A lower ISO keeps the sensor from saturating.",
      isoNoteBalance: "A balance between noise and suburban skyglow.",
      shutterValue: "15–20 s",
      shutterNote:
        "Keeps stars pinpoint on a 24 mm full-frame lens, without trails from Earth's rotation.",
      apertureValue: "f/1.4–f/2.8",
      apertureNote: "Open as wide as the lens allows to resolve faint dust lanes in the Milky Way.",
      dewNoteRequired:
        "Only {spread}°C between air and dew point, so the front lens is likely to fog.",
      dewNoteNotNeeded: "{spread}°C between air and dew point, so the optics should stay dry.",
    },
    footer:
      "Clarity scores come from an XGBoost 3.4.1 model explained with TreeSHAP. Weather data is from Open-Meteo, sun, moon and Milky Way positions are computed with PyEphem, and the API runs on FastAPI.",
    states: {
      loadingForecast: "Loading the forecast…",
      fetchingForecast: "Fetching the forecast…",
      failedTitle: "Couldn't load the forecast",
      failedBody: "Check that the forecast API is running, then hit Refresh to try again.",
    },
    ratingCategory: {
      Excellent: "Excellent",
      Good: "Good",
      Fair: "Fair",
      Poor: "Poor",
    },
    moonPhase: {
      "New Moon": "New Moon",
      "Waxing Crescent": "Waxing Crescent",
      "First Quarter": "First Quarter",
      "Waxing Gibbous": "Waxing Gibbous",
      "Full Moon": "Full Moon",
      "Waning Gibbous": "Waning Gibbous",
      "Last Quarter": "Last Quarter",
      "Waning Crescent": "Waning Crescent",
    },
    locationNames: {
      "Mount Bromo": "Mount Bromo",
      Jakarta: "Jakarta",
      "Dieng Plateau": "Dieng Plateau",
      "Kawah Ijen": "Kawah Ijen",
      "Mount Rinjani": "Mount Rinjani",
      "Labuan Bajo": "Labuan Bajo",
      "Komodo National Park": "Komodo National Park",
      Kelimutu: "Kelimutu",
      "Raja Ampat": "Raja Ampat",
      "Derawan Island": "Derawan Island",
      "Sabang (Weh Island)": "Sabang (Weh Island)",
      "Tana Toraja": "Tana Toraja",
      "Mauna Kea": "Mauna Kea",
      "Atacama Desert": "Atacama Desert",
      "Joshua Tree": "Joshua Tree",
      NamibRand: "NamibRand",
      "Aoraki Mackenzie": "Aoraki Mackenzie",
      "La Palma": "La Palma",
      "Pic du Midi": "Pic du Midi",
      Merzouga: "Merzouga",
      Uluru: "Uluru",
      "Jasper National Park": "Jasper National Park",
      "Þingvellir": "Þingvellir",
      Hanle: "Hanle",
    },
    locationCountries: {
      Indonesia: "Indonesia",
      USA: "USA",
      Chile: "Chile",
      Namibia: "Namibia",
      "New Zealand": "New Zealand",
      Spain: "Spain",
      France: "France",
      Morocco: "Morocco",
      Australia: "Australia",
      Canada: "Canada",
      Iceland: "Iceland",
      India: "India",
    },
  },
  id: {
    header: {
      title: "Prakiraan Langit & Bima Sakti",
      timezoneLabel: "Zona waktu tampilan",
      languageLabel: "Bahasa",
      refresh: "Muat ulang",
      fetching: "Lagi ambil data…",
    },
    banner: {
      demoOnly: "Ini cuma data contoh, ya.",
      demoBody:
        "Permintaan ke server-nya gagal, jadi yang kamu lihat ini cuma pratinjau buatan, bukan prediksi asli untuk {date}. Coba cek dulu backend-nya udah nyala apa belum, terus klik Muat ulang.",
    },
    hero: {
      skyAt: "Langit jam",
      forecastFor: "Prakiraan buat",
      customLocation: "Lokasi custom",
      latitude: "Lintang (°)",
      longitude: "Bujur (°)",
      elevation: "Ketinggian",
      bortleClass: "Kelas Bortle",
    },
    locationSearch: {
      observingSite: "Lokasi pengamatan",
      forecastDate: "Tanggal",
      useMyLocation: "Pakai lokasi saya",
      locating: "Lagi nyari lokasi…",
      coordinates: "Koordinat",
      latitude: "Lintang (°)",
      longitude: "Bujur (°)",
      elevationM: "Ketinggian (m)",
      optional: "Opsional",
      getForecast: "Cek prakiraan",
      geoNotSupported: "Browser kamu belum bisa deteksi lokasi, nih.",
      indonesia: "Indonesia",
      international: "Internasional",
    },
    nav: {
      about: "Tentang",
      backToForecast: "Balik ke prakiraan",
    },
    about: {
      title: "Tentang web ini",
      intro:
        "Alat bantu buat ngira-ngira seberapa bagus langitnya untuk stargazing dan motret Bima Sakti, di lokasi dan waktu tertentu — dibikin sebagai proyek kuliah.",
      howItWorksTitle: "Cara kerjanya",
      howItWorksBody:
        "Data cuaca per jam (tutupan awan di tiga lapisan ketinggian, kelembapan, titik embun) diambil dari Open-Meteo, sementara posisi Matahari, Bulan, dan inti Bima Sakti dihitung pakai PyEphem. Semua data itu dimasukkan ke model XGBoost yang udah dilatih buat nebak skor kecerahan langit 0–100, terus SHAP (TreeExplainer) ngejelasin faktor-faktor apa aja yang bikin skornya naik atau turun tiap jamnya.",
      dataSourcesTitle: "Data & model",
      dataSourcesBody:
        "Prakiraan cuaca dari Open-Meteo API. Posisi astronomis dihitung pakai PyEphem. Model prediksinya XGBoost 3.4.1, dijelasin pakai SHAP TreeExplainer. Buat ukuran polusi cahaya, dipakai Skala Langit Gelap Bortle (1–9).",
      stackTitle: "Dibikin pakai",
      stackBody: "FastAPI dan Python di backend; Next.js, React, dan TypeScript di frontend.",
      authorTitle: "Tim",
      authorBody: "Izzy Ahnaf · NIM J0404241153",
      nim: "NIM",
      disclaimerTitle: "Soal akurasinya",
      disclaimerBody:
        "Prakiraan ini tetap prediksi statistik, bukan jaminan pasti — tetap cek kondisi langsung di lokasi dan sumber cuaca resmi sebelum berangkat, apalagi kalau lokasinya terpencil.",
    },
    scoreGauge: {
      clarityScore: "Skor kecerahan langit",
      selectedHour: "Jam yang dipilih",
      outOf100: "dari 100",
      bestWindow: "Waktu terbaik",
      peak: "Puncak",
      milkyWayCore: "Inti Bima Sakti",
      aboveHorizon: "Di atas cakrawala",
      belowHorizon: "Di bawah cakrawala",
    },
    conditions: {
      conditionsAt: "Kondisi jam",
      cloudCover: "Tutupan awan",
      clear: "Cerah",
      partlyCloudy: "Sebagian berawan",
      overcast: "Mendung",
      high: "Tinggi",
      mid: "Menengah",
      low: "Rendah",
      milkyWayCore: "Inti Bima Sakti",
      primeWindow: "Waktu terbaik",
      aboveHorizon: "Di atas cakrawala",
      belowHorizon: "Di bawah cakrawala",
      altitudeUnit: "° altitudo",
      azimuth: "Azimut",
      moon: "Bulan",
      moonDown: "Bulan terbenam",
      faint: "Redup",
      bright: "Terang",
      litUnit: "% tersinari",
      altitude: "Altitudo",
      glare: "Silau",
      none: "Tidak ada",
      active: "Ada",
      dewMargin: "Margin embun",
      dry: "Kering",
      dewRisk: "Risiko embun",
      dewUnit: "°C selisih suhu udara dan titik embun",
      air: "Udara",
      dewPoint: "Titik embun",
      lightPollution: "Polusi cahaya",
      darkSky: "Langit gelap",
      rural: "Pedesaan",
      suburban: "Pinggiran kota",
      urban: "Perkotaan",
      bortleUnit: "Kelas Bortle, 1 sampai 9",
      elevation: "Ketinggian",
      source: "Sumber",
      transparency: "Transparansi",
      excellent: "Sangat baik",
      moderate: "Sedang",
      kmVisibility: "km jarak pandang",
      humidity: "Kelembapan",
      astronomicalNight: "Malam astronomis",
      twilight: "Senja",
    },
    timeline: {
      title: "Kecerahan sepanjang malam",
      subtitle: "Senja sampai subuh, dalam {zone}. Klik salah satu jam buat lihat kondisinya.",
      legendExcellent: "Sangat baik",
      legendGood: "Baik",
      legendFair: "Cukup",
      legendPoor: "Buruk",
      rangeExcellent: "80 ke atas",
      rangeGood: "65 sampai 79",
      rangeFair: "45 sampai 64",
      rangePoor: "di bawah 45",
      footerNote:
        "Garis putus-putus itu nandain skor 45, 65, dan 80. Angka ungu di bawah tiap jam nunjukkin seberapa tinggi inti Bima Sakti di atas cakrawala.",
    },
    shap: {
      whyThisScore: "Kenapa skornya segini",
      modelStarts: "Modelnya mulai dari",
      andLandsOn: "terus jatuh di",
      forLabel: "buat",
      biggestFactor: "Faktor paling berpengaruh:",
      pointsAdded: "Poin yang ditambah atau dikurangi tiap faktor",
      helping: "Yang bantu naikin",
      holdingBack: "Yang nahan",
      nothingBoosting: "Gak ada yang ngedongkrak skor jam ini.",
      nothingPulling: "Gak ada yang nurunin skor jam ini.",
    },
    camera: {
      title: "Setelan kamera",
      subtitle: "Titik awal buat kelas Bortle {bortle} dan posisi bulan di jam ini.",
      iso: "ISO",
      shutter: "Shutter (aturan NPF)",
      aperture: "Apertur",
      dewHeaterBand: "Pemanas anti-embun",
      required: "Perlu",
      notNeeded: "Gak perlu",
      isoNoteLow: "Polusi cahayanya rendah, jadi ISO tinggi masih aman tanpa bikin overexpose.",
      isoNoteBright:
        "Langitnya terang karena skyglow atau cahaya bulan. ISO yang lebih rendah bikin sensor gak gampang jenuh.",
      isoNoteBalance: "Jalan tengah antara noise sama skyglow khas pinggiran kota.",
      shutterValue: "15–20 dtk",
      shutterNote:
        "Bikin bintang tetap tajam di lensa full-frame 24 mm, tanpa jejak dari rotasi Bumi.",
      apertureValue: "f/1.4–f/2.8",
      apertureNote:
        "Buka selebar mungkin sesuai kemampuan lensa kamu, biar garis debu Bima Sakti yang redup ikut kejepret.",
      dewNoteRequired:
        "Cuma {spread}°C bedanya suhu udara sama titik embun, jadi lensa depan gampang berembun.",
      dewNoteNotNeeded: "Beda {spread}°C antara suhu udara dan titik embun, jadi optiknya harusnya tetap kering.",
    },
    footer:
      "Skor kecerahannya dihitung pakai model XGBoost 3.4.1 yang dijelasin dengan TreeSHAP. Data cuaca dari Open-Meteo, posisi matahari, bulan, dan Bima Sakti dihitung pakai PyEphem, dan API-nya jalan di atas FastAPI.",
    states: {
      loadingForecast: "Lagi muat prakiraan…",
      fetchingForecast: "Lagi ambil prakiraan…",
      failedTitle: "Prakiraannya gagal dimuat",
      failedBody: "Cek dulu API prakiraannya udah jalan apa belum, terus klik Muat ulang buat coba lagi.",
    },
    ratingCategory: {
      Excellent: "Sangat baik",
      Good: "Baik",
      Fair: "Cukup",
      Poor: "Buruk",
    },
    moonPhase: {
      "New Moon": "Bulan Baru",
      "Waxing Crescent": "Sabit Awal",
      "First Quarter": "Kuartal Pertama",
      "Waxing Gibbous": "Cembung Awal",
      "Full Moon": "Bulan Purnama",
      "Waning Gibbous": "Cembung Akhir",
      "Last Quarter": "Kuartal Akhir",
      "Waning Crescent": "Sabit Akhir",
    },
    locationNames: {
      "Mount Bromo": "Gunung Bromo",
      Jakarta: "Jakarta",
      "Dieng Plateau": "Dataran Tinggi Dieng",
      "Kawah Ijen": "Kawah Ijen",
      "Mount Rinjani": "Gunung Rinjani",
      "Labuan Bajo": "Labuan Bajo",
      "Komodo National Park": "Taman Nasional Komodo",
      Kelimutu: "Kelimutu",
      "Raja Ampat": "Raja Ampat",
      "Derawan Island": "Pulau Derawan",
      "Sabang (Weh Island)": "Sabang (Pulau Weh)",
      "Tana Toraja": "Tana Toraja",
      "Mauna Kea": "Mauna Kea",
      "Atacama Desert": "Gurun Atacama",
      "Joshua Tree": "Joshua Tree",
      NamibRand: "NamibRand",
      "Aoraki Mackenzie": "Aoraki Mackenzie",
      "La Palma": "La Palma",
      "Pic du Midi": "Pic du Midi",
      Merzouga: "Merzouga",
      Uluru: "Uluru",
      "Jasper National Park": "Taman Nasional Jasper",
      "Þingvellir": "Þingvellir",
      Hanle: "Hanle",
    },
    locationCountries: {
      Indonesia: "Indonesia",
      USA: "Amerika Serikat",
      Chile: "Chili",
      Namibia: "Namibia",
      "New Zealand": "Selandia Baru",
      Spain: "Spanyol",
      France: "Prancis",
      Morocco: "Maroko",
      Australia: "Australia",
      Canada: "Kanada",
      Iceland: "Islandia",
      India: "India",
    },
  },
} as const;

/** Reaches a nested value by dot path, e.g. "shap.whyThisScore". */
function getPath(obj: unknown, path: string): string | undefined {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return typeof cur === "string" ? cur : undefined;
}

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Translates a dot-path key, e.g. t("shap.whyThisScore"). Optional
   * {placeholders} in the string are replaced from `vars`. Falls back to
   * the English string, then to the key itself, if a translation is
   * missing — so a typo'd key never crashes the page. */
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** Translates a closed-set value (rating category or moon phase name from
   * the API, or a preset location's name/country) that isn't present in
   * this dictionary's chrome keys. Falls back to the raw value if it isn't
   * in the table (e.g. a custom/GPS-detected location has no translation,
   * which is expected). */
  tValue: (
    namespace: "ratingCategory" | "moonPhase" | "locationNames" | "locationCountries",
    value: string
  ) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function loadLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "id" || stored === "en" ? stored : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

function saveLang(lang: Lang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Best-effort only.
  }
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Starts at the default and is set from localStorage inside a useEffect
  // (not as the useState initializer) so the first client render always
  // matches the server-rendered markup; see the `date` state in page.tsx
  // for the same pattern and why it matters.
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    setLangState(loadLang());
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    saveLang(next);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const fromLang = getPath(dict[lang], key);
      const fromEnglish = getPath(dict.en, key);
      let str = fromLang ?? fromEnglish ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(`{${k}}`, String(v));
        }
      }
      return str;
    },
    [lang]
  );

  const tValue = useCallback(
    (
      namespace: "ratingCategory" | "moonPhase" | "locationNames" | "locationCountries",
      value: string
    ) => {
      const table = dict[lang][namespace] as Record<string, string>;
      return table[value] ?? value;
    },
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t, tValue }}>{children}</I18nContext.Provider>
  );
};

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}
