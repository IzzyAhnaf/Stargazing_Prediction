"use client";

import React from "react";
import { HourlyForecastItem } from "@/types/stargazing";
import { scoreTone, TONE } from "@/lib/theme";
import { formatTimeInZone, zoneAbbrLabel, DEFAULT_TIMEZONE_PREF } from "@/lib/timezone";
import { useI18n } from "@/lib/i18n";

const DISPLAY = "font-[family-name:var(--font-display)]";

interface HourlyTimelineProps {
  hourlyData: HourlyForecastItem[];
  selectedHourIndex: number;
  onSelectHour: (index: number) => void;
  /** Timezone to display hour labels in. Defaults to the device's own timezone. */
  timezonePref?: string;
}

const THRESHOLDS = [45, 65, 80];

/**
 * Picks ONE contiguous stretch of night hours (sun below the horizon) to
 * display, rather than every night hour in the whole forecast window.
 *
 * `hourlyData` can span multiple days (forecast_days > 1), so a plain
 * `.filter(sun_altitude < 0)` concatenates every night back-to-back —
 * e.g. the last few hours of tonight (ending ~05:00) immediately followed
 * by the first few hours of tomorrow night (starting ~18:00), with no
 * daytime hours in between to show the gap. On the chart that reads as a
 * single timeline jumping straight from early morning to evening. We fix
 * that by only taking ONE full night block, so hours shown are always in
 * one unbroken overnight sequence.
 *
 * Which block, though, matters too: `hourlyData[0]` is whatever hour the
 * backend's fetch window happened to start at (fixed in UTC), which lands
 * at a different point in the local evening for every longitude. If that
 * first hour already falls inside a night, the block starting at index 0
 * is a night ALREADY IN PROGRESS — missing its earlier hours because the
 * fetched data simply doesn't go back further — not a short night. That's
 * why the same kind of location can show 6 hours one time and 7 another:
 * it's not a shorter/longer real night, it's how much of it got cut off at
 * the front by where the data window happened to start. So we skip a block
 * that touches index 0 and prefer the next complete one (bracketed by
 * daytime on both sides), which is never front-truncated.
 */
function firstNightBlock(data: HourlyForecastItem[]): HourlyForecastItem[] {
  const blocks: Array<{ start: number; end: number }> = [];
  let i = 0;
  while (i < data.length) {
    if (data[i].sun_altitude < 0) {
      const start = i;
      while (i + 1 < data.length && data[i + 1].sun_altitude < 0) i++;
      blocks.push({ start, end: i });
    }
    i++;
  }
  if (blocks.length === 0) return [];
  const complete = blocks.find((b) => b.start > 0) ?? blocks[0];
  return data.slice(complete.start, complete.end + 1);
}

export const HourlyTimeline: React.FC<HourlyTimelineProps> = ({
  hourlyData,
  selectedHourIndex,
  onSelectHour,
  timezonePref = DEFAULT_TIMEZONE_PREF,
}) => {
  const { t } = useI18n();
  const nightHours = firstNightBlock(hourlyData);
  const displayItems = nightHours.length > 0 ? nightHours : hourlyData.slice(0, 16);
  const zoneLabel = zoneAbbrLabel(timezonePref);

  const legend = [
    { color: TONE.excellent, label: t("timeline.legendExcellent"), range: t("timeline.rangeExcellent") },
    { color: TONE.good, label: t("timeline.legendGood"), range: t("timeline.rangeGood") },
    { color: TONE.fair, label: t("timeline.legendFair"), range: t("timeline.rangeFair") },
    { color: TONE.poor, label: t("timeline.legendPoor"), range: t("timeline.rangePoor") },
  ];

  return (
    <section className="w-full rounded-md border border-[#232b47] bg-[#11172b] p-5 sm:p-6 flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div>
          <h2 className={`${DISPLAY} text-xl`}>{t("timeline.title")}</h2>
          <p className="mt-1 text-sm text-[#9097ad]">{t("timeline.subtitle", { zone: zoneLabel })}</p>
        </div>

        <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-[#9097ad]">
          {legend.map((l) => (
            <li key={l.label} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: l.color }} aria-hidden />
              <span>
                <span className="text-[#e9e6dc]">{l.label}</span> {l.range}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="relative w-full pt-6" style={{ minWidth: displayItems.length * 40 }}>
          {/* Threshold guides, aligned to the bar area below */}
          <div className="pointer-events-none absolute inset-x-0 top-6 h-40" aria-hidden>
            {THRESHOLDS.map((t) => (
              <div
                key={t}
                className="absolute inset-x-0 border-t border-dashed border-[#2a3351]"
                style={{ bottom: `${t}%` }}
              />
            ))}
          </div>

          <div className="relative flex gap-1">
            {displayItems.map((item) => {
              const originalIndex = hourlyData.indexOf(item);
              const isSelected = originalIndex === selectedHourIndex;
              const score = item.stargazing_score;
              const timeStr = formatTimeInZone(item.timestamp_utc, timezonePref);
              const mwAlt = Math.round(item.milky_way_core_altitude);
              const height = Math.max(3, Math.min(100, score));
              const color = scoreTone(score).color;

              return (
                <button
                  key={item.timestamp_utc}
                  type="button"
                  onClick={() => onSelectHour(originalIndex)}
                  aria-pressed={isSelected}
                  aria-label={`${timeStr} ${zoneLabel}, clarity ${Math.round(score)}, cloud cover ${Math.round(item.cloud_cover)} percent`}
                  title={`${timeStr} ${zoneLabel}: clarity ${Math.round(score)}, cloud ${Math.round(item.cloud_cover)}%`}
                  className={`relative flex min-w-[36px] flex-1 flex-col items-center gap-2 rounded-sm pb-2 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9db8ff] ${
                    isSelected ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
                  }`}
                >
                  <span className="relative flex h-40 w-full items-end justify-center">
                    {isSelected && (
                      <span
                        className="absolute left-1/2 -translate-x-1/2 text-xs font-medium tabular-nums"
                        style={{ bottom: `calc(${height}% + 4px)`, color }}
                      >
                        {Math.round(score)}
                      </span>
                    )}
                    <span
                      className="block w-3.5 rounded-t-[3px] transition-opacity motion-reduce:transition-none"
                      style={{
                        height: `${height}%`,
                        backgroundColor: color,
                        opacity: isSelected ? 1 : 0.5,
                      }}
                    />
                  </span>

                  <span
                    className={`text-xs tabular-nums ${isSelected ? "text-[#e9e6dc] font-medium" : "text-[#b3b0a6]"}`}
                  >
                    {timeStr}
                  </span>
                  <span
                    className="text-[11px] tabular-nums"
                    style={{ color: mwAlt > 0 ? TONE.violet : "#4a5272" }}
                  >
                    {mwAlt > 0 ? `${mwAlt}°` : "–"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-[#9097ad]">{t("timeline.footerNote")}</p>
    </section>
  );
};
