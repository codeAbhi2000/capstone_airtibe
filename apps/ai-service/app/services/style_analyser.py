import os
import sys
import requests
import json
from typing import List, Dict, Any, Optional

# When running this file directly from app/services, ensure the app package is importable.
ROOT_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if ROOT_PATH not in sys.path:
    sys.path.insert(0, ROOT_PATH)

from app.core.types import EmailObject, StyleProfile
from app.core.prompts import STYLE_ANALYZER_SYSTEM_PROMPT
from app.services.claude import LLMModel


def analyze_email_style_with_langchain(
    emails: List[Dict[str, str]], 
) -> Optional[StyleProfile]:
    """
    Analyzes an array of email objects to extract writing style parameters using LangChain.
    
    :param emails: List of dicts matching your schema, e.g., [{'body': 'Hi...'}]
    :param api_key: Your OpenRouter API Key
    :param model_name: The target OpenRouter model string
    :return: A validated Pydantic StyleProfile object
    """
    if not emails:
        raise ValueError("The email list cannot be empty.")

    # 1. Initialize the OpenRouter LLM using LangChain's ChatOpenAI wrapper
    llm = LLMModel(model_name="anthropic/claude-sonnet-4.6")  # You can choose the model you prefer, e.g., "gpt-4o", "claude-2", etc.

    # 2. Enforce Structured Output directly onto the LLM model instance
    # This guarantees the response matches our Pydantic schema perfectly
    # structured_llm = llm.with_structured_output(StyleProfile)

    # 3. Create the Prompt Template
    

    # 4. Construct the chain: Prompt -> Structured LLM
    

    # 5. Format the array of inputs into a readable string corpus for the prompt
    compiled_emails_text = ""
    for idx, email in enumerate(emails):
        # Gracefully handle missing keys or dict typing variations
        body_text = email.get("body", "").strip()
        compiled_emails_text += f"--- EMAIL #{idx + 1} ---\n{body_text}\n\n"

    try:
        messages =[
        (
            "system", 
            "You are an expert linguistic analyst. Analyze the following collection of emails sent by a "
            "single user and extract their unique writing signature, style parameters, and habits."
        ),
        (
            "user", 
            f"Here is the array of sample emails to analyze:\n\n{compiled_emails_text}\n\n"
        )
    ]
        # Run the chain with structured output (pass the Pydantic model class, not a dict)
        result: StyleProfile = llm.generate(messages=messages, response_format=StyleProfile)
        return result
    except Exception as e:
        print(f"An error occurred during LangChain execution: {e}")
        return None
    

if __name__ == "__main__":

    # Input format matches your exactly specified structure
    sample_emails = [
        {
            'body': 'Hi sir,\r\n\r\nPlease find the quotation for the vehicle in the attached file\r\n\r\nRegards\r\nAbhishek Badiger'
        },
        {
            'body': 'Hey Team,\n\nWe need to shift the sync to 4 PM today because of a scheduling conflict. Hope that works.\n\nThanks,\nAbhishek'
        },
        {
            'body': 'Dear Sir/Madam,\n\nI am writing to formally request an extension on the submission deadline. Thank you for your consideration.\n\nBest regards,\nAbhishek Badiger'
        }
    ]

    print("Analyzing emails using LangChain...")
    profile = analyze_email_style_with_langchain(sample_emails)

    if profile:
        print("\n--- Style Profile Successfully Generated ---\n")
        
        # 1. You can access individual parameters cleanly as object attributes
        print(f"Detected Tone: {profile}")
        # print(f"Formality Rating: {profile.formality_score}/10")
        # print(f"Common Sign-offs: {profile.preferred_signoffs}\n")
        
        # # 2. Or instantly convert the entire profile into a standard Python Dict / JSON string
        # print("Full JSON Structure:")
        # print(profile.model_dump_json(indent=4))