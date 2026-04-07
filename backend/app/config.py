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
    secret_key: str  # Required — no default; set SECRET_KEY in environment
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080  # 7 days

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    # Simple shared secret for ingestion from n8n
    ingestion_api_key: str  # Required — no default; set INGESTION_API_KEY in environment

    # Admin API key for n8n / server-to-server calls
    admin_api_key: str  # Required — no default; set ADMIN_API_KEY in environment

    # Fernet key for encrypting sensitive DB fields (li_at cookie, etc.)
    fernet_key: str  # Required — generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

    # Azure Blob Storage for resume files (optional — falls back to DB if not set)
    azure_storage_connection_string: str = ""
    azure_storage_container: str = "resumes"

    # Comma-separated list of admin emails (JWT-based admin access)
    admin_emails: str = "hirematrix.ai@gmail.com,saree.ali28@gmail.com,faizkh14@gmail.com"

    @property
    def admin_emails_list(self) -> List[str]:
        return [e.strip().lower() for e in self.admin_emails.split(",")]

    # PayPal billing
    paypal_client_id: str = ""
    paypal_client_secret: str = ""
    paypal_mode: str = "sandbox"         # "sandbox" or "live"
    paypal_monthly_plan_id: str = ""     # Subscription plan ID for monthly Pro
    paypal_annual_plan_id: str = ""      # Subscription plan ID for annual Pro
    paypal_webhook_id: str = ""          # Webhook ID for signature verification
    frontend_url: str = "http://localhost:5173"

    # Gmail SMTP (for email verification)
    gmail_user: str = ""            # e.g. hirematrix.ai@gmail.com
    gmail_app_password: str = ""    # Gmail App Password (not your regular password)

    # LinkedIn OAuth 2.0
    linkedin_client_id: str = ""
    linkedin_client_secret: str = ""
    linkedin_redirect_uri: str = "http://localhost:8000/api/auth/linkedin/callback"

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
