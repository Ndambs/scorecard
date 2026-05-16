from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./uam_scorecard.db"
    
    # Security
    SECRET_KEY: str = "uam-scorecard-secret-key-change-in-production-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # App
    APP_NAME: str = "UAM Scorecard Platform"
    DEBUG: bool = True
    CORS_ORIGINS: list[str] = ["http://localhost:4200", "http://localhost:3000"]

    # Storage
    UPLOAD_DIR: str = "./uploads"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
