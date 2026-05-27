import json
from typing import List, Optional, Dict, Any
import requests
from pydantic import BaseModel, Field

class EmailObject(BaseModel):
    """Matches your exact structure: {'body': '...' }"""
    body: str

class StyleProfile(BaseModel):
    """The structured parameters describing the user's style."""
    formality_score: int = Field(..., description="Scale of 1-10 (1 casual, 10 highly formal)")
    primary_tone: str = Field(..., description="Overall emotional/professional vibe (e.g., direct, warm, rigid)")
    sentence_structure: str = Field(..., description="Length, complexity, and rhythm of sentences")
    preferred_greetings: List[str] = Field(..., description="Common ways the user starts emails")
    preferred_signoffs: List[str] = Field(..., description="Common ways the user ends emails")
    key_vocabulary_traits: List[str] = Field(..., description="Frequent buzzwords, idioms, or linguistic habits")
    formatting_quirks: List[str] = Field(..., description="Spacing patterns, emoji habits, use of capitalization, etc.")
    overall_summary: str = Field(..., description="A clear, actionable paragraph summarizing how to mimic this user.")