"""
Versioned prompt builders for Writing Style Analysis.

Returns (system_prompt, user_prompt).
`get_style_prompt(version)` dispatches to the correct builder.
"""
from typing import Callable


# ---------------------------------------------------------------------------
# Version implementations
# ---------------------------------------------------------------------------

def _v1(emails: list[dict]) -> tuple[str, str]:
    """
    Each email dict: { subject, body, toEmail }
    Returns a JSON style profile.
    """
    system = (
        "You are an expert writing analyst. "
        "Analyse the provided sent emails and extract a detailed writing style profile.\n\n"
        "Respond ONLY with a JSON object — no markdown, no prose — with this exact shape:\n"
        "{\n"
        '  "tone": "<formal | semi-formal | casual>",\n'
        '  "avgSentenceLength": "<short | medium | long>",\n'
        '  "formality": "<high | medium | low>",\n'
        '  "greeting": "<typical opening phrase or null>",\n'
        '  "signoff": "<typical closing phrase or null>",\n'
        '  "vocabulary": "<simple | moderate | advanced>",\n'
        '  "punctuationStyle": "<minimal | standard | heavy>",\n'
        '  "usesEmoji": <bool>,\n'
        '  "keyPhrases": ["<phrase1>", "<phrase2>"],\n'
        '  "writingPatterns": "<2-3 sentence summary of distinctive patterns>",\n'
        '  "doNot": ["<style anti-pattern to avoid>"]'
        "\n}\n\n"
        "Base your analysis only on the emails provided. "
        "keyPhrases: up to 8 recurring expressions. "
        "doNot: things clearly absent from this writer's style (e.g. 'avoid exclamation marks', "
        "'avoid overly formal language')."
    )

    formatted_emails = []
    for i, email in enumerate(emails, 1):
        formatted_emails.append(
            f"--- Email {i} ---\n"
            f"To: {email.get('toEmail', 'unknown')}\n"
            f"Subject: {email.get('subject', '(no subject)')}\n\n"
            f"{email.get('body', '').strip()}"
        )

    user = (
        f"Here are {len(emails)} sent emails to analyse:\n\n"
        + "\n\n".join(formatted_emails)
    )
    return system, user


# ---------------------------------------------------------------------------
# Dispatch table
# ---------------------------------------------------------------------------

_VERSIONS: dict[str, Callable[[list[dict]], tuple[str, str]]] = {
    "v1": _v1,
}

LATEST_VERSION = "v1"


def get_style_prompt(
    emails: list[dict],
    version: str = LATEST_VERSION,
) -> tuple[str, str]:
    builder = _VERSIONS.get(version)
    if builder is None:
        raise ValueError(
            f"Unknown style prompt version '{version}'. "
            f"Available: {list(_VERSIONS)}"
        )
    return builder(emails)
