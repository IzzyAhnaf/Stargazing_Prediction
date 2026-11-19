"use client";

import React from "react";
import { SHAPExplanationPayload } from "@/types/stargazing";
import { TONE } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

const DISPLAY = "font-[family-name:var(--font-display)]";

interface SHAPDrawerProps {
  explanation: SHAPExplanationPayload;
  score: number;
  /** Already formatted in the caller's chosen display timezone (e.g. "22:00"). */
  timeStr: string;
  /** Short zone label to show next to timeStr (e.g. "WIB", "UTC"). Defaults to "UTC". */
  zoneLabel?: string;
}

export const SHAPDrawer: React.FC<SHAPDrawerProps> = ({
  explanation,
  score,
  timeStr,
  zoneLabel = "UTC",
}) => {
  const { t } = useI18n();
  const shapDict = explanation.feature_shap_values || {};
  const sortedFeatures = Object.entries(shapDict).sort(
    (a, b) => Math.abs(Number(b[1])) - Math.abs(Number(a[1]))
  );
  const maxAbs = Math.max(1, ...sortedFeatures.map(([, v]) => Math.abs(Number(v))));

  return (
    <section className="w-full flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className={`${DISPLAY} text-xl`}>{t("shap.whyThisScore")}</h2>
        <p className="text-sm text-[#9097ad]">
          {t("shap.modelStarts")}{" "}
          <span className="tabular-nums text-[#e9e6dc]">{explanation.base_score ?? 49.1}</span>{" "}
          {t("shap.andLandsOn")}{" "}
          <span className="tabular-nums text-[#e9e6dc]">{Math.round(score)}</span> {t("shap.forLabel")}{" "}
          {timeStr} {zoneLabel}.
        </p>
      </div>

      {/* NOTE: verdict and primary_driver are prose generated server-side by
          the backend's SHAP explainer — not re-translated here. The backend
          already writes them in the requested language (see the `lang`
          param threaded through src/lib/api.ts / src/app/page.tsx and the
          scope note at the top of src/lib/i18n.tsx). */}
      <div className="flex flex-col gap-2">
        <p className={`${DISPLAY} text-2xl leading-snug text-[#e9e6dc]`}>{explanation.verdict}</p>
        <p className="text-sm text-[#9097ad]">
          {t("shap.biggestFactor")} <span className="text-[#e9e6dc]">{explanation.primary_driver}</span>
        </p>
      </div>

      {sortedFeatures.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm text-[#9097ad]">{t("shap.pointsAdded")}</h3>
          <ul className="flex flex-col gap-2.5">
            {sortedFeatures.map(([feat, val]) => {
              const numVal = Number(val);
              const isPos = numVal >= 0;
              const color = isPos ? TONE.excellent : TONE.poor;
              const pct = numVal === 0 ? 0 : Math.max(1, (Math.abs(numVal) / maxAbs) * 50);
              const sign = numVal > 0 ? "+" : numVal < 0 ? "−" : "";
              const name = feat.replace(/_/g, " ");

              return (
                <li
                  key={feat}
                  className="grid grid-cols-[7.5rem_1fr_3.25rem] items-center gap-3 text-sm sm:grid-cols-[10rem_1fr_3.5rem]"
                >
                  <span className="truncate capitalize text-[#b3b0a6]" title={name}>
                    {name}
                  </span>
                  <span className="relative h-2" aria-hidden>
                    <span className="absolute inset-y-[-3px] left-1/2 w-px bg-[#3a4466]" />
                    <span
                      className="absolute inset-y-0 rounded-[2px]"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: color,
                        ...(isPos ? { left: "50%" } : { right: "50%" }),
                      }}
                    />
                  </span>
                  <span className="text-right tabular-nums" style={{ color }}>
                    {sign}
                    {Math.abs(numVal).toFixed(1)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 border-t border-[#232b47] pt-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2.5">
          <h3 className="text-sm" style={{ color: TONE.excellent }}>
            {t("shap.helping")}
          </h3>
          {explanation.positive_factors && explanation.positive_factors.length > 0 ? (
            <ul className="flex flex-col gap-2 text-sm leading-snug text-[#d4d1c6]">
              {explanation.positive_factors.map((factor, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="shrink-0" style={{ color: TONE.excellent }} aria-hidden>
                    +
                  </span>
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#9097ad]">{t("shap.nothingBoosting")}</p>
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          <h3 className="text-sm" style={{ color: TONE.poor }}>
            {t("shap.holdingBack")}
          </h3>
          {explanation.negative_factors && explanation.negative_factors.length > 0 ? (
            <ul className="flex flex-col gap-2 text-sm leading-snug text-[#d4d1c6]">
              {explanation.negative_factors.map((factor, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="shrink-0" style={{ color: TONE.poor }} aria-hidden>
                    −
                  </span>
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#9097ad]">{t("shap.nothingPulling")}</p>
          )}
        </div>
      </div>
    </section>
  );
};
