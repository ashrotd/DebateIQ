"""
Configuration management for DebateIQ backend.
"""
import os
from typing import Optional
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    """Application settings."""

    # Google API Configuration
    google_api_key: str = os.getenv("GOOGLE_API_KEY", "")
    google_application_credentials: Optional[str] = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", None)

    # Application Settings
    app_env: str = os.getenv("APP_ENV", "development")
    debug: bool = os.getenv("DEBUG", "True").lower() == "true"

    # API Settings
    api_version: str = "1.0.0"
    api_title: str = "Historical Debate Arena API"

    # CORS Settings
    cors_origins: list = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://frontend:3000"
    ]

    # Gemini Model Settings
    gemini_model: str = "gemini-2.0-flash-exp"  # Use latest model

    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
