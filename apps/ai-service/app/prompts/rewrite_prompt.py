"""
Versioned prompt builders for Draft Rewrite / Modify.

Returns (system_prompt, user_prompt).
`get_rewrite_prompt(version)` dispatches to the correct builder.
"""
from typing import Callable


# ---------------------------------------------------------------------------
# Version implementations
# ---------------------------------------------------------------------------

def _v1(
    current_draft: str,
    instruction: str,
    style_profile: str | None,
    subject: str,
    from_email: str,
) -> tuple[str, str]:
    style_section = ""
    if style_profile:
        style_section = (
            f"\nThe user's writing style profile (follow it closely):\n"
            f"{style_profile}\n"
        )

    system = (
        "You are a professional email assistant. "
        "Your task is to rewrite or modify an existing email draft according to the user's instruction.\n\n"
        "Rules:\n"
        "  - Apply ONLY the changes described in the instruction; keep everything else intact\n"
        "  - Do NOT add new facts or invent information\n"
        "  - Do NOT include a subject line — body text only\n"
        "  - If a style profile is provided, match it faithfully\n"
        "  - Respond with ONLY the revised draft text, no commentary\n"
        + style_section
    )

    user = (
        f"Original email context\n"
        f"----------------------\n"
        f"From: {from_email}\n"
        f"Subject: {subject}\n\n"
        f"Current draft:\n"
        f"{current_draft}\n\n"
        f"----------------------\n"
        f"Instruction: {instruction}\n\n"
        f"Write the revised draft:"
    )
    return system, user


# ---------------------------------------------------------------------------
# Dispatch table
# ---------------------------------------------------------------------------

_VERSIONS: dict[str, Callable[[str, str, str | None, str, str], tuple[str, str]]] = {
    "v1": _v1,
}

LATEST_VERSION = "v1"


def get_rewrite_prompt(
    current_draft: str,
    instruction: str,
    style_profile: str | None,
    subject: str,
    from_email: str,
    version: str = LATEST_VERSION,
) -> tuple[str, str]:
    builder = _VERSIONS.get(version)
    if builder is None:
        raise ValueError(
            f"Unknown rewrite prompt version '{version}'. "
            f"Available: {list(_VERSIONS)}"
        )
    return builder(current_draft, instruction, style_profile, subject, from_email)
