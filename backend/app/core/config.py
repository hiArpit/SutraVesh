from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "SutraVesh / WonderLens Backend"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api"
    
    # Groq API settings
    GROQ_API_KEY: Optional[str] = None
    GROQ_VISION_MODEL: str = "llama-3.2-11b-vision-preview"
    GROQ_REASONING_MODEL: str = "llama-3.3-70b-versatile"
    
    # Wikipedia API
    WIKIPEDIA_USER_AGENT: str = "WonderLensHackathon/1.0 (contact: team@sutravesh.local)"

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
