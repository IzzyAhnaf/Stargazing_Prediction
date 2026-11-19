"use client";

import React from "react";
import { HourlyForecastItem, LocationMetadata } from "@/types/stargazing";
import { TONE } from "@/lib/theme";
import { formatTimeInZone, zoneAbbrLabel, DEFAULT_TIMEZONE_PREF } from "@/lib/timezone";
import { useI18n } from "@/lib/i18n";

const DISPLAY = "font-[family-name:var(--font-display)]";
const MUTED = "#9097ad";

interface ConditionChecklistProps {
  currentHour: HourlyForecastItem;
  location: LocationMetadata;
  /** Timezone to display the "Conditions at ..." time in. Defaults to the device's own timezone. */
  timezonePref?: string;
}

interface ReadingProps {
  label: string;
  status: string;
  tone: string;
  value: React.ReactNode;
  unit: string;
  detail: React.ReactNode;
}

const Reading: React.FC<ReadingProps> = ({ label, status, tone, value, unit, detail }) => (
  <div className="flex flex-col gap-2 border-t border-[#232b47] py-4">
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-sm text-[#9097ad]">{label}</dt>
      <dd className="flex items-center gap-1.5 text-xs" style={{ color: tone }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tone }} aria-hidden />
        {status}
      </dd>
    </div>

    <dd className="flex items-baseline gap-1.5">
      <span className={`${DISPLAY} text-4xl leading-none tabular-nums text-[#e9e6dc]`}>{value}</span>
      <span className="text-sm text-[#9097ad]">{unit}</span>
    </dd>

    <dd className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-[#9097ad]">{detail}</dd>
  </div>
);

const Fact: React.FC<{ label: string; value: React.ReactNode; color?: string }> = ({
  label,
  value,
  color,
}) => (
  <span>
    {label}{" "}
    <span className="tabular-nums" style={{ color: color ?? "#d4d1c6" }}>
      {value}
    </span>
  </span>
);

export const ConditionChecklist: React.FC<ConditionChecklistProps> = ({
  currentHour,
  location,
  timezonePref = DEFAULT_TIMEZONE_PREF,
}) => {
  const { t, tValue } = useI18n();
  // 1. Cloud cover
  const totalClouds = currentHour.cloud_cover;
  const isCloudOptimal = totalClouds <= 15;
  const isCloudModerate = totalClouds <= 40;

  // 2. Milky Way core
  const mwAlt = currentHour.milky_way_core_altitude;
  const isMwAbove = mwAlt > 0;
  const isMwPrime = currentHour.is_milky_way_prime_window;

  // 3. Moon
  const isMoonDown = currentHour.moon_altitude <= 0;
  const moonIllumPct = Math.round(currentHour.moon_illumination * 100);

  // 4. Dew spread
  const dewSpread = currentHour.dew_point_spread ?? 5.0;
  const isDewSafe = dewSpread >= 3.0;

  // 5. Bortle
  const bortle = location.bortle_scale;

  // 6. Visibility
  const visKm = currentHour.visibility_meters
    ? Math.round(currentHour.visibility_meters / 1000)
    : 25;

  const degrees = (n: number | null | undefined) => (n != null ? `${n}°C` : "—");
  const signed = (n: number) => `${Math.round(n)}`.replace("-", "−");

  const readings: ReadingProps[] = [
    {
      label: t("conditions.cloudCover"),
      status: isCloudOptimal
        ? t("conditions.clear")
        : isCloudModerate
        ? t("conditions.partlyCloudy")
        : t("conditions.overcast"),
      tone: isCloudOptimal ? TONE.excellent : isCloudModerate ? TONE.fair : TONE.poor,
      value: Math.round(totalClouds),
      unit: "%",
      detail: (
        <>
          <Fact label={t("conditions.high")} value={`${Math.round(currentHour.cloud_cover_high)}%`} />
          <Fact label={t("conditions.mid")} value={`${Math.round(currentHour.cloud_cover_mid)}%`} />
          <Fact label={t("conditions.low")} value={`${Math.round(currentHour.cloud_cover_low)}%`} />
        </>
      ),
    },
    {
      label: t("conditions.milkyWayCore"),
      status: isMwPrime
        ? t("conditions.primeWindow")
        : isMwAbove
        ? t("conditions.aboveHorizon")
        : t("conditions.belowHorizon"),
      tone: isMwPrime ? TONE.violet : isMwAbove ? "#d4d1c6" : MUTED,
      value: isMwAbove ? `+${Math.round(mwAlt)}` : signed(mwAlt),
      unit: t("conditions.altitudeUnit"),
      detail: (
        <Fact label={t("conditions.azimuth")} value={`${Math.round(currentHour.milky_way_core_azimuth)}°`} />
      ),
    },
    {
      label: t("conditions.moon"),
      status: isMoonDown
        ? t("conditions.moonDown")
        : moonIllumPct < 30
        ? t("conditions.faint")
        : t("conditions.bright"),
      tone: isMoonDown ? TONE.excellent : moonIllumPct < 30 ? TONE.good : TONE.fair,
      value: moonIllumPct,
      unit: t("conditions.litUnit"),
      detail: (
        <>
          <span className="text-[#d4d1c6]">{tValue("moonPhase", currentHour.moon_phase_name)}</span>
          <Fact label={t("conditions.altitude")} value={`${Math.round(currentHour.moon_altitude)}°`} />
          <Fact
            label={t("conditions.glare")}
            value={isMoonDown ? t("conditions.none") : t("conditions.active")}
            color={isMoonDown ? TONE.excellent : TONE.fair}
          />
        </>
      ),
    },
    {
      label: t("conditions.dewMargin"),
      status: isDewSafe ? t("conditions.dry") : t("conditions.dewRisk"),
      tone: isDewSafe ? TONE.excellent : TONE.poor,
      value: dewSpread.toFixed(1),
      unit: t("conditions.dewUnit"),
      detail: (
        <>
          <Fact label={t("conditions.air")} value={degrees(currentHour.temperature)} />
          <Fact label={t("conditions.dewPoint")} value={degrees(currentHour.dew_point)} />
        </>
      ),
    },
    {
      label: t("conditions.lightPollution"),
      status:
        bortle <= 2
          ? t("conditions.darkSky")
          : bortle <= 4
          ? t("conditions.rural")
          : bortle <= 6
          ? t("conditions.suburban")
          : t("conditions.urban"),
      tone: bortle <= 3 ? TONE.excellent : bortle <= 5 ? TONE.fair : TONE.poor,
      value: bortle,
      unit: t("conditions.bortleUnit"),
      detail: (
        <>
          <Fact label={t("conditions.elevation")} value={`${location.elevation} m`} />
          <Fact label={t("conditions.source")} value={location.bortle_source} />
        </>
      ),
    },
    {
      label: t("conditions.transparency"),
      status: visKm >= 30 ? t("conditions.excellent") : t("conditions.moderate"),
      tone: visKm >= 30 ? TONE.good : TONE.fair,
      value: visKm,
      unit: t("conditions.kmVisibility"),
      detail: (
        <>
          <Fact label={t("conditions.humidity")} value={`${Math.round(currentHour.relative_humidity)}%`} />
          <span style={{ color: currentHour.is_astronomical_night ? TONE.excellent : TONE.fair }}>
            {currentHour.is_astronomical_night ? t("conditions.astronomicalNight") : t("conditions.twilight")}
          </span>
        </>
      ),
    },
  ];

  return (
    <section className="w-full">
      <h2 className={`${DISPLAY} mb-4 text-xl`}>
        {t("conditions.conditionsAt")} {formatTimeInZone(currentHour.timestamp_utc, timezonePref)}{" "}
        {zoneAbbrLabel(timezonePref)}
      </h2>

      <dl className="grid grid-cols-1 gap-x-10 border-b border-[#232b47] sm:grid-cols-2">
        {readings.map((r) => (
          <Reading key={r.label} {...r} />
        ))}
      </dl>
    </section>
  );
};
