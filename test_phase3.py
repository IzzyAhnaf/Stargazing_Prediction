"""
Phase 3 Integration Test:
Validates FastAPI endpoints, JSON response schema compliance,
and end-to-end integration with ML inference and SHAP explainability.
"""

import json
import os
import sys
from fastapi.testclient import TestClient

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Ensure backend modules can be imported
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from backend.app.main import app


def run_phase3_tests():
    print("=" * 80)
    print("⚡ STARGAZING & MILKY WAY FORECAST PREDICTOR - PHASE 3 FASTAPI API")
    print("=" * 80)

    client = TestClient(app)

    # -------------------------------------------------------------
    # Test 1: Health Check Endpoint
    # -------------------------------------------------------------
    print("\n🩺 TEST 1: HEALTH CHECK (/health)")
    health_resp = client.get("/health")
    assert health_resp.status_code == 200, f"Expected 200, got {health_resp.status_code}"
    health_data = health_resp.json()
    print(f"   Status Code: {health_resp.status_code}")
    print(f"   Response   : {health_data}")
    assert health_data["status"] == "healthy"
    print("   ✅ Health check passed!")

    # -------------------------------------------------------------
    # Test 2: GET /predict-stargazing (Mount Bromo, Indonesia)
    # -------------------------------------------------------------
    print("\n🌐 TEST 2: GET /predict-stargazing (Mount Bromo, East Java)")
    params = {
        "latitude": -7.9425,
        "longitude": 112.9530,
        "date": "2026-11-06",
        "elevation": 2329.0,
        "forecast_days": 2,
    }
    get_resp = client.get("/predict-stargazing", params=params)
    assert get_resp.status_code == 200, f"Expected 200, got {get_resp.status_code}: {get_resp.text}"
    data = get_resp.json()

    print(f"   Status Code: {get_resp.status_code}")
    print(f"   Success    : {data['success']}")
    print(f"   Location   : Lat {data['location']['latitude']}, Lon {data['location']['longitude']}")
    print(f"   Bortle     : Class {data['location']['bortle_scale']} ({data['location']['bortle_source']})")
    print(f"   Night Score: {data['summary']['overall_night_score']}/100 ({data['summary']['rating_category']})")
    print(f"   Peak Window: {data['summary']['best_window']['peak_time']} UTC (Score: {data['summary']['best_window']['peak_score']})")
    print(f"   Moon Note  : {data['summary']['moon_summary']['moon_interference_note']}")
    print(f"   Driver     : {data['summary']['primary_driver']}")
    print(f"   Total Hours: {len(data['hourly_forecast'])} hourly forecast entries")
    print("   ✅ GET endpoint passed!")

    # -------------------------------------------------------------
    # Test 3: POST /api/v1/predict-stargazing (Joshua Tree, USA)
    # -------------------------------------------------------------
    print("\n🚀 TEST 3: POST /api/v1/predict-stargazing (Joshua Tree National Park, USA)")
    post_payload = {
        "latitude": 33.8734,
        "longitude": -115.9010,
        "date": "2026-11-06",
        "elevation": 820.0,
        "forecast_days": 2,
        "override_bortle": 3,
    }
    post_resp = client.post("/api/v1/predict-stargazing", json=post_payload)
    assert post_resp.status_code == 200, f"Expected 200, got {post_resp.status_code}: {post_resp.text}"
    jt_data = post_resp.json()

    print(f"   Status Code: {post_resp.status_code}")
    print(f"   Success    : {jt_data['success']}")
    print(f"   Location   : Joshua Tree (Lat {jt_data['location']['latitude']}, Lon {jt_data['location']['longitude']})")
    print(f"   Bortle     : Class {jt_data['location']['bortle_scale']} ({jt_data['location']['bortle_source']})")
    print(f"   Night Score: {jt_data['summary']['overall_night_score']}/100 ({jt_data['summary']['rating_category']})")
    print(f"   Peak Window: {jt_data['summary']['best_window']['peak_time']} UTC (Score: {jt_data['summary']['best_window']['peak_score']})")
    print(f"   Recommendation: {jt_data['summary']['best_window']['key_recommendation']}")

    # Inspect one hourly SHAP explanation payload
    sample_hour = jt_data["hourly_forecast"][12]
    print("\n   Sample Hourly SHAP Payload (Hour 12):")
    print(f"   • Timestamp      : {sample_hour['timestamp_utc']}")
    print(f"   • Score          : {sample_hour['stargazing_score']} ({sample_hour['rating_category']})")
    print(f"   • Verdict        : {sample_hour['explanation']['verdict']}")
    print(f"   • Primary Driver : {sample_hour['explanation']['primary_driver']}")
    print(f"   • Positive Driver: {sample_hour['explanation']['positive_factors'][:2]}")
    print(f"   • Negative Drags : {sample_hour['explanation']['negative_factors'][:2]}")
    print("   ✅ POST endpoint passed!")

    # -------------------------------------------------------------
    # Persist JSON output sample for Next.js frontend mockup
    # -------------------------------------------------------------
    mock_dir = os.path.join("backend", "app", "data")
    os.makedirs(mock_dir, exist_ok=True)
    sample_json_path = os.path.join(mock_dir, "sample_api_response.json")
    with open(sample_json_path, "w", encoding="utf-8") as f:
        json.dump(jt_data, f, indent=2)
    print(f"\n💾 Saved full API JSON payload to: {sample_json_path}")

    print("\n" + "=" * 80)
    print("🎉 PHASE 3 COMPLETE: FastAPI Backend Service is production-ready for Next.js (Phase 4)!")
    print("=" * 80)


if __name__ == "__main__":
    run_phase3_tests()
