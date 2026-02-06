"""Model protocols and configurations for speech detection.

This module defines Protocol-based interfaces and immutable configuration
dataclasses for all model types.
"""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Protocol, Tuple


class TrainedModel(Protocol):
    """Protocol for trainable speech detection models.

    Models implementing this protocol can be trained on tokenized paragraphs
    and predict BIO labels for new paragraphs.
    """

    def prepare_training_data(
        self, data: List[Dict[str, Any]]
    ) -> Tuple[List[List[Dict[str, Any]]], List[List[str]]]:
        """Prepare training data from tokenized paragraphs.

        Args:
            data: List of tokenized paragraphs with 'tokens' and 'bio_labels' keys

        Returns:
            Tuple of (X_seq, y_seq) where:
                X_seq: List of feature matrices (one per paragraph)
                y_seq: List of label sequences (one per paragraph)
        """
        ...

    def train(
        self, train_data: List[Dict[str, Any]], val_data: Optional[List[Dict[str, Any]]] = None
    ) -> None:
        """Train the model on provided data.

        Args:
            train_data: Training paragraphs with tokens and labels
            val_data: Optional validation paragraphs
        """
        ...

    def predict_paragraphs(self, data: List[Dict[str, Any]]) -> List["ModelPrediction"]:
        """Predict speech labels for paragraphs.

        Args:
            data: List of tokenized paragraphs

        Returns:
            List of ModelPrediction objects
        """
        ...


@dataclass(frozen=True, slots=True)
class ModelPrediction:
    """Immutable prediction result for a paragraph.

    Attributes:
        doc_id: Document identifier
        para_id: Paragraph identifier
        tokens: Token list
        predicted_bio_labels: Predicted BIO labels (one per token)
        text: Original paragraph text
    """

    doc_id: str
    para_id: str
    tokens: List[str]
    predicted_bio_labels: List[str]
    text: str


@dataclass(frozen=True, slots=True)
class CRFConfig:
    """Immutable configuration for CRF model.

    Attributes:
        c1: Coefficient for L1 regularization
        c2: Coefficient for L2 regularization
        max_iterations: Maximum training iterations
        all_possible_transitions: Whether to include all possible transitions
        all_possible_states: Whether to include all possible states
        char_ngram_range: Range of character n-grams for features
        context_window: Number of surrounding tokens to consider
        use_speech_verbs: Whether to include speech verb features
        use_orthographic: Whether to include orthographic features
    """

    c1: float = 0.5
    c2: float = 0.5
    max_iterations: int = 100
    all_possible_transitions: bool = True
    all_possible_states: bool = True
    char_ngram_range: Tuple[int, int] = (2, 5)
    context_window: int = 2
    use_speech_verbs: bool = True
    use_orthographic: bool = True


@dataclass(frozen=True, slots=True)
class TransformerConfig:
    """Base immutable configuration for transformer models.

    Attributes:
        model_name: Hugging Face model identifier
        max_length: Maximum sequence length
        num_labels: Number of classification labels
        batch_size: Training batch size
        epochs: Number of training epochs
        learning_rate: Learning rate for optimizer
        warmup_steps: Number of warmup steps
        bf16: Whether to use BFloat16 mixed precision
        gradient_accumulation_steps: Number of gradient accumulation steps
    """

    model_name: str
    max_length: int
    num_labels: int
    batch_size: int
    epochs: int
    learning_rate: float
    warmup_steps: int
    bf16: bool
    gradient_accumulation_steps: int


@dataclass(frozen=True, slots=True)
class DistilBERTConfig:
    """Immutable configuration for DistilBERT model."""

    model_name: str = "distilbert/distilbert-base-cased"
    max_length: int = 512
    num_labels: int = 5
    batch_size: int = 32
    epochs: int = 3
    learning_rate: float = 2e-5
    warmup_steps: int = 100
    bf16: bool = True
    gradient_accumulation_steps: int = 1


@dataclass(frozen=True, slots=True)
class ModernBERTConfig:
    """Immutable configuration for ModernBERT model with long context."""

    model_name: str = "answerdotai/ModernBERT-base"
    max_length: int = 4096
    num_labels: int = 5
    batch_size: int = 8
    epochs: int = 3
    learning_rate: float = 2e-5
    warmup_steps: int = 100
    bf16: bool = True
    gradient_accumulation_steps: int = 2


@dataclass(frozen=True, slots=True)
class QuoteBaselineConfig:
    """Immutable configuration for quote-based baseline model.

    Attributes:
        speech_label: Label to assign to detected speech (default: 'DIRECT')
        handle_multi_paragraph: Whether to detect multi-paragraph quotes
        handle_nested: Whether to detect nested quotes
    """

    speech_label: str = "DIRECT"
    handle_multi_paragraph: bool = True
    handle_nested: bool = True
