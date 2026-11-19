// Shared colour tokens. Only plain values live here (no Tailwind class strings),
// so it works no matter which folders your Tailwind config scans.

export const TONE = {
  excellent: "#7fd8c3",
  good: "#7fb6ee",
  fair: "#e0b04f",
  poor: "#d0607a",
  violet: "#a99cf0",
} as const;

export const INK = {
  page: "#0b0f1e",
  panel: "#11172b",
  rule: "#232b47",
  text: "#e9e6dc",
  muted: "#9097ad",
} as const;

export function scoreTone(score: number): { color: string; name: string } {
  if (score >= 80) return { color: TONE.excellent, name: "Excellent" };
  if (score >= 65) return { color: TONE.good, name: "Good" };
  if (score >= 45) return { color: TONE.fair, name: "Fair" };
  return { color: TONE.poor, name: "Poor" };
}
