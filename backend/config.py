from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).parent / ".env"


class Settings(BaseSettings):
    # =========================
    # DATABASE
    # =========================
    MONGO_URI: str = "mongodb://localhost:27017/ieee_quiz"

    # =========================
    # AUTH
    # =========================
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    JWT_SECRET: str = "super-secret-jwt-key"
    JWT_ALGORITHM: str = "HS256"

    # =========================
    # FRONTEND
    # =========================
    FRONTEND_URL: str = "http://localhost:5173"

    # =========================
    # AI / LLM
    # =========================
    # Model ID — must match a model supported by your API key tier
    LLM_MODEL: str = ""
    API_KEY: str = ""
    LLM_PROVIDER: str = ""
    LLM_BASE_URL: str = ""

    # =========================
    # EMAIL
    # =========================
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "onboarding@resend.dev"

    model_config = SettingsConfigDict(
        env_file=_ENV_FILE,
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()