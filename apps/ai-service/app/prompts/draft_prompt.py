"""
Versioned prompt builders for the Draft Generator.

Each version returns (system_prompt, user_prompt).
`get_draft_prompt(version)` dispatches to the correct builder.
"""
from typing import Callable


# ---------------------------------------------------------------------------
# Version implementations
# ---------------------------------------------------------------------------

def _v1(
    subject: str,
    from_email: str,
    body: str,
    priority: str,
    style_profile: str | None = None,
) -> tuple[str, str]:
    style_section = ""
    if style_profile:
        style_section = (
            f"\nThe recipient's personal writing style profile — follow it closely:\n"
            f"{style_profile}\n"
        )

    system = (
        "You are a professional email assistant drafting replies on behalf of the recipient.\n\n"
        "Guidelines:\n"
        "  - Match the tone of the incoming email (formal ↔ casual)\n"
        "  - Be concise — aim for 3–5 sentences unless more is clearly needed\n"
        "  - Do NOT invent facts; if you need information you don't have, leave a [PLACEHOLDER]\n"
        "  - Do NOT include a subject line in your reply — only the body text\n"
        "  - Sign off with '[Your name]' as a placeholder\n\n"
        f"This email is marked as {priority.upper()} priority — reflect appropriate urgency in tone."
        + style_section
    )
    user = (
        f"Original email\n"
        f"--------------\n"
        f"From: {from_email}\n"
        f"Subject: {subject}\n\n"
        f"{body}\n\n"
        f"--------------\n"
        f"Write a reply draft:"
    )
    return system, user


# ---------------------------------------------------------------------------
# Dispatch table
# ---------------------------------------------------------------------------

_VERSIONS: dict[str, Callable[..., tuple[str, str]]] = {
    "v1": _v1,
}

LATEST_VERSION = "v1"


def get_draft_prompt(
    subject: str,
    from_email: str,
    body: str,
    priority: str = "medium",
    style_profile: str | None = None,
    version: str = LATEST_VERSION,
) -> tuple[str, str]:
    """
    Returns (system_prompt, user_prompt) for the given version.
    Raises ValueError for unknown versions.
    """
    builder = _VERSIONS.get(version)
    if builder is None:
        raise ValueError(
            f"Unknown draft prompt version '{version}'. "
            f"Available: {list(_VERSIONS)}"
        )
    return builder(subject, from_email, body, priority, style_profile)
