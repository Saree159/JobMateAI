"""
Application configuration using Pydantic settings.
Loads environment variables from .env file.
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database
    database_url: str = "sqlite:///./jobmate.db"
    
    # Redis Cache
    redis_url: str = "redis://localhost:6379/0"
    
    # OpenAI
    openai_api_key: str
    
    # CORS
    cors_origins: str = "http://localhost:5173,http://localhost:5174,http://localhost:3000"
    
    # JWT/Auth
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080  # 7 days
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    # Simple shared secret for ingestion from n8n
    ingestion_api_key: str = "changeme"

    # PayPal billing
    paypal_client_id: str = ""
    paypal_client_secret: str = ""
    paypal_mode: str = "sandbox"         # "sandbox" or "live"
    paypal_monthly_plan_id: str = ""     # Subscription plan ID for monthly Pro
    paypal_annual_plan_id: str = ""      # Subscription plan ID for annual Pro
    paypal_webhook_id: str = ""          # Webhook ID for signature verification
    frontend_url: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        case_sensitive = False

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins.split(",")]

    @property
    def paypal_api_base(self) -> str:
        if self.paypal_mode == "live":
            return "https://api-m.paypal.com"
        return "https://api-m.sandbox.paypal.com"


# Global settings instance
settings = Settings()
