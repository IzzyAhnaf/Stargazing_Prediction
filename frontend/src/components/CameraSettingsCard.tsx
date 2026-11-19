"use client";

import React from "react";
import { HourlyForecastItem, LocationMetadata } from "@/types/stargazing";
import { TONE } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

const DISPLAY = "font-[family-name:var(--font-display)]";

interface CameraSettingsCardProps {
  currentHour: HourlyForecastItem;
  location: LocationMetadata;
}

interface SettingRow {
  label: string;
  value: string;
  note: string;
  color?: string;
}

export const CameraSettingsCard: React.FC<CameraSettingsCardProps> = ({
  currentHour,
  location,
}) => {
  const { t } = useI18n();
  const bortle = location.bortle_scale;
  const dewSpread = currentHour.dew_point_spread ?? 5.0;
  const moonIllum = currentHour.moon_illumination;
  const isMoonDown = currentHour.moon_altitude <= 0;

  let recIso = "3200–6400";
  let isoNote = t("camera.isoNoteLow");
  if (bortle >= 7 || (!isMoonDown && moonIllum > 0.5)) {
    recIso = "400–800";
    isoNote = t("camera.isoNoteBright");
  } else if (bortle >= 4) {
    recIso = "1600–3200";
    isoNote = t("camera.isoNoteBalance");
  }

  const dewWarning = dewSpread < 3.0;

  const rows: SettingRow[] = [
    { label: t("camera.iso"), value: recIso, note: isoNote },
    {
      label: t("camera.shutter"),
      value: t("camera.shutterValue"),
      note: t("camera.shutterNote"),
    },
    {
      label: t("camera.aperture"),
      value: t("camera.apertureValue"),
      note: t("camera.apertureNote"),
    },
    {
      label: t("camera.dewHeaterBand"),
      value: dewWarning ? t("camera.required") : t("camera.notNeeded"),
      color: dewWarning ? TONE.poor : TONE.excellent,
      note: dewWarning
        ? t("camera.dewNoteRequired", { spread: dewSpread.toFixed(1) })
        : t("camera.dewNoteNotNeeded", { spread: dewSpread.toFixed(1) }),
    },
  ];

  return (
    <section className="w-full">
      <h2 className={`${DISPLAY} text-xl`}>{t("camera.title")}</h2>
      <p className="mb-4 mt-1 text-sm text-[#9097ad]">{t("camera.subtitle", { bortle })}</p>

      <dl className="border-b border-[#232b47]">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1 border-t border-[#232b47] py-4"
          >
            <dt className="text-sm text-[#9097ad]">{row.label}</dt>
            <dd
              className={`${DISPLAY} text-right text-2xl leading-none tabular-nums`}
              style={{ color: row.color ?? "#e9e6dc" }}
            >
              {row.value}
            </dd>
            <dd className="col-span-2 max-w-[46ch] text-xs leading-relaxed text-[#9097ad]">
              {row.note}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
};
