"""
Core Application Configuration
"""

import os
from pydantic import BaseModel


class Settings(BaseModel):
    PROJECT_NAME: str = "Stargazing & Milky Way Forecast API"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    CORS_ORIGINS: list[str] = ["*"]
    MODEL_PATH: str = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "ml", "stargazing_xgb_model.json"
    )


settings = Settings()
