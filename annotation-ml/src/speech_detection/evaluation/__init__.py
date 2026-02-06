"""
Evaluation module for speech detection models.

This module provides statistically rigorous evaluation functions including:
- Document-level cross-validation to prevent data leakage
- Bootstrap confidence intervals for all metrics
- Statistical significance testing for model comparisons
- Pure functional interfaces with immutable types
"""

from speech_detection.evaluation.metrics import (
    compute_f1,
    compute_metrics,
    compute_precision,
    compute_recall,
)
from speech_detection.evaluation.protocols import EvaluationConfig, StatisticalResult
from speech_detection.evaluation.split import split_documents_by_id, verify_no_leakage
from speech_detection.evaluation.statistical import (
    bootstrap_metric,
    evaluate_model_with_cv,
    format_results,
)

__all__ = [
    'EvaluationConfig', 'StatisticalResult',
    'split_documents_by_id', 'verify_no_leakage',
    'compute_f1', 'compute_precision', 'compute_recall', 'compute_metrics',
    'bootstrap_metric', 'evaluate_model_with_cv',
    'format_results',
]
