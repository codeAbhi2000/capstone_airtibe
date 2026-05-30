"""
Versioned prompt builders for the Reply Classifier.

Each version is a plain function that returns (system_prompt, user_prompt).
`get_classifier_prompt(version)` dispatches to the correct builder.

Bump the version string and add a new _vN function to A/B test prompts
without touching service logic.
"""
from typing import Callable


# ---------------------------------------------------------------------------
# Version implementations
# ---------------------------------------------------------------------------

def _v1(subject: str, from_email: str, body: str) -> tuple[str, str]:
    system = (
        "You are an email triage assistant. "
        "Your job is to decide whether an inbound email requires a human reply.\n\n"
        "Respond ONLY with a JSON object matching this exact shape — no markdown, no prose:\n"
        '{"needsReply": <bool>, "priority": "<high|medium|low>", "reason": "<one sentence>"}\n\n'
        "Priority rules:\n"
        "  high   — time-sensitive, from a key stakeholder, or action required today\n"
        "  medium — should be answered within a few days\n"
        "  low    — FYI / newsletter / automated notification\n\n"
        "needsReply: false for newsletters, automated alerts, receipts, spam, or purely informational messages."
        "Body quality check: if the email body contains incoherent text, random "
        "keysmashes, gibberish, or no recognisable words/sentences, treat it as "
        "spam/test regardless of the subject — set needsReply: false, priority: low.\n\n"
        "Always base your decision on the full email content, not just the subject."
    )
    user = (
        f"From: {from_email}\n"
        f"Subject: {subject}\n\n"
        f"{body}"
    )
    return system, user


# ---------------------------------------------------------------------------
# Dispatch table — add new versions here
# ---------------------------------------------------------------------------

_VERSIONS: dict[str, Callable[[str, str, str], tuple[str, str]]] = {
    "v1": _v1,
}

LATEST_VERSION = "v1"


def get_classifier_prompt(
    subject: str,
    from_email: str,
    body: str,
    version: str = LATEST_VERSION,
) -> tuple[str, str]:
    """
    Returns (system_prompt, user_prompt) for the given version.
    Raises ValueError for unknown versions.
    """
    builder = _VERSIONS.get(version)
    if builder is None:
        raise ValueError(
            f"Unknown classifier prompt version '{version}'. "
            f"Available: {list(_VERSIONS)}"
        )
    return builder(subject, from_email, body)
