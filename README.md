# 🌌 Stargazing & Milky Way Forecast Predictor

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-16+-black.svg?logo=next.js&logoColor=white)](https://nextjs.org)
[![XGBoost](https://img.shields.io/badge/XGBoost-Regressor-green.svg)](https://xgboost.readthedocs.io/)
[![SHAP](https://img.shields.io/badge/Explainable_AI-TreeSHAP-orange.svg)](https://shap.readthedocs.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg?logo=docker&logoColor=white)](https://www.docker.com)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Tunnels-F38020.svg?logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)

A production-grade, full-stack decision-support system that predicts the optimal time and location for stargazing and astrophotography (Milky Way core visibility). The system fuses real-time weather telemetries, light pollution models, and astronomical ephemeris calculations to generate an explainable **Stargazing Score (0-100%)** and **Best Visit Windows**.

---

## 🌟 Key Features

* **High-Precision Ephemeris Engine (`pyephem`):** Computes exact lunar phase & illumination %, moon altitude, Sun astronomical night threshold ($\le -18^\circ$), and Galactic Center coordinates (Sagittarius A* at $\text{RA } 17^\text{h} 45^\text{m} 40^\text{s}, \text{Dec } -29^\circ 00' 28''$).
* **Real-time Meteorological Ingestion (Open-Meteo API):** Fetches high-resolution hourly cloud layers (Low, Mid, High cirrus), relative humidity, air temperature, and dew point spread ($T - T_{\text{dew}}$) for optical fogging prevention.
* **Explainable Machine Learning (XGBoost Regressor + TreeSHAP):** High-performing regressor ($R^2 = 0.976$, $\text{MAE} = 3.2$ pts) coupled with TreeSHAP to deliver human-readable insights (*"Score is penalized 32 pts because high cirrus clouds are at 85%"*).
* **High-Performance FastAPI Gateway:** Asynchronous endpoints (`/predict-stargazing`), lifespan model pre-warming, and strict Pydantic v2 schemas.
* **Modern Cosmic Dark-Mode Frontend (Next.js 16 + Tailwind CSS):** Circular animated SVG score gauge, 18:00–06:00 interactive nocturnal clarity timeline, condition checklist cards, and XAI factor breakdown.
* **Zero-Trust Cloudflare Tunnel Orchestration:** Fully containerized with multi-stage Dockerfiles and `docker-compose.yml`, securely exposable to the public internet without port-forwarding or public IP exposure.

---

## 📂 Repository Structure

```
project-kampus-ml/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints.py          # FastAPI route handlers
│   │   ├── core/config.py               # Core application configuration
│   │   ├── ml/
│   │   │   ├── synthetic_data_generator.py # Physics-informed synthetic dataset generator
│   │   │   ├── train.py                 # XGBoost training pipeline
│   │   │   ├── explainer.py             # SHAP TreeExplainer & narrative translator
│   │   │   ├── predictor.py             # Singleton ML inference engine
│   │   │   ├── stargazing_xgb_model.json# Serialized XGBoost model
│   │   │   └── model_metadata.json      # Training metadata & feature importance
│   │   ├── schemas/stargazing.py        # Pydantic v2 request/response schemas
│   │   ├── services/
│   │   │   ├── weather_service.py       # Open-Meteo hourly weather client
│   │   │   ├── astronomy_service.py     # Ephemeris & celestial mechanics
│   │   │   ├── light_pollution_service.py# Bortle dark-sky scale estimator
│   │   │   ├── data_pipeline.py         # End-to-end data pipeline orchestrator
│   │   │   └── forecast_service.py      # Business logic & summary synthesis
│   │   └── main.py                      # FastAPI application entrypoint
│   ├── requirements.txt                 # Backend Python dependencies
│   └── Dockerfile                       # Python slim production container
├── frontend/
│   ├── src/
│   │   ├── app/                         # Next.js App Router (layout, page, globals.css)
│   │   ├── components/
│   │   │   ├── ScoreGauge.tsx           # Circular SVG clarity score gauge
│   │   │   ├── HourlyTimeline.tsx       # 18:00 - 06:00 nocturnal clarity timeline
│   │   │   ├── ConditionChecklist.tsx   # Cloud, Moon, Bortle, Dew checklist cards
│   │   │   ├── SHAPDrawer.tsx           # Explainable AI factors & decision card
│   │   │   └── LocationSearch.tsx       # Presets (Bromo, Joshua Tree, etc.) & custom coordinates
│   │   ├── lib/api.ts                   # Real-time API client with fallback simulation
│   │   └── types/stargazing.ts          # TypeScript domain interfaces
│   ├── package.json                     # Frontend dependencies
│   ├── next.config.ts                   # Next.js standalone output config
│   └── Dockerfile                       # Multi-stage lean production container
├── cloudflare/
│   └── config.yml                       # Cloudflare named tunnel ingress rules
├── docker-compose.yml                   # Service orchestration (backend, frontend, tunnel)
├── DEPLOYMENT.md                        # Complete deployment & operations guide
├── test_phase1.py                       # Phase 1 verification runner
├── test_phase2.py                       # Phase 2 ML training & validation runner
├── test_phase3.py                       # Phase 3 FastAPI integration test runner
└── run_backend.py                       # Local Uvicorn launcher
```

---

## ⚡ Quick Start

### 1. Test All Phases Locally (Python CLI)
```bash
# Phase 1: Test Data Pipeline (Weather + Ephem + Bortle)
python test_phase1.py

# Phase 2: Test ML Training & SHAP Explanations
python test_phase2.py

# Phase 3: Test FastAPI Endpoints
python test_phase3.py
```

### 2. Run with Docker Compose
```bash
# Start local containers
docker compose up --build -d

# Open Web App:
# Frontend -> http://localhost:3000
# Backend  -> http://localhost:8000/docs
```

### 3. Expose via Cloudflare Tunnel
```bash
# Add your Cloudflare Tunnel Token in .env, then run:
docker compose --profile tunnel up -d
```

---

## 📜 License
MIT License. Built for stargazers, astrophotographers, and scientific research.
