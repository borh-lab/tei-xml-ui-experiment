"""Immutable data structures for speech detection."""

from dataclasses import dataclass
from typing import Any, Dict, List, Tuple


@dataclass(frozen=True, slots=True)
class TEIParagraph:
    """Immutable TEI paragraph with speech annotations."""

    doc_id: str
    para_id: str
    text: str
    tokens: List[str]
    bio_labels: List[str]

    def __post_init__(self):
        """Validate tokens and labels match."""
        if len(self.tokens) != len(self.bio_labels):
            raise ValueError(
                f"Token count {len(self.tokens)} != label count {len(self.bio_labels)}"
            )

    @property
    def token_count(self) -> int:
        """Number of tokens."""
        return len(self.tokens)

    @property
    def speech_token_count(self) -> int:
        """Number of speech (non-'O') tokens."""
        return sum(1 for label in self.bio_labels if label != "O")

    @property
    def speech_ratio(self) -> float:
        """Fraction of speech tokens."""
        if self.token_count == 0:
            return 0.0
        return self.speech_token_count / self.token_count


@dataclass(frozen=True, slots=True)
class TEIDocument:
    """Immutable TEI document."""

    doc_id: str
    paragraphs: Tuple[TEIParagraph, ...]
    raw_xml: str
    metadata: Dict[str, Any]

    def __post_init__(self):
        """Validate document has at least one paragraph."""
        if len(self.paragraphs) == 0:
            raise ValueError("Document must contain at least one paragraph")

    @property
    def paragraph_count(self) -> int:
        """Number of paragraphs."""
        return len(self.paragraphs)

    @property
    def total_tokens(self) -> int:
        """Total tokens across all paragraphs."""
        return sum(p.token_count for p in self.paragraphs)
