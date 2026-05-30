"""
Singleton Anthropic async client configured to use OpenRouter.
Import `anthropic_client` directly — it is module-level and instantiated once.
OpenRouter provides an Anthropic-compatible API endpoint.
"""
import httpx
import anthropic
from app.config.settings import get_settings

_settings = get_settings()

anthropic_client: anthropic.AsyncAnthropic = anthropic.AsyncAnthropic(
    api_key=_settings.openrouter_api_key,
    base_url="https://openrouter.ai/api",
    default_headers={
        "HTTP-Referer": "https://your-app-url.com",
        "X-Title": "Your App Name",
    },
    http_client=httpx.AsyncClient(
        timeout=_settings.anthropic_timeout_seconds,
        follow_redirects=True,
    ),
    timeout=_settings.anthropic_timeout_seconds,
    max_retries=2,
)