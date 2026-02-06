"""Speech detection in TEI XML documents.

This package provides models and tools for detecting speech in TEI XML documents
using both traditional ML (CRF) and modern transformer approaches.
"""

from speech_detection.data import (
    TEIDocument,
    TEIParagraph,
    TEIParser,
    load_corpus,
    parse_tei_file,
)
from speech_detection.evaluation import (
    EvaluationConfig,
    StatisticalResult,
    bootstrap_metric,
    compute_f1,
    compute_metrics,
    compute_precision,
    compute_recall,
    evaluate_model_with_cv,
    split_documents_by_id,
    verify_no_leakage,
)
from speech_detection.models import (
    CRFConfig,
    CRFModel,
    DistilBERTConfig,
    DistilBERTModel,
    ModelPrediction,
    ModernBERTConfig,
    ModernBERTModel,
    TrainedModel,
)

__version__ = "0.1.0"

__all__ = [
    # Models
    "TrainedModel",
    "ModelPrediction",
    "CRFConfig",
    "DistilBERTConfig",
    "ModernBERTConfig",
    "CRFModel",
    "DistilBERTModel",
    "ModernBERTModel",
    # Evaluation
    "EvaluationConfig",
    "StatisticalResult",
    "split_documents_by_id",
    "verify_no_leakage",
    "compute_f1",
    "compute_precision",
    "compute_recall",
    "compute_metrics",
    "bootstrap_metric",
    "evaluate_model_with_cv",
    # Data
    "TEIParser",
    "parse_tei_file",
    "load_corpus",
    "TEIParagraph",
    "TEIDocument",
]
