# 🌌 Stargazing & Milky Way Visibility Forecast

A decision-support web app that predicts how good the sky will be for
stargazing and Milky Way photography at any location on Earth, for the
next few days — built as a university course project.

Pick a spot (or use one of the 24 presets across Indonesia and famous
dark-sky sites worldwide), and it gives you an hourly clarity score, a
plain-language explanation of what's helping or hurting visibility (cloud
cover, moon phase, light pollution, Milky Way core altitude, etc.), and
the best window of the night to go out and look up.

Available in English and Indonesian.

## Features

- Hourly stargazing/Milky Way visibility score, driven by an XGBoost
  regression model
- Human-readable explanations per hour via SHAP (`TreeExplainer`) —
  "why is tonight good or bad," not just a number
- 24 preset locations (12 in Indonesia, 12 international dark-sky sites),
  or search/pin any custom lat/lon
- Bortle scale (light pollution), moon phase & illumination, cloud cover
  by altitude, Milky Way core altitude and more, factored in
- Multi-day forecast with a "best night" recommendation
- Bilingual UI and bilingual backend-generated explanations (EN/ID)
- Responsive layout (phone / tablet / laptop)
- Timezone-aware hour display: device timezone, per-site approximate
  local time, or fixed WIB/WITA/WIT/UTC
- About page with project info and team

## Tech stack

**Backend** — FastAPI, XGBoost, SHAP, `ephem` (astronomical calculations),
Open-Meteo (weather data), Pydantic, pandas/numpy.

**Frontend** — Next.js 16 (App Router, Turbopack), TypeScript, Tailwind,
React Context for i18n.

## Project structure

```
backend/
  app/
    api/v1/            # FastAPI routes
    core/               # settings
    ml/                 # XGBoost predictor + SHAP explainer
    schemas/             # Pydantic request/response models
    services/            # weather, astronomy, light-pollution, forecast orchestration
  requirements.txt
  Dockerfile

frontend/
  src/
    app/                 # pages (forecast, /about)
    components/          # UI components
    lib/                 # api client, i18n, timezone helpers
    types/
  Dockerfile

docker-compose.yml
```

## Running locally (without Docker)

**Backend**

```bash
cd backend
pip install -r requirements.txt
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

> Run this from the folder that *contains* `backend/`, not from inside
> it — every internal import is rooted at `backend.app.*`
> (e.g. `from backend.app.ml.predictor import StargazingPredictor`), so
> `backend` has to resolve as a package from your current directory.

API docs at `http://localhost:8000/docs`.

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

Create `frontend/.env.local` if the backend isn't on `localhost:8000`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

App at `http://localhost:3000`.

## Deploying with Docker (self-hosted)

This repo ships with everything needed to run both services with Docker
Compose on your own server, plus an optional Cloudflare Tunnel so the
frontend gets a real public domain without opening any ports.

```bash
git clone <this-repo-url>
cd <this-repo>
cp env.example .env   # fill in CLOUDFLARE_TUNNEL_TOKEN if using the tunnel
docker compose up -d --build
```

- Backend → `http://YOUR_SERVER_IP:8000` (docs at `/docs`, health at `/health`)
- Frontend → `http://YOUR_SERVER_IP:3000`, or your Cloudflare Tunnel domain
  if you set one up

Before building, edit `docker-compose.yml`:
- Swap `YOUR_SERVER_IP_OR_DOMAIN` in the frontend's `NEXT_PUBLIC_API_URL`
  build arg for your server's real, publicly reachable address (it's
  baked into the frontend's JS bundle at **build time**, so it has to be
  something a visitor's browser can reach — not an internal Docker
  hostname).
- If you're using the Cloudflare Tunnel service, set up a tunnel in the
  [Cloudflare Zero Trust dashboard](https://one.dash.cloudflare.com/) →
  Networks → Tunnels, point its public hostname at
  `http://frontend:3000`, and put the tunnel token in `.env` as
  `CLOUDFLARE_TUNNEL_TOKEN`.

Rebuilding after a code change:

```bash
git pull
docker compose up -d --build
```

Changing the server's address/domain later requires rebuilding the
frontend specifically (`NEXT_PUBLIC_API_URL` won't update on a plain
restart):

```bash
docker compose build frontend && docker compose up -d
```

## Team

| Name | NIM |
|---|---|
| Izzy Ahnaf | J0404241153 |
| Bintang Afdhal Ramadani | J0404241111 |
| Kesya Khoerunisa Putri Suryaman | J0404241058 |

## Data sources

- Weather forecasts: [Open-Meteo](https://open-meteo.com/)
- Astronomical calculations: [`ephem`](https://rhodesmill.org/pyephem/)
- Light pollution: Bortle scale estimates by location
