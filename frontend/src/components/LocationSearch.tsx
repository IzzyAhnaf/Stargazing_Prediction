"use client";

import React, { useEffect, useState } from "react";
import {
  Calendar,
  SlidersHorizontal,
  LocateFixed,
  Search,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

export interface LocationPreset {
  name: string;
  lat: number;
  lon: number;
  elevation: number;
  bortle: number;
  country: string;
}

// 12 Indonesian sites (spread across the archipelago) + 12 international
// sites, each tagged with its `country` so LocationSearch can group them
// into "Indonesia" / "International" in the site picker. Elevation and
// Bortle class are reasonable real-world estimates for each site; `country`
// drives the grouping below (treat "Indonesia" as the Indonesia group,
// everything else as international).
export const PRESET_LOCATIONS: LocationPreset[] = [
  // --- Indonesia ---
  {
    name: "Mount Bromo",
    lat: -7.9425,
    lon: 112.953,
    elevation: 2329,
    bortle: 3,
    country: "Indonesia",
  },
  {
    name: "Jakarta",
    lat: -6.1751,
    lon: 106.865,
    elevation: 10,
    bortle: 9,
    country: "Indonesia",
  },
  {
    name: "Dieng Plateau",
    lat: -7.2086,
    lon: 109.9091,
    elevation: 2093,
    bortle: 3,
    country: "Indonesia",
  },
  {
    name: "Kawah Ijen",
    lat: -8.0581,
    lon: 114.2423,
    elevation: 2386,
    bortle: 3,
    country: "Indonesia",
  },
  {
    name: "Mount Rinjani",
    lat: -8.4109,
    lon: 116.4575,
    elevation: 3726,
    bortle: 2,
    country: "Indonesia",
  },
  {
    name: "Labuan Bajo",
    lat: -8.4932,
    lon: 119.887,
    elevation: 15,
    bortle: 3,
    country: "Indonesia",
  },
  {
    name: "Komodo National Park",
    lat: -8.5451,
    lon: 119.4897,
    elevation: 50,
    bortle: 2,
    country: "Indonesia",
  },
  {
    name: "Kelimutu",
    lat: -8.7585,
    lon: 121.8169,
    elevation: 1639,
    bortle: 2,
    country: "Indonesia",
  },
  {
    name: "Raja Ampat",
    lat: -0.2342,
    lon: 130.5252,
    elevation: 5,
    bortle: 2,
    country: "Indonesia",
  },
  {
    name: "Derawan Island",
    lat: 2.2865,
    lon: 118.2436,
    elevation: 2,
    bortle: 2,
    country: "Indonesia",
  },
  {
    name: "Sabang (Weh Island)",
    lat: 5.8769,
    lon: 95.3221,
    elevation: 100,
    bortle: 2,
    country: "Indonesia",
  },
  {
    name: "Tana Toraja",
    lat: -3.0875,
    lon: 119.8268,
    elevation: 800,
    bortle: 3,
    country: "Indonesia",
  },

  // --- International ---
  {
    name: "Mauna Kea",
    lat: 19.8206,
    lon: -155.4681,
    elevation: 4205,
    bortle: 1,
    country: "USA",
  },
  {
    name: "Atacama Desert",
    lat: -24.6272,
    lon: -70.4042,
    elevation: 2635,
    bortle: 1,
    country: "Chile",
  },
  {
    name: "Joshua Tree",
    lat: 33.8734,
    lon: -115.901,
    elevation: 820,
    bortle: 3,
    country: "USA",
  },
  {
    name: "NamibRand",
    lat: -24.9833,
    lon: 16.0333,
    elevation: 1200,
    bortle: 1,
    country: "Namibia",
  },
  {
    name: "Aoraki Mackenzie",
    lat: -43.9333,
    lon: 170.1167,
    elevation: 700,
    bortle: 1,
    country: "New Zealand",
  },
  {
    name: "La Palma",
    lat: 28.7569,
    lon: -17.885,
    elevation: 2396,
    bortle: 1,
    country: "Spain",
  },
  {
    name: "Pic du Midi",
    lat: 42.9369,
    lon: 0.1411,
    elevation: 2877,
    bortle: 2,
    country: "France",
  },
  {
    name: "Merzouga",
    lat: 31.0801,
    lon: -4.0133,
    elevation: 760,
    bortle: 2,
    country: "Morocco",
  },
  {
    name: "Uluru",
    lat: -25.3444,
    lon: 131.0369,
    elevation: 863,
    bortle: 1,
    country: "Australia",
  },
  {
    name: "Jasper National Park",
    lat: 52.8734,
    lon: -118.0814,
    elevation: 1070,
    bortle: 2,
    country: "Canada",
  },
  {
    name: "Þingvellir",
    lat: 64.2559,
    lon: -21.1297,
    elevation: 150,
    bortle: 2,
    country: "Iceland",
  },
  {
    name: "Hanle",
    lat: 32.7794,
    lon: 78.9639,
    elevation: 4500,
    bortle: 1,
    country: "India",
  },
];

const INDONESIA_PRESETS = PRESET_LOCATIONS.filter((p) => p.country === "Indonesia");
const INTERNATIONAL_PRESETS = PRESET_LOCATIONS.filter((p) => p.country !== "Indonesia");

function presetKey(p: LocationPreset) {
  return `${p.name}|${p.country}`;
}

interface LocationSearchProps {
  currentLat: number;
  currentLon: number;
  currentDate?: string;
  onSearch: (lat: number, lon: number, date?: string, elevation?: number, bortle?: number) => void;
  isLoading: boolean;
}

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9db8ff]";

export const LocationSearch: React.FC<LocationSearchProps> = ({
  currentLat,
  currentLon,
  currentDate,
  onSearch,
  isLoading,
}) => {
  const { t, tValue } = useI18n();
  const [latInput, setLatInput] = useState(currentLat.toString());
  const [lonInput, setLonInput] = useState(currentLon.toString());
  const [elevInput, setElevInput] = useState("");
  // Starts as whatever the parent already has (possibly "" on first render,
  // since page.tsx itself sets the real default date inside a useEffect —
  // see its `date` state for why `new Date()` can't be read directly here
  // during render either). Synced from the parent below.
  const [dateInput, setDateInput] = useState(currentDate || "");
  const [showCustom, setShowCustom] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    if (currentDate) setDateInput(currentDate);
  }, [currentDate]);

  const handleSelectPreset = (preset: LocationPreset) => {
    setLatInput(preset.lat.toString());
    setLonInput(preset.lon.toString());
    setElevInput(preset.elevation.toString());
    onSearch(preset.lat, preset.lon, dateInput, preset.elevation, preset.bortle);
  };

  const selectedPreset = PRESET_LOCATIONS.find(
    (p) => Math.abs(currentLat - p.lat) < 0.01 && Math.abs(currentLon - p.lon) < 0.01
  );

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(latInput);
    const lon = parseFloat(lonInput);
    const elev = elevInput ? parseFloat(elevInput) : undefined;
    if (!isNaN(lat) && !isNaN(lon)) {
      onSearch(lat, lon, dateInput, elev);
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert(t("locationSearch.geoNotSupported"));
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const uLat = Number(pos.coords.latitude.toFixed(4));
        const uLon = Number(pos.coords.longitude.toFixed(4));
        const uElev = pos.coords.altitude ? Math.round(pos.coords.altitude) : undefined;
        setLatInput(uLat.toString());
        setLonInput(uLon.toString());
        if (uElev !== undefined) setElevInput(uElev.toString());
        onSearch(uLat, uLon, dateInput, uElev);
        setIsLocating(false);
      },
      (err) => {
        console.warn("Geolocation failed:", err.message);
        setIsLocating(false);
      },
      { timeout: 8000 }
    );
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Site selector: a grouped dropdown (24 presets across Indonesia +
            international sites is too many to show as a pill row). */}
        <label className="flex max-w-full items-center gap-2 rounded-md border border-[#232b47] bg-[#11172b] px-2.5 py-1.5 text-sm text-[#9097ad] focus-within:ring-2 focus-within:ring-[#9db8ff]">
          <span className="sr-only">{t("locationSearch.observingSite")}</span>
          <select
            value={selectedPreset ? presetKey(selectedPreset) : ""}
            onChange={(e) => {
              const preset = PRESET_LOCATIONS.find((p) => presetKey(p) === e.target.value);
              if (preset) handleSelectPreset(preset);
            }}
            disabled={isLoading}
            className="max-w-[220px] bg-transparent text-sm text-[#e9e6dc] focus:outline-none disabled:opacity-50 sm:max-w-none"
          >
            {!selectedPreset && (
              <option value="" disabled className="bg-[#11172b] text-[#9097ad]">
                {t("locationSearch.observingSite")}
              </option>
            )}
            <optgroup label={t("locationSearch.indonesia")} className="bg-[#11172b] text-[#e9e6dc]">
              {INDONESIA_PRESETS.map((preset) => (
                <option
                  key={presetKey(preset)}
                  value={presetKey(preset)}
                  title={`Bortle ${preset.bortle}`}
                  className="bg-[#11172b] text-[#e9e6dc]"
                >
                  {tValue("locationNames", preset.name)} · Bortle {preset.bortle}
                </option>
              ))}
            </optgroup>
            <optgroup label={t("locationSearch.international")} className="bg-[#11172b] text-[#e9e6dc]">
              {INTERNATIONAL_PRESETS.map((preset) => (
                <option
                  key={presetKey(preset)}
                  value={presetKey(preset)}
                  title={`Bortle ${preset.bortle}`}
                  className="bg-[#11172b] text-[#e9e6dc]"
                >
                  {tValue("locationNames", preset.name)}, {tValue("locationCountries", preset.country)} · Bortle{" "}
                  {preset.bortle}
                </option>
              ))}
            </optgroup>
          </select>
        </label>

        {/* Date, GPS, coordinates */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-md border border-[#232b47] bg-[#11172b] px-2.5 py-1.5 text-sm text-[#9097ad] focus-within:ring-2 focus-within:ring-[#9db8ff]">
            <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="sr-only">{t("locationSearch.forecastDate")}</span>
            <input
              type="date"
              value={dateInput}
              onChange={(e) => {
                setDateInput(e.target.value);
                const lat = parseFloat(latInput);
                const lon = parseFloat(lonInput);
                const elev = elevInput ? parseFloat(elevInput) : undefined;
                if (!isNaN(lat) && !isNaN(lon)) {
                  onSearch(lat, lon, e.target.value, elev);
                }
              }}
              className="bg-transparent text-sm text-[#e9e6dc] tabular-nums [color-scheme:dark] focus:outline-none"
            />
          </label>

          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={isLocating || isLoading}
            title="Use my current location"
            className={`flex items-center gap-1.5 rounded-md border border-[#232b47] bg-[#11172b] px-2.5 py-1.5 text-sm text-[#9097ad] transition-colors hover:text-[#e9e6dc] motion-reduce:transition-none disabled:opacity-50 ${FOCUS}`}
          >
            <LocateFixed className={`h-3.5 w-3.5 ${isLocating ? "animate-spin" : ""}`} aria-hidden />
            <span className="hidden md:inline">
              {isLocating ? t("locationSearch.locating") : t("locationSearch.useMyLocation")}
            </span>
            <span className="sr-only md:hidden">{t("locationSearch.useMyLocation")}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCustom(!showCustom)}
            aria-expanded={showCustom}
            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm transition-colors motion-reduce:transition-none ${FOCUS} ${
              showCustom
                ? "border-[#3a4466] bg-[#232b47] text-[#e9e6dc]"
                : "border-[#232b47] bg-[#11172b] text-[#9097ad] hover:text-[#e9e6dc]"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
            {t("locationSearch.coordinates")}
          </button>
        </div>
      </div>

      {showCustom && (
        <form
          onSubmit={handleCustomSubmit}
          className="grid grid-cols-1 gap-3 rounded-md border border-[#232b47] bg-[#11172b] p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
        >
          {[
            { label: t("locationSearch.latitude"), placeholder: "-7.9425", value: latInput, setter: setLatInput },
            { label: t("locationSearch.longitude"), placeholder: "112.9530", value: lonInput, setter: setLonInput },
            {
              label: t("locationSearch.elevationM"),
              placeholder: t("locationSearch.optional"),
              value: elevInput,
              setter: setElevInput,
            },
          ].map(({ label, placeholder, value, setter }) => (
            <label key={label} className="flex flex-col gap-1.5 text-xs text-[#9097ad]">
              {label}
              <input
                type="number"
                step="any"
                placeholder={placeholder}
                value={value}
                onChange={(e) => setter(e.target.value)}
                className={`w-full rounded-md border border-[#232b47] bg-[#0b0f1e] px-2.5 py-1.5 text-sm text-[#e9e6dc] tabular-nums placeholder:text-[#4a5272] ${FOCUS}`}
              />
            </label>
          ))}

          <button
            type="submit"
            disabled={isLoading}
            className={`flex items-center justify-center gap-1.5 rounded-md bg-[#e9e6dc] px-4 py-1.5 text-sm font-medium text-[#0b0f1e] transition-opacity hover:opacity-90 motion-reduce:transition-none disabled:opacity-40 ${FOCUS}`}
          >
            <Search className="h-3.5 w-3.5" aria-hidden />
            {t("locationSearch.getForecast")}
          </button>
        </form>
      )}
    </div>
  );
};
