import os
from typing import List, Dict, Any, Optional, Type, TypeVar, Union
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
import dotenv

dotenv.load_dotenv()

T = TypeVar('T', bound=BaseModel)

class LLMModel:
    
    def __init__(self, model_name: str):
        self.model_name = model_name
        self.client = ChatOpenAI(
            model=model_name,
            api_key=os.getenv("OPENROUTER_API_KEY"),
            openai_api_base="https://openrouter.ai/api/v1",
            temperature=0.1
        )

    def generate(
        self,
        messages: List[Dict[str, str]],
        response_format: Optional[Type[T]] = None
    ) -> Union[str, BaseModel]:
        """
        Generate a response using the LLM.
        
        :param messages: List of message dicts with 'role' and 'content'
        :param response_format: Optional Pydantic model class for structured output
        :return: Parsed model if response_format provided, otherwise string
        """
        prompt = ChatPromptTemplate.from_messages(messages)
        
        if response_format:
            # Use structured output with the Pydantic model
            structured_llm = self.client.with_structured_output(response_format)
            return structured_llm.invoke(prompt.format_messages())
        
        # Return plain text response
        return self.client.invoke(prompt.format_messages())