"""Speech detection models.

This module provides model implementations and protocols for speech detection,
including baseline rule-based approaches, CRF-based, and transformer-based models.
"""

from .baselines import QuoteBaselineModel
from .crf import CRFModel
from .protocols import (
    CRFConfig,
    DistilBERTConfig,
    ModelPrediction,
    ModernBERTConfig,
    QuoteBaselineConfig,
    TrainedModel,
    TransformerConfig,
)
from .transformers import DistilBERTModel, ModernBERTModel

__all__ = [
    'TrainedModel',
    'ModelPrediction',
    'CRFConfig',
    'TransformerConfig',
    'DistilBERTConfig',
    'ModernBERTConfig',
    'QuoteBaselineConfig',
    'CRFModel',
    'DistilBERTModel',
    'ModernBERTModel',
    'QuoteBaselineModel',
]
