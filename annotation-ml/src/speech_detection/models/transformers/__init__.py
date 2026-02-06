"""Transformer models for speech detection.

This module exports transformer-based model implementations and their
configurations.
"""

from ..protocols import DistilBERTConfig, ModernBERTConfig
from .distilbert import DistilBERTModel
from .modernbert import ModernBERTModel

__all__ = [
    "DistilBERTModel",
    "ModernBERTModel",
    "DistilBERTConfig",
    "ModernBERTConfig",
]
