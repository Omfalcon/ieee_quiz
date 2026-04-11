import os
from pydantic_settings import BaseSettings


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
    # AI / LLM CONFIG
    # =========================
    LLM_API_URL: str = ""
    API_KEY: str = ""

    # =========================
    # EMAIL (RESEND)
    # =========================
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "onboarding@resend.dev"

    class Config:
        env_file = os.path.join(os.path.dirname(__file__), ".env")
        env_file_encoding = "utf-8"


# Instantiate settings
settings = Settings()