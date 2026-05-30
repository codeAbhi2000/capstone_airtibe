from functools import lru_cache
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Anthropic / OpenRouter
    openrouter_api_key: str = Field(..., description="OpenRouter API key")
    anthropic_model: str = Field(
        default="anthropic/claude-sonnet-4-20250514", description="Model ID (e.g., anthropic/claude-sonnet-4-20250514)"
    )
    anthropic_timeout_seconds: float = Field(
        default=8.0, description="Request timeout in seconds"
    )

    # Database
    database_url: str = Field(..., description="MySql connection URL")

    # RabbitMQ
    rabbitmq_url: str = Field(
        default="amqp://localhost/", description="RabbitMQ AMQP URL"
    )
    rabbitmq_exchange: str = Field(
        default="email.topic", description="Topic exchange name"
    )
    draft_queue: str = Field(default="draft.queue", description="Draft queue name")
    draft_routing_key: str = Field(
        default="email.draft", description="Routing key for draft messages"
    )
    dlq_name: str = Field(default="draft.dlq", description="Dead letter queue name")
    dlq_routing_key: str = Field(
        default="email.draft.dead", description="DLQ routing key"
    )

    retry_queue: str = Field(
        default="draft-retry-queue", description="Retry queue name for delayed retries"
    )
    retry_routing_key: str = Field(
        default="email.draft.retry", description="Routing key for retry messages"
    )

    # HTTP Server
    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8000)
    client_timeout_seconds: float = Field(
        default=10.0, description="Overall /classify endpoint timeout"
    )

    # App
    log_level: str = Field(default="INFO")
    prompt_version: str = Field(
        default="v1", description="Active prompt version for audit/A-B testing"
    )

    @field_validator("openrouter_api_key")
    @classmethod
    def api_key_must_not_be_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("OPENROUTER_API_KEY must not be empty")
        return v

    @field_validator("database_url")
    @classmethod
    def db_url_must_be_postgres(cls, v: str) -> str:
        if not v.startswith(("mysql://", "mysql://")):
            raise ValueError("DATABASE_URL must be a MySql connection string")
        return v


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached singleton — call get_settings() anywhere, parsed once at startup."""
    return Settings()
