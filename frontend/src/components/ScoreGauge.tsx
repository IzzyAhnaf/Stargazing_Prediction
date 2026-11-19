"use client";

import React from "react";
import { BestVisitWindow } from "@/types/stargazing";
import { scoreTone, TONE } from "@/lib/theme";
import { formatTimeInZone, zoneAbbrLabel, DEFAULT_TIMEZONE_PREF } from "@/lib/timezone";
import { useI18n } from "@/lib/i18n";

const DISPLAY = "font-[family-name:var(--font-display)]";

interface ScoreGaugeProps {
  score: number;
  ratingCategory: string;
  bestWindow?: BestVisitWindow;
  /** Timezone to display the best-window peak time in. Defaults to the device's own timezone. */
  timezonePref?: string;
}

// Dial geometry: 270° sweep, starting bottom-left, like the scale on an observing dial.
const CX = 120;
const CY = 120;
const START_DEG = 135;
const SWEEP_DEG = 270;

function polar(r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return {
    x: Number((CX + r * Math.cos(a)).toFixed(2)),
    y: Number((CY + r * Math.sin(a)).toFixed(2)),
  };
}

// One tick per 2 points; every 10th tick is longer.
const TICKS = Array.from({ length: 51 }, (_, i) => i * 2).map((v) => {
  const major = v % 10 === 0;
  const angle = START_DEG + (v / 100) * SWEEP_DEG;
  return { v, major, a: polar(major ? 80 : 86, angle), b: polar(96, angle) };
});

const NUMERALS = [0, 50, 100].map((v) => ({
  v,
  ...polar(67, START_DEG + (v / 100) * SWEEP_DEG),
}));

function sentenceCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  score,
  ratingCategory,
  bestWindow,
  timezonePref = DEFAULT_TIMEZONE_PREF,
}) => {
  const { t, tValue } = useI18n();
  const normalized = Math.max(0, Math.min(100, score));
  const rounded = Math.round(normalized);
  const tone = scoreTone(normalized);
  const category = tValue("ratingCategory", sentenceCase(ratingCategory));

  return (
    <section className="w-full rounded-md border border-[#232b47] bg-[#11172b] p-6 flex flex-col gap-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={`${DISPLAY} text-xl`}>{t("scoreGauge.clarityScore")}</h2>
        <span className="text-sm text-[#9097ad]">{t("scoreGauge.selectedHour")}</span>
      </div>

      <div className="relative mx-auto w-full max-w-[300px] aspect-square">
        <svg
          viewBox="0 0 240 240"
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label={`Clarity score ${rounded} out of 100, ${category}`}
        >
          <circle cx={CX} cy={CY} r={58} fill="none" stroke="#1b2340" strokeWidth={1} />
          <circle cx={CX} cy={CY} r={40} fill="none" stroke="#1b2340" strokeWidth={1} strokeDasharray="2 4" />

          {TICKS.map((t) => (
            <line
              key={t.v}
              x1={t.a.x}
              y1={t.a.y}
              x2={t.b.x}
              y2={t.b.y}
              stroke={t.v <= rounded ? tone.color : "#2a3351"}
              strokeWidth={t.major ? 2 : 1.25}
              strokeLinecap="round"
              className="transition-[stroke] duration-500 motion-reduce:transition-none"
            />
          ))}

          {NUMERALS.map((n) => (
            <text
              key={n.v}
              x={n.x}
              y={n.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={9}
              fill="#9097ad"
            >
              {n.v}
            </text>
          ))}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className={`${DISPLAY} text-6xl leading-none tabular-nums text-[#e9e6dc]`}>
            {rounded}
          </span>
          <span className="mt-1.5 text-xs text-[#9097ad]">{t("scoreGauge.outOf100")}</span>
          <span className="mt-2 text-base font-medium" style={{ color: tone.color }}>
            {category}
          </span>
        </div>
      </div>

      {bestWindow && (
        <div className="border-t border-[#232b47] pt-5 flex flex-col gap-4">
          <h3 className="text-sm text-[#9097ad]">{t("scoreGauge.bestWindow")}</h3>

          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-[#9097ad]">{t("scoreGauge.peak")}</dt>
              <dd className="tabular-nums">
                {bestWindow.peak_time ? formatTimeInZone(bestWindow.peak_time, timezonePref) : "—"}
                <span className="text-[#9097ad]"> {zoneAbbrLabel(timezonePref)}</span>
                <span
                  className="ml-3 font-medium"
                  style={{ color: scoreTone(Number(bestWindow.peak_score)).color }}
                >
                  {Math.round(Number(bestWindow.peak_score))}
                </span>
              </dd>
            </div>

            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-[#9097ad]">{t("scoreGauge.milkyWayCore")}</dt>
              <dd style={{ color: bestWindow.milky_way_core_visible ? TONE.violet : "#9097ad" }}>
                {bestWindow.milky_way_core_visible
                  ? t("scoreGauge.aboveHorizon")
                  : t("scoreGauge.belowHorizon")}
              </dd>
            </div>
          </dl>

          <p className="text-sm leading-relaxed text-[#c9c6bb]">
            {bestWindow.key_recommendation}
          </p>
        </div>
      )}
    </section>
  );
};
