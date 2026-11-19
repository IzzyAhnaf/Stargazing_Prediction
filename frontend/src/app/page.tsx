"use client";

import React, { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import { Telescope, RefreshCw, Clock, Settings, Languages, Info } from "lucide-react";
import { fetchStargazingForecast } from "@/lib/api";
import { StargazingResponse } from "@/types/stargazing";
import { ScoreGauge } from "@/components/ScoreGauge";
import { HourlyTimeline } from "@/components/HourlyTimeline";
import { ConditionChecklist } from "@/components/ConditionChecklist";
import { SHAPDrawer } from "@/components/SHAPDrawer";
import { LocationSearch, PRESET_LOCATIONS } from "@/components/LocationSearch";
import { CameraSettingsCard } from "@/components/CameraSettingsCard";
import { SkyScene, sceneForSite } from "@/components/SkyScene";
import {
  TIMEZONE_OPTIONS,
  DEFAULT_TIMEZONE_PREF,
  formatTimeInZone,
  formatDateTimeInZone,
  zoneAbbrLabel,
  loadTimezonePref,
  saveTimezonePref,
  todayLocalISODate,
  siteLocalZone,
  estimateUtcOffsetHours,
} from "@/lib/timezone";
import { I18nProvider, useI18n, Lang } from "@/lib/i18n";

const DISPLAY = "font-[family-name:var(--font-display)]";

const emptySubscribe = () => () => {};

function formatDate(iso: string) {
  if (!iso) return "";
  try {
    return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return iso;
  }
}

export default function StargazingDashboard() {
  return (
    <I18nProvider>
      <StargazingDashboardInner />
    </I18nProvider>
  );
}

function StargazingDashboardInner() {
  const { t, tValue, lang, setLang } = useI18n();
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  // Default to Mount Bromo, Indonesia
  const [latitude, setLatitude] = useState(-7.9425);
  const [longitude, setLongitude] = useState(112.953);
  const [elevation, setElevation] = useState<number | undefined>(2329);
  const [bortle, setBortle] = useState<number | undefined>(3);
  // Starts empty and is set to the device's current local date inside a
  // useEffect below (not as a useState initializer): Next.js disallows
  // reading `new Date()` directly during a Client Component's render/
  // prerender, since that value isn't deterministic there.
  const [date, setDate] = useState("");
  const [data, setData] = useState<StargazingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedHourIndex, setSelectedHourIndex] = useState(0);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>("");
  // Display-only: which timezone forecast times are shown in. Never sent to
  // the API — the backend keeps working in UTC regardless of this setting.
  const [timezonePref, setTimezonePref] = useState<string>(DEFAULT_TIMEZONE_PREF);

  // Load the saved preference once the component mounts in the browser
  // (localStorage isn't available during server rendering).
  useEffect(() => {
    setTimezonePref(loadTimezonePref());
  }, []);

  // Set the default date to "today" once mounted in the browser (see note
  // on the `date` useState above for why this can't be the initial value).
  useEffect(() => {
    setDate(todayLocalISODate());
  }, []);

  const handleTimezoneChange = (pref: string) => {
    setTimezonePref(pref);
    saveTimezonePref(pref);
  };

  // Resolves the "site" preference to this forecast's actual observing-site
  // timezone (see `siteLocalZone`); every other preference (device, WIB,
  // UTC, ...) passes through unchanged. Everywhere a time gets formatted
  // below uses this resolved zone, not the raw preference, so nothing
  // downstream needs to know "site" is special.
  const displayZone = timezonePref === "site" ? siteLocalZone(longitude) : timezonePref;

  useEffect(() => {
    const updateTime = () => {
      const now = new Date().toISOString();
      setCurrentTimeStr(`${formatDateTimeInZone(now, displayZone)} ${zoneAbbrLabel(displayZone)}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, [displayZone]);

  const loadForecast = useCallback(
    async (lat: number, lon: number, targetDate?: string, elev?: number, bortleVal?: number) => {
      setLoading(true);
      try {
        const resp = await fetchStargazingForecast(lat, lon, targetDate, elev, bortleVal, 2, lang);
        setData(resp);
        if (resp.hourly_forecast && resp.hourly_forecast.length > 0) {
          const peakIdx = resp.hourly_forecast.findIndex(
            (h) => h.timestamp_utc === resp.summary.best_window.peak_time
          );
          const firstNightIdx = resp.hourly_forecast.findIndex((h) => h.sun_altitude < 0);
          setSelectedHourIndex(peakIdx !== -1 ? peakIdx : firstNightIdx !== -1 ? firstNightIdx : 0);
        }
      } catch (err) {
        console.error("Failed to load forecast:", err);
      } finally {
        setLoading(false);
      }
    },
    [lang]
  );

  useEffect(() => {
    // `date` starts as "" until the mount effect above sets it to today's
    // local date; skip fetching until then to avoid an extra request with
    // an invalid date followed immediately by the real one.
    if (!date) return;

    let ignore = false;
    const fetchInitial = async () => {
      try {
        const resp = await fetchStargazingForecast(latitude, longitude, date, elevation, bortle, 2, lang);
        if (!ignore) {
          setData(resp);
          if (resp.hourly_forecast && resp.hourly_forecast.length > 0) {
            const peakIdx = resp.hourly_forecast.findIndex(
              (h) => h.timestamp_utc === resp.summary.best_window.peak_time
            );
            const firstNightIdx = resp.hourly_forecast.findIndex((h) => h.sun_altitude < 0);
            setSelectedHourIndex(peakIdx !== -1 ? peakIdx : firstNightIdx !== -1 ? firstNightIdx : 0);
          }
        }
      } catch (err) {
        if (!ignore) console.error("Failed to load initial forecast:", err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchInitial();

    return () => {
      ignore = true;
    };
  }, [latitude, longitude, date, elevation, bortle, lang]);

  const handleSearch = (newLat: number, newLon: number, newDate?: string, newElev?: number, newBortle?: number) => {
    setLatitude(newLat);
    setLongitude(newLon);
    if (newDate) setDate(newDate);
    setElevation(newElev);
    setBortle(newBortle);
    loadForecast(newLat, newLon, newDate, newElev, newBortle);
  };

  const selectedHour =
    data && data.hourly_forecast && data.hourly_forecast[selectedHourIndex]
      ? data.hourly_forecast[selectedHourIndex]
      : data?.hourly_forecast?.[0];

  const site = PRESET_LOCATIONS.find(
    (p) => Math.abs(p.lat - latitude) < 0.01 && Math.abs(p.lon - longitude) < 0.01
  );

  if (!isMounted) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#0b0f1e] p-4 text-[#e9e6dc]" suppressHydrationWarning>
        <div className="flex flex-col items-center gap-3 text-sm text-[#9097ad]" suppressHydrationWarning>
          <div className="h-5 w-5 animate-spin rounded-full border border-[#3a4466] border-t-[#e9e6dc] motion-reduce:animate-none" />
          <p>{t("states.loadingForecast")}</p>
        </div>
      </main>
    );
  }

  return (
    <main
      className="flex min-h-screen flex-col items-center bg-[#0b0f1e] px-4 pb-12 pt-5 text-[#e9e6dc] sm:px-6 lg:px-10"
      suppressHydrationWarning
    >
      <div className="flex w-full max-w-6xl flex-col gap-10">
        {/* Header */}
        <header
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-[#232b47] pb-4"
          suppressHydrationWarning
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <Telescope className="h-4 w-4 shrink-0 text-[#9097ad]" aria-hidden />
            <span className="truncate text-sm font-medium">{t("header.title")}</span>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm sm:gap-3">
            {currentTimeStr && (
              <span className="hidden items-center gap-1.5 tabular-nums text-[#9097ad] md:flex">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {currentTimeStr}
              </span>
            )}

            <label className="flex items-center gap-1.5 rounded-md border border-[#232b47] bg-[#11172b] px-2.5 py-1.5 text-[#9097ad]">
              <Settings className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="sr-only">{t("header.timezoneLabel")}</span>
              <select
                value={timezonePref}
                onChange={(e) => handleTimezoneChange(e.target.value)}
                className="bg-transparent text-xs text-[#e9e6dc] focus-visible:outline-none"
                title="Timezone used to display forecast times (the backend still works in UTC)"
              >
                {TIMEZONE_OPTIONS.map((opt) => {
                  const siteOffset = estimateUtcOffsetHours(longitude);
                  const label =
                    opt.value === "site"
                      ? `${opt.label} (UTC${siteOffset >= 0 ? "+" : ""}${siteOffset})`
                      : opt.label;
                  return (
                    <option key={opt.value} value={opt.value} className="bg-[#11172b] text-[#e9e6dc]">
                      {label}
                    </option>
                  );
                })}
              </select>
            </label>

            {/* EN / ID switch */}
            <div
              role="group"
              aria-label={t("header.languageLabel")}
              className="flex items-center gap-0.5 rounded-md border border-[#232b47] bg-[#11172b] p-0.5 text-xs"
            >
              <Languages className="ml-1.5 h-3.5 w-3.5 shrink-0 text-[#9097ad]" aria-hidden />
              {(["en", "id"] as Lang[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  aria-pressed={lang === code}
                  className={`rounded-[4px] px-2 py-1 uppercase transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9db8ff] ${
                    lang === code
                      ? "bg-[#232b47] text-[#e9e6dc]"
                      : "text-[#9097ad] hover:text-[#e9e6dc]"
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => loadForecast(latitude, longitude, date, elevation, bortle)}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-md border border-[#232b47] bg-[#11172b] px-2.5 py-1.5 text-[#9097ad] transition-colors hover:text-[#e9e6dc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9db8ff] motion-reduce:transition-none disabled:opacity-50"
              title="Refresh forecast"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`}
                aria-hidden
              />
              <span className="hidden sm:inline">{loading ? t("header.fetching") : t("header.refresh")}</span>
            </button>

            <Link
              href="/about"
              className="flex items-center gap-1.5 rounded-md border border-[#232b47] bg-[#11172b] px-2.5 py-1.5 text-[#9097ad] transition-colors hover:text-[#e9e6dc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9db8ff]"
              title={t("nav.about")}
            >
              <Info className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">{t("nav.about")}</span>
            </Link>
          </div>
        </header>

        {data?.meta?.is_fallback_data && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-300"
          >
            <span>
              <strong>{t("banner.demoOnly")}</strong>{" "}
              {t("banner.demoBody", { date: formatDate(date) })}
            </span>
          </div>
        )}

        {/* Hero: scenery for the selected site, driven by the selected hour */}
        <section className="relative h-[300px] overflow-hidden rounded-md border border-[#232b47] sm:h-[400px]">
          <SkyScene
            className="absolute inset-0"
            scene={sceneForSite(site?.name)}
            bortle={data?.location.bortle_scale ?? site?.bortle ?? bortle ?? 3}
            sunAltitude={selectedHour ? selectedHour.sun_altitude : -30}
            cloudCover={selectedHour ? selectedHour.cloud_cover : 0}
            moonIllumination={selectedHour ? selectedHour.moon_illumination : 0}
            moonAltitude={selectedHour ? selectedHour.moon_altitude : -10}
            milkyWayAltitude={selectedHour ? selectedHour.milky_way_core_altitude : 25}
          />

          {selectedHour && (
            <p className="absolute left-4 top-4 rounded-md bg-[#0b0f1e]/70 px-2.5 py-1 text-xs tabular-nums text-[#d4d1c6]">
              {t("hero.skyAt")} {formatTimeInZone(selectedHour.timestamp_utc, displayZone)}{" "}
              {zoneAbbrLabel(displayZone)}
            </p>
          )}

          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 bg-gradient-to-t from-[#0b0f1e]/95 via-[#0b0f1e]/60 to-transparent px-5 pb-5 pt-20 sm:px-8 sm:pb-7">
            <p className="text-sm text-[#b3b0a6]">
              {t("hero.forecastFor")} {formatDate(date)}
            </p>
            <h1 className={`${DISPLAY} text-4xl tracking-tight sm:text-5xl`}>
              {site ? tValue("locationNames", site.name) : t("hero.customLocation")}
            </h1>
            {data && (
              <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-[#b3b0a6]">
                <div className="flex gap-1.5">
                  <dt>{t("hero.latitude")}</dt>
                  <dd className="tabular-nums text-[#e9e6dc]">{data.location.latitude}°</dd>
                </div>
                <div className="flex gap-1.5">
                  <dt>{t("hero.longitude")}</dt>
                  <dd className="tabular-nums text-[#e9e6dc]">{data.location.longitude}°</dd>
                </div>
                <div className="flex gap-1.5">
                  <dt>{t("hero.elevation")}</dt>
                  <dd className="tabular-nums text-[#e9e6dc]">{data.location.elevation} m</dd>
                </div>
                <div className="flex gap-1.5">
                  <dt>{t("hero.bortleClass")}</dt>
                  <dd className="tabular-nums text-[#e9e6dc]">
                    {data.location.bortle_scale}
                    <span className="text-[#b3b0a6]"> ({data.location.bortle_source})</span>
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </section>

        <LocationSearch
          currentLat={latitude}
          currentLon={longitude}
          currentDate={date}
          onSearch={handleSearch}
          isLoading={loading}
        />

        {data && selectedHour && (
          <div
            aria-busy={loading}
            className={`flex flex-col gap-10 transition-opacity motion-reduce:transition-none ${
              loading ? "opacity-60" : "opacity-100"
            }`}
          >
            <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <ScoreGauge
                  score={selectedHour.stargazing_score}
                  ratingCategory={selectedHour.rating_category}
                  bestWindow={data.summary.best_window}
                  timezonePref={displayZone}
                />
              </div>
              <div className="lg:col-span-7">
                <ConditionChecklist
                  currentHour={selectedHour}
                  location={data.location}
                  timezonePref={displayZone}
                />
              </div>
            </div>

            <HourlyTimeline
              hourlyData={data.hourly_forecast}
              selectedHourIndex={selectedHourIndex}
              onSelectHour={setSelectedHourIndex}
              timezonePref={displayZone}
            />

            <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <SHAPDrawer
                  explanation={selectedHour.explanation}
                  score={selectedHour.stargazing_score}
                  timeStr={formatTimeInZone(selectedHour.timestamp_utc, displayZone)}
                  zoneLabel={zoneAbbrLabel(displayZone)}
                />
              </div>
              <div className="lg:col-span-5">
                <CameraSettingsCard currentHour={selectedHour} location={data.location} />
              </div>
            </div>
          </div>
        )}

        {loading && !data && (
          <div className="flex w-full flex-col items-center justify-center gap-3 py-20 text-sm text-[#9097ad]">
            <div className="h-5 w-5 animate-spin rounded-full border border-[#3a4466] border-t-[#e9e6dc] motion-reduce:animate-none" />
            <p>{t("states.fetchingForecast")}</p>
          </div>
        )}

        {!loading && !data && (
          <div className="w-full rounded-md border border-[#232b47] bg-[#11172b] p-6">
            <h2 className={`${DISPLAY} text-xl`}>{t("states.failedTitle")}</h2>
            <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-[#9097ad]">
              {t("states.failedBody")}
            </p>
          </div>
        )}

        <footer className="mt-6 max-w-2xl border-t border-[#232b47] pt-5 text-xs leading-relaxed text-[#9097ad]">
          {t("footer")}
        </footer>
      </div>
    </main>
  );
}
