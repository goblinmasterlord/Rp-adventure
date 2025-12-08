"""Gemini API integration with robust JSON parsing."""

import os
import re
import json
import google.generativeai as genai
from typing import Optional
from ..models.response import GeminiResponse
from ..models.narrative import TruthSeed
from ..prompts.templates import TRUTH_SEED_GENERATOR


class GeminiClient:
    """Handles all communication with the Gemini API."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found in environment")

        genai.configure(api_key=self.api_key)

        # Use Pro model for reasoning tasks
        self.model = genai.GenerativeModel(
            model_name="gemini-1.5-pro",
            generation_config={
                "temperature": 0.8,
                "top_p": 0.95,
                "top_k": 40,
                "max_output_tokens": 2048,
            }
        )

        # Faster model for summarization
        self.summarizer_model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            generation_config={
                "temperature": 0.3,
                "max_output_tokens": 500,
            }
        )

    def generate_truth_seed(self) -> TruthSeed:
        """Generate the mystery foundation for a new game."""
        response = self.model.generate_content(TRUTH_SEED_GENERATOR)
        raw_text = response.text

        parsed = self._parse_json(raw_text)
        if not parsed:
            # Fallback truth seed if generation fails
            parsed = {
                "villain": "The Hollow Bishop - a priest whose faith died with his daughter",
                "motive": "To resurrect his child by sacrificing the souls of an entire congregation",
                "plot": "Conducting a ritual during the Feast of Shadows that will drain the life from all who attend",
                "twist": "The player's recurring nightmares are memories of being the first failed vessel for the resurrection",
                "location": "The cathedral's hidden ossuary, beneath the altar of false saints",
                "weakness": "Speaking the daughter's true name breaks the father's hold on her trapped spirit"
            }

        return TruthSeed(**parsed)

    def generate_narrative(
        self,
        system_prompt: str,
        user_prompt: str
    ) -> GeminiResponse:
        """Generate a narrative response with the Consequence Engine."""
        # Combine prompts for Gemini (system instruction support)
        full_prompt = f"{system_prompt}\n\n---\n\n{user_prompt}"

        try:
            response = self.model.generate_content(full_prompt)
            raw_text = response.text

            parsed = self._parse_json(raw_text)
            if not parsed:
                # Failed to parse - return safe default
                return GeminiResponse(
                    narrative_text="The moment stretches, uncertain. Reality seems to hesitate, as if deciding what comes next. You wait, breath held, for the world to resolve itself.",
                    health_change=0,
                    player_status="ALIVE",
                    atmospheric_hint="A sense of incompleteness lingers."
                )

            return GeminiResponse(**parsed)

        except Exception as e:
            print(f"Gemini API error: {e}")
            return GeminiResponse(
                narrative_text="Shadows flicker at the edge of perception. Something shifts in the darkness, but the moment passes before you can understand it.",
                health_change=0,
                player_status="ALIVE",
                atmospheric_hint="The world holds its breath."
            )

    def generate_summary(self, prompt: str) -> str:
        """Generate compressed memory summary."""
        try:
            response = self.summarizer_model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"Summarizer error: {e}")
            return "[Memory fragmented - events unclear]"

    def _parse_json(self, raw_text: str) -> Optional[dict]:
        """Robust JSON parser that handles common LLM output issues."""
        if not raw_text:
            return None

        text = raw_text.strip()

        # Try direct parse first
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # Remove markdown code fences
        patterns = [
            r'```json\s*(.*?)\s*```',
            r'```\s*(.*?)\s*```',
            r'`(.*?)`',
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(1))
                except json.JSONDecodeError:
                    continue

        # Try to find JSON object boundaries
        start = text.find('{')
        end = text.rfind('}')

        if start != -1 and end != -1 and end > start:
            potential_json = text[start:end + 1]
            try:
                return json.loads(potential_json)
            except json.JSONDecodeError:
                # Try to fix common issues
                fixed = self._fix_json_issues(potential_json)
                try:
                    return json.loads(fixed)
                except json.JSONDecodeError:
                    pass

        return None

    def _fix_json_issues(self, text: str) -> str:
        """Attempt to fix common JSON formatting issues."""
        # Replace single quotes with double quotes (but not in contractions)
        text = re.sub(r"(?<![a-zA-Z])'|'(?![a-zA-Z])", '"', text)

        # Fix trailing commas
        text = re.sub(r',\s*}', '}', text)
        text = re.sub(r',\s*]', ']', text)

        # Fix unquoted keys
        text = re.sub(r'(\w+)(?=\s*:)', r'"\1"', text)

        # Remove duplicate quotes
        text = re.sub(r'""(\w+)""', r'"\1"', text)

        return text
