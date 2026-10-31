from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "SutraVesh Backend"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api"
    
    # MongoDB Settings (Local Compass / Atlas Cloud)
    MONGODB_URL: Optional[str] = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "sutravesh"
    
    # JWT Authentication
    JWT_SECRET_KEY: str = "sutravesh-super-secret-key-hackathon-2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Groq API settings
    GROQ_API_KEY: Optional[str] = None
    GROQ_VISION_MODEL: str = "qwen/qwen3.8-27b"
    GROQ_REASONING_MODEL: str = "openai/gpt-oss-120b"
    
    # Wikipedia API
    WIKIPEDIA_USER_AGENT: str = "SutraVeshHackathon/1.0 (contact: team@sutravesh.local)"

    model_config = SettingsConfigDict(
        env_file=["backend/.env", ".env"],
        extra="allow"
    )


settings = Settings()
