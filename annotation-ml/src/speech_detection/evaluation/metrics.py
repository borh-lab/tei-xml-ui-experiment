"""
Pure metric functions for sequence labeling evaluation.

This module provides functional interfaces to seqeval metrics for
evaluating BIO-tagged sequence predictions. All functions are pure
and have no side effects.
"""

from typing import Dict, List

from seqeval.metrics import f1_score, precision_score, recall_score


def compute_f1(true_labels: List[List[str]], pred_labels: List[List[str]]) -> float:
    """Compute F1 score for BIO-tagged sequences.

    Args:
        true_labels: Ground truth BIO labels for each sequence
        pred_labels: Predicted BIO labels for each sequence

    Returns:
        F1 score (0.0 to 1.0)

    Raises:
        ValueError: If label lengths don't match

    Example:
        >>> true = [['O', 'O', 'B-DIRECT'], ['O', 'B-DIRECT']]
        >>> pred = [['O', 'O', 'B-DIRECT'], ['O', 'O']]
        >>> result = compute_f1(true, pred)
        >>> 0.0 <= result <= 1.0
        True
        >>> # Perfect match
        >>> perfect = compute_f1(true, true)
        >>> 0.0 <= perfect <= 1.0
        True
    """
    # Validate input
    if len(true_labels) != len(pred_labels):
        raise ValueError(
            f"Number of sequences must match: {len(true_labels)} != {len(pred_labels)}"
        )

    return float(f1_score(true_labels, pred_labels))


def compute_precision(true_labels: List[List[str]], pred_labels: List[List[str]]) -> float:
    """Compute precision for BIO-tagged sequences.

    Args:
        true_labels: Ground truth BIO labels for each sequence
        pred_labels: Predicted BIO labels for each sequence

    Returns:
        Precision score (0.0 to 1.0)

    Raises:
        ValueError: If label lengths don't match

    Example:
        >>> true = [['O', 'O', 'B-DIRECT'], ['O', 'B-DIRECT']]
        >>> pred = [['O', 'O', 'B-DIRECT'], ['O', 'O']]
        >>> result = compute_precision(true, pred)
        >>> 0.0 <= result <= 1.0
        True
    """
    # Validate input
    if len(true_labels) != len(pred_labels):
        raise ValueError(
            f"Number of sequences must match: {len(true_labels)} != {len(pred_labels)}"
        )

    return float(precision_score(true_labels, pred_labels))


def compute_recall(true_labels: List[List[str]], pred_labels: List[List[str]]) -> float:
    """Compute recall for BIO-tagged sequences.

    Args:
        true_labels: Ground truth BIO labels for each sequence
        pred_labels: Predicted BIO labels for each sequence

    Returns:
        Recall score (0.0 to 1.0)

    Raises:
        ValueError: If label lengths don't match

    Example:
        >>> true = [['O', 'O', 'B-DIRECT'], ['O', 'B-DIRECT']]
        >>> pred = [['O', 'O', 'B-DIRECT'], ['O', 'O']]
        >>> result = compute_recall(true, pred)
        >>> 0.0 <= result <= 1.0
        True
    """
    # Validate input
    if len(true_labels) != len(pred_labels):
        raise ValueError(
            f"Number of sequences must match: {len(true_labels)} != {len(pred_labels)}"
        )

    return float(recall_score(true_labels, pred_labels))


def compute_metrics(true_labels: List[List[str]], pred_labels: List[List[str]]) -> Dict[str, float]:
    """Compute all metrics (F1, precision, recall) for BIO-tagged sequences.

    Args:
        true_labels: Ground truth BIO labels for each sequence
        pred_labels: Predicted BIO labels for each sequence

    Returns:
        Dictionary with 'f1', 'precision', and 'recall' keys

    Raises:
        ValueError: If label lengths don't match

    Example:
        >>> true = [['O', 'O', 'B-DIRECT'], ['O', 'B-DIRECT']]
        >>> pred = [['O', 'O', 'B-DIRECT'], ['O', 'O']]
        >>> metrics = compute_metrics(true, pred)
        >>> 'f1' in metrics and 'precision' in metrics and 'recall' in metrics
        True
        >>> all(0.0 <= v <= 1.0 for v in metrics.values())
        True
        >>> # Perfect match
        >>> perfect = compute_metrics(true, true)
        >>> 0.0 <= perfect['f1'] <= 1.0
        True
    """
    # Validate input
    if len(true_labels) != len(pred_labels):
        raise ValueError(
            f"Number of sequences must match: {len(true_labels)} != {len(pred_labels)}"
        )

    return {
        "f1": float(f1_score(true_labels, pred_labels)),
        "precision": float(precision_score(true_labels, pred_labels)),
        "recall": float(recall_score(true_labels, pred_labels)),
    }
