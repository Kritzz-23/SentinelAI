from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://sentinel:sentinel@localhost:5432/sentinel"
    redis_url: str = "redis://localhost:6379/0"
    rabbitmq_url: str = "amqp://guest:guest@localhost:5672/"
    jwt_secret: str = "dev-secret-change-me"
    jwt_expire_minutes: int = 1440
    ai_service_url: str = "http://localhost:8001"
    seed_demo: bool = True
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
