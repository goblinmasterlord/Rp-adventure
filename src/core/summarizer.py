"""The Summarizer Worker - compresses narrative memory."""

from ..models.session import GameSession
from ..prompts.builder import PromptBuilder
from .gemini import GeminiClient


class SummarizerWorker:
    """Handles memory compression every 5 turns.

    The Librarian takes existing long-term memory + recent events
    and produces a condensed summary that preserves critical information
    while staying within token limits.
    """

    # Maximum words for long-term memory
    MAX_MEMORY_WORDS = 200

    # Trigger threshold
    TURN_THRESHOLD = 5

    def __init__(self, client: GeminiClient):
        self.client = client

    def should_run(self, session: GameSession) -> bool:
        """Check if summarization is needed."""
        return session.needs_summary()

    def run(self, session: GameSession) -> str:
        """Execute summarization and update session.

        Returns:
            The new compressed memory string
        """
        if not session.narrative:
            return ""

        # Gather recent turns for compression
        recent_turns = [
            {"role": turn.role, "text": turn.text}
            for turn in session.narrative.short_term_buffer
        ]

        if not recent_turns:
            return session.narrative.long_term_memory

        # Build summarization prompt
        builder = PromptBuilder(session)
        summary_prompt = builder.build_summary_prompt(recent_turns)

        # Generate new summary
        new_memory = self.client.generate_summary(summary_prompt)

        # Enforce word limit
        words = new_memory.split()
        if len(words) > self.MAX_MEMORY_WORDS:
            # Recursive summarization - summarize the summary
            new_memory = self._recursive_compress(new_memory)

        # Update session
        session.narrative.long_term_memory = new_memory
        session.mark_summarized()

        return new_memory

    def _recursive_compress(self, memory: str) -> str:
        """Emergency compression when memory exceeds limits."""
        compress_prompt = f"""URGENT: The following summary is too long. Compress it to under 150 words while keeping ALL [CLUE] markers and critical facts.

CURRENT SUMMARY:
{memory}

Respond with ONLY the compressed summary."""

        compressed = self.client.generate_summary(compress_prompt)

        # Hard truncation as last resort
        words = compressed.split()
        if len(words) > self.MAX_MEMORY_WORDS:
            compressed = " ".join(words[:self.MAX_MEMORY_WORDS]) + "..."

        return compressed

    def force_checkpoint(self, session: GameSession) -> str:
        """Force an immediate summary regardless of turn count.

        Useful for critical moments or before potential game-ending events.
        """
        return self.run(session)
