/**
 * Shared timezone helpers.
 *
 * The backend/API always works in UTC (see `timestamp_utc`, `peak_time`,
 * `start_time`, `end_time` on StargazingResponse) and Open-Meteo is queried
 * with `timezone: "UTC"`. That's the right call for the data pipeline
 * (avoids DST/offset ambiguity when merging weather + astronomy for an
 * arbitrary lat/lon anywhere in the world), but it means every raw
 * timestamp the UI receives is a UTC instant.
 *
 * These helpers convert those UTC instants to whichever timezone the user
 * picks in Settings, purely for display — nothing sent to the API changes.
 */

export interface TimezoneOption {
  /** "site" is resolved per-location (see `siteLocalZone`); "local" is
   * resolved to the browser's own timezone at render time. */
  value: string;
  label: string;
}

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  { value: "site", label: "This site's local time (approx.)" },
  { value: "local", label: "My device's timezone" },
  { value: "Asia/Jakarta", label: "WIB — Jakarta (UTC+7)" },
  { value: "Asia/Makassar", label: "WITA — Makassar (UTC+8)" },
  { value: "Asia/Jayapura", label: "WIT — Jayapura (UTC+9)" },
  { value: "UTC", label: "UTC" },
];

export const DEFAULT_TIMEZONE_PREF = "Asia/Jakarta";
const STORAGE_KEY = "stargazing.timezonePref";

/**
 * A site's exact IANA timezone isn't known from lat/lon alone (that needs a
 * timezone-boundary lookup we don't have offline), so this approximates
 * "local time" from longitude using 15°-per-hour solar time — the same
 * logic standard timezones are historically based on. It's off by up to ~30
 * minutes from some countries' actual legal timezone (and doesn't know
 * about DST), but it keeps night looking like night for that site.
 */
export function estimateUtcOffsetHours(longitudeDeg: number): number {
  if (!Number.isFinite(longitudeDeg)) return 0;
  return Math.max(-12, Math.min(14, Math.round(longitudeDeg / 15)));
}

/**
 * Turns an approximate UTC offset into a fixed-offset IANA zone Intl can
 * format with (no DST, no daylight transitions — just a flat offset).
 * Note "Etc/GMT" zones use POSIX's inverted sign convention: "Etc/GMT-8"
 * means UTC+8, not UTC-8.
 */
function offsetToEtcZone(offsetHours: number): string {
  if (offsetHours === 0) return "UTC";
  const sign = offsetHours > 0 ? "-" : "+";
  return `Etc/GMT${sign}${Math.abs(offsetHours)}`;
}

/** The approximate local-time IANA-style zone for a site's longitude. */
export function siteLocalZone(longitudeDeg: number): string {
  return offsetToEtcZone(estimateUtcOffsetHours(longitudeDeg));
}

/**
 * Resolves a stored preference ("site" | "local" | IANA zone name) to a
 * real zone Intl can format with. "site" needs the current observing
 * site's longitude, since it's resolved per-location rather than to one
 * fixed zone.
 */
export function resolveTimezone(pref: string, siteLongitude?: number): string {
  if (pref === "site") {
    return typeof siteLongitude === "number" && Number.isFinite(siteLongitude)
      ? siteLocalZone(siteLongitude)
      : "UTC";
  }
  if (pref === "local") {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }
  return pref || "UTC";
}

/**
 * The API returns naive ISO strings (e.g. "2026-11-06T22:00", no trailing
 * "Z") that represent UTC instants. Appends "Z" when missing so `Date`
 * parses them as UTC rather than the browser's local time.
 */
function asUtcIso(raw: string): string {
  if (!raw) return raw;
  return /(Z|[+-]\d{2}:?\d{2})$/.test(raw) ? raw : `${raw}Z`;
}

/** Formats a UTC ISO timestamp as "HH:MM" in the chosen timezone. When
 * `timezonePref` is "site", `siteLongitude` picks which site's approximate
 * local time to use (see `resolveTimezone`). */
export function formatTimeInZone(
  rawUtcIso: string,
  timezonePref: string,
  siteLongitude?: number
): string {
  if (!rawUtcIso) return "—";
  try {
    const d = new Date(asUtcIso(rawUtcIso));
    if (Number.isNaN(d.getTime())) return rawUtcIso.slice(11, 16);
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: resolveTimezone(timezonePref, siteLongitude),
    }).format(d);
  } catch {
    return rawUtcIso.slice(11, 16);
  }
}

/** Formats a UTC ISO timestamp as "YYYY-MM-DD HH:MM" in the chosen timezone. */
export function formatDateTimeInZone(
  rawUtcIso: string,
  timezonePref: string,
  siteLongitude?: number
): string {
  if (!rawUtcIso) return "—";
  try {
    const d = new Date(asUtcIso(rawUtcIso));
    if (Number.isNaN(d.getTime())) return rawUtcIso;
    const tz = resolveTimezone(timezonePref, siteLongitude);
    const datePart = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d); // YYYY-MM-DD
    const timePart = formatTimeInZone(rawUtcIso, timezonePref, siteLongitude);
    return `${datePart} ${timePart}`;
  } catch {
    return rawUtcIso;
  }
}

/** Best-effort short zone label ("WIB", "UTC", "GMT+7", ...) for display next to a time. */
export function zoneAbbrLabel(timezonePref: string, siteLongitude?: number): string {
  const tz = resolveTimezone(timezonePref, siteLongitude);
  const known: Record<string, string> = {
    "Asia/Jakarta": "WIB",
    "Asia/Makassar": "WITA",
    "Asia/Jayapura": "WIT",
    UTC: "UTC",
  };
  if (known[tz]) return known[tz];
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date());
    const tzPart = parts.find((p) => p.type === "timeZoneName");
    return tzPart?.value ?? tz;
  } catch {
    return tz;
  }
}

export function loadTimezonePref(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_TIMEZONE_PREF;
  } catch {
    return DEFAULT_TIMEZONE_PREF;
  }
}

export function saveTimezonePref(pref: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    // Best-effort only (e.g. private browsing can block storage).
  }
}

/** Today's date, in the device's own local timezone, as "YYYY-MM-DD". */
export function todayLocalISODate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
