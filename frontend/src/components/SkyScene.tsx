"use client";

import React from "react";

export type SceneKey = "bromo" | "jakarta" | "maunakea" | "atacama" | "joshua" | "generic";

export function sceneForSite(name?: string): SceneKey {
  switch (name) {
    case "Mount Bromo":
      return "bromo";
    case "Jakarta":
      return "jakarta";
    case "Mauna Kea":
      return "maunakea";
    case "Atacama":
      return "atacama";
    case "Joshua Tree":
      return "joshua";
    default:
      return "generic";
  }
}

interface SkySceneProps {
  scene: SceneKey;
  sunAltitude: number;
  cloudCover: number; // 0-100
  moonIllumination: number; // 0-1
  moonAltitude: number;
  milkyWayAltitude: number;
  bortle: number;
  className?: string;
}

/* ---------- helpers ---------- */

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function hex(c: string) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: string, b: string, t: number) {
  const A = hex(a);
  const B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`;
}

// Small deterministic PRNG so the scene never "jumps" between renders.
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STARS = (() => {
  const r = rng(7);
  return Array.from({ length: 260 }, () => ({
    x: r() * 1200,
    y: r() * 285,
    r: 0.4 + r() * r() * 1.4,
    a: 0.45 + r() * 0.55,
  }));
})();

const CLOUDS = (() => {
  const r = rng(21);
  return Array.from({ length: 8 }, () => ({
    cx: r() * 1200,
    cy: 60 + r() * 170,
    rx: 120 + r() * 140,
    ry: 18 + r() * 18,
  }));
})();

const JAKARTA = (() => {
  const r = rng(99);
  const far: { x: number; w: number; h: number }[] = [];
  for (let x = -10; x < 1210; ) {
    const w = 34 + r() * 40;
    far.push({ x, w, h: 30 + r() * 70 });
    x += w + r() * 6;
  }
  const near: { x: number; w: number; h: number }[] = [];
  const wins: { x: number; y: number }[] = [];
  for (let x = -10; x < 1210; ) {
    if (x > 500 && x < 640) {
      x = 640; // open space around Monas
      continue;
    }
    const w = 28 + r() * 52;
    const h = 40 + r() * (r() > 0.82 ? 150 : 85);
    near.push({ x, w, h });
    for (let wy = 316 - h + 8; wy < 306; wy += 9) {
      for (let wx = x + 5; wx < x + w - 6; wx += 8) {
        if (r() < 0.2) wins.push({ x: wx, y: wy });
      }
    }
    x += w + r() * 5;
  }
  return { far, near, wins };
})();

/* ---------- foregrounds ---------- */

const Plume: React.FC<{ puffs: [number, number, number][]; opacity?: number }> = ({
  puffs,
  opacity = 0.12,
}) => (
  <g filter="url(#sg-blur-6)" fill="#9aa6c8" opacity={opacity}>
    {puffs.map(([cx, cy, r]) => (
      <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
    ))}
  </g>
);

const Bromo = () => (
  <g>
    <path
      d="M0 270 L80 255 L170 262 L260 245 L350 258 L470 248 L560 262 L680 250 L800 258 L900 246 L1010 260 L1100 250 L1200 262 L1200 360 L0 360 Z"
      fill="#0c1226"
    />
    <path d="M780 300 L960 120 L985 112 L1010 120 L1180 300 Z" fill="#0a0f20" />
    <Plume
      puffs={[
        [990, 108, 14],
        [1004, 90, 20],
        [1034, 70, 28],
        [1074, 56, 36],
      ]}
    />
    <path d="M60 320 C 130 270 170 215 215 200 C 260 215 300 270 370 320 Z" fill="#070a15" />
    <path
      d="M390 320 C 460 285 510 235 545 222 L 575 214 L 615 214 L 645 222 C 690 240 740 285 800 320 Z"
      fill="#060913"
    />
    <Plume
      puffs={[
        [595, 205, 12],
        [600, 184, 16],
        [612, 160, 21],
        [630, 134, 27],
        [656, 112, 33],
      ]}
      opacity={0.16}
    />
    <path
      d="M0 316 C 200 308 400 322 600 314 C 800 306 1000 320 1200 312 L1200 360 L0 360 Z"
      fill="#04060c"
    />
  </g>
);

const Jakarta = () => (
  <g>
    <g fill="#0b1022">
      {JAKARTA.far.map((b, i) => (
        <rect key={i} x={b.x} y={316 - b.h} width={b.w} height={b.h + 44} />
      ))}
    </g>
    <g fill="#05070d">
      {JAKARTA.near.map((b, i) => (
        <rect key={i} x={b.x} y={316 - b.h} width={b.w} height={b.h + 44} />
      ))}
      <rect x="500" y="312" width="140" height="48" />
      {/* Monas */}
      <rect x="538" y="298" width="64" height="14" />
      <path d="M553 298 L561 170 L579 170 L587 298 Z" />
      <rect x="548" y="196" width="44" height="7" />
      <path d="M565 170 L575 170 L573 154 L567 154 Z" />
    </g>
    <circle cx="570" cy="146" r="20" fill="#f4c46a" opacity="0.22" filter="url(#sg-blur-6)" />
    <ellipse cx="570" cy="146" rx="4.5" ry="8.5" fill="#f4c46a" />
    <g fill="#f3c77a" opacity="0.7">
      {JAKARTA.wins.map((w, i) => (
        <rect key={i} x={w.x} y={w.y} width="3" height="4" />
      ))}
    </g>
    <rect x="0" y="330" width="1200" height="30" fill="#04050a" />
  </g>
);

const Dome: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g>
    <path d={`M${x - 8} ${y} A8 8 0 0 1 ${x + 8} ${y} Z`} />
    <rect x={x - 9} y={y} width="18" height="6" />
  </g>
);

const MaunaKea = () => (
  <g>
    <path
      d="M0 330 L0 260 C 200 250 380 200 520 150 C 580 128 620 118 660 118 C 700 118 740 128 800 150 C 940 200 1050 245 1200 262 L1200 360 L0 360 Z"
      fill="#080c1a"
    />
    <g fill="#05070d">
      <Dome x={560} y={142} />
      <Dome x={600} y={128} />
      <Dome x={640} y={121} />
      <Dome x={690} y={121} />
      <Dome x={735} y={134} />
    </g>
    <g fill="#aeb8d6" opacity="0.18" filter="url(#sg-blur-6)">
      {[100, 330, 560, 800, 1050].map((cx, i) => (
        <ellipse key={cx} cx={cx} cy={300 + (i % 2) * 8} rx="210" ry="14" />
      ))}
    </g>
    <path d="M0 332 C300 322 700 334 1200 324 L1200 360 L0 360 Z" fill="#04060c" />
  </g>
);

const Dish: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x="-1.5" y="-12" width="3" height="12" />
    <ellipse cx="0" cy="-14" rx="13" ry="4.5" transform="rotate(-38 0 -14)" />
  </g>
);

const Atacama = () => (
  <g>
    <path
      d="M0 300 L0 268 L80 248 L150 266 L240 238 L320 262 L410 244 L500 270 L590 250 L680 268 L930 268 L1010 240 L1100 262 L1200 246 L1200 300 Z"
      fill="#0c1226"
    />
    <path d="M720 300 L808 196 L822 196 L910 300 Z" fill="#0a0f1f" />
    <path
      d="M0 318 C 250 306 450 324 700 314 C 900 306 1050 320 1200 312 L1200 360 L0 360 Z"
      fill="#05070d"
    />
    <g fill="#02030a">
      <Dish x={170} y={322} s={1.2} />
      <Dish x={270} y={330} s={1.5} />
      <Dish x={370} y={320} s={1} />
      <Dish x={1010} y={326} s={1.3} />
    </g>
  </g>
);

const Spiky: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g stroke="#04060c" strokeWidth="2" strokeLinecap="round">
    {[-165, -145, -125, -105, -85, -65, -45, -25, -5].map((a) => {
      const r = (a * Math.PI) / 180;
      return (
        <line
          key={a}
          x1={x}
          y1={y}
          x2={Number((x + Math.cos(r) * 15).toFixed(1))}
          y2={Number((y + Math.sin(r) * 15).toFixed(1))}
        />
      );
    })}
  </g>
);

const JoshuaTree = () => (
  <g>
    <path
      d="M0 320 C 150 300 350 322 600 314 C 800 308 1000 320 1200 312 L1200 360 L0 360 Z"
      fill="#05070d"
    />
    <path
      d="M0 340 C40 292 100 272 160 287 C 190 272 250 264 300 292 C 330 302 360 312 400 340 Z"
      fill="#04060c"
    />
    <path
      d="M900 342 C930 287 1010 272 1080 294 C1130 307 1170 322 1200 342 Z"
      fill="#04060c"
    />
    <path
      d="M800 332 L800 272 M800 272 L772 240 M800 264 L832 232 M800 252 L806 216"
      stroke="#04060c"
      strokeWidth="7"
      strokeLinecap="round"
      fill="none"
    />
    <Spiky x={772} y={238} />
    <Spiky x={832} y={230} />
    <Spiky x={806} y={214} />
    <path
      d="M560 326 L560 292 M560 292 L544 274"
      stroke="#04060c"
      strokeWidth="5"
      strokeLinecap="round"
      fill="none"
    />
    <Spiky x={560} y={290} />
    <Spiky x={544} y={272} />
  </g>
);

const Generic = () => (
  <g>
    <path
      d="M0 300 C 200 270 400 300 600 285 C 800 270 1000 300 1200 280 L1200 360 L0 360 Z"
      fill="#080c1a"
    />
    <path
      d="M0 326 C 300 308 700 330 1200 314 L1200 360 L0 360 Z"
      fill="#04060c"
    />
  </g>
);

const FOREGROUND: Record<SceneKey, React.FC> = {
  bromo: Bromo,
  jakarta: Jakarta,
  maunakea: MaunaKea,
  atacama: Atacama,
  joshua: JoshuaTree,
  generic: Generic,
};

/* ---------- component ---------- */

const NIGHT = ["#060916", "#131b3a"];
const TWILIGHT = ["#10163a", "#6b4a6e"];
const DAY = ["#27508a", "#e8a77a"];
const MOON_R = 11;

export const SkyScene: React.FC<SkySceneProps> = ({
  scene,
  sunAltitude,
  cloudCover,
  moonIllumination,
  moonAltitude,
  milkyWayAltitude,
  bortle,
  className = "",
}) => {
  const s = sunAltitude;

  let top: string;
  let bottom: string;
  if (s <= -18) {
    [top, bottom] = NIGHT;
  } else if (s <= 0) {
    const t = (s + 18) / 18;
    top = mix(NIGHT[0], TWILIGHT[0], t);
    bottom = mix(NIGHT[1], TWILIGHT[1], t);
  } else {
    const t = clamp(s / 10, 0, 1);
    top = mix(TWILIGHT[0], DAY[0], t);
    bottom = mix(TWILIGHT[1], DAY[1], t);
  }

  const night = clamp((-s - 4) / 14, 0, 1);
  const cloudDim = 1 - (cloudCover / 100) * 0.85;

  const starCount = Math.round(260 * Math.pow((10 - clamp(bortle, 1, 9)) / 9, 1.6)) + 6;
  const starOpacity = night * cloudDim;

  const mwVisible =
    clamp(milkyWayAltitude / 35, 0, 1) *
    night *
    (1 - ((clamp(bortle, 1, 9) - 1) / 8) * 0.85) *
    (1 - (cloudCover / 100) * 0.9);
  const mwY = clamp(262 - milkyWayAltitude * 2.2, 60, 262);

  const glow =
    clamp(((bortle - 3) / 6) * 0.6 * (1 + (cloudCover / 100) * 0.4), 0, 0.8);

  const cloudCount = cloudCover < 5 ? 0 : Math.ceil(cloudCover / 14);
  const cloudOpacity = 0.18 + (cloudCover / 100) * 0.35;

  const moonUp = moonAltitude > 0;
  const moonX = 930;
  const moonY = 300 - (clamp(moonAltitude, 0, 85) / 85) * 250;
  const moonOffset = 2 * MOON_R * clamp(moonIllumination, 0, 1);
  const moonOpacity = 1 - (cloudCover / 100) * 0.7;

  const Foreground = FOREGROUND[scene];

  return (
    <svg
      viewBox="0 0 1200 360"
      preserveAspectRatio="xMidYMax slice"
      className={`block h-full w-full ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="sg-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
        <radialGradient id="sg-glow" cx="0.5" cy="1" r="0.75">
          <stop offset="0" stopColor="#ff9a4d" stopOpacity="1" />
          <stop offset="1" stopColor="#ff9a4d" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sg-mw" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#d9d6ff" stopOpacity="0.9" />
          <stop offset="0.5" stopColor="#a99cf0" stopOpacity="0.4" />
          <stop offset="1" stopColor="#a99cf0" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sg-moonglow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#efe9d2" stopOpacity="0.5" />
          <stop offset="1" stopColor="#efe9d2" stopOpacity="0" />
        </radialGradient>
        <filter id="sg-blur-14" x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <filter id="sg-blur-6" x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <mask
          id="sg-moonmask"
          maskUnits="userSpaceOnUse"
          x={moonX - 40}
          y={moonY - 40}
          width="80"
          height="80"
        >
          <rect x={moonX - 40} y={moonY - 40} width="80" height="80" fill="white" />
          <circle cx={moonX + moonOffset} cy={moonY} r={MOON_R} fill="black" />
        </mask>
      </defs>

      <rect width="1200" height="360" fill="url(#sg-sky)" />
      <rect width="1200" height="360" fill="url(#sg-glow)" opacity={glow} />

      {/* Stars */}
      <g fill="#f4f1e6" opacity={starOpacity}>
        {STARS.slice(0, starCount).map((st, i) => (
          <circle key={i} cx={st.x} cy={st.y} r={st.r} opacity={st.a} />
        ))}
      </g>

      {/* Milky Way: rises with the core's altitude */}
      <g opacity={mwVisible} transform={`translate(600 ${mwY}) rotate(-35)`}>
        <ellipse rx="560" ry="46" fill="url(#sg-mw)" filter="url(#sg-blur-14)" />
        <ellipse rx="420" ry="10" fill="#e6e2ff" opacity="0.35" filter="url(#sg-blur-6)" />
        <ellipse rx="300" ry="4" fill="#05070f" opacity="0.4" filter="url(#sg-blur-6)" />
      </g>

      {/* Moon */}
      {moonUp && (
        <g opacity={moonOpacity}>
          <circle cx={moonX} cy={moonY} r={MOON_R * 5} fill="url(#sg-moonglow)" opacity={moonIllumination} />
          <circle cx={moonX} cy={moonY} r={MOON_R} fill="#efe9d2" opacity="0.1" />
          <circle cx={moonX} cy={moonY} r={MOON_R} fill="#efe9d2" mask="url(#sg-moonmask)" />
        </g>
      )}

      {/* Clouds */}
      <g fill="#8a93b0" opacity={cloudOpacity} filter="url(#sg-blur-14)">
        {CLOUDS.slice(0, cloudCount).map((c, i) => (
          <ellipse key={i} cx={c.cx} cy={c.cy} rx={c.rx} ry={c.ry} />
        ))}
      </g>

      <Foreground />
    </svg>
  );
};
