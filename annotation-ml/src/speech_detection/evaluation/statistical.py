"""
Statistical evaluation functions with bootstrap confidence intervals.

This module provides pure functions for bootstrap resampling and
cross-validation evaluation with proper statistical methodology.
"""

from typing import Any, Dict, List

import numpy as np

from speech_detection.evaluation.metrics import compute_metrics
from speech_detection.evaluation.protocols import EvaluationConfig, StatisticalResult
from speech_detection.evaluation.split import create_document_folds


def bootstrap_metric(
    scores: List[float],
    n_bootstrap: int,
    ci_width: float,
    random_state: int
) -> StatisticalResult:
    """Calculate bootstrap confidence interval for a metric.

    Uses percentile bootstrap method to calculate confidence intervals
    for the mean of metric scores across cross-validation folds.

    Args:
        scores: List of metric scores from cross-validation folds
        n_bootstrap: Number of bootstrap iterations
        ci_width: Confidence interval width (0.95 = 95% CI)
        random_state: Random seed for reproducibility

    Returns:
        StatisticalResult with estimate, CI, and standard error

    Example:
        >>> scores = [0.8, 0.85, 0.9, 0.82, 0.88]
        >>> result = bootstrap_metric(scores, n_bootstrap=1000, ci_width=0.95, random_state=42)
        >>> 0.0 <= result.estimate <= 1.0
        True
        >>> result.ci_lower <= result.estimate <= result.ci_upper
        True
        >>> len(result.fold_scores)
        5
    """
    # Set random seed
    np.random.seed(random_state)

    # Convert to numpy array
    scores_array = np.array(scores)

    # Point estimate (mean)
    estimate = float(np.mean(scores_array))

    # Bootstrap resampling
    boot_means: List[float] = []
    for _ in range(n_bootstrap):
        boot_sample = np.random.choice(scores_array, size=len(scores_array), replace=True)
        boot_means.append(float(np.mean(boot_sample)))

    boot_means_array = np.array(boot_means)

    # Calculate CI (percentile method)
    alpha = 1 - ci_width
    ci_lower = float(np.percentile(boot_means_array, 100 * alpha / 2))
    ci_upper = float(np.percentile(boot_means_array, 100 * (1 - alpha / 2)))

    # Standard error
    se = float(np.std(scores_array, ddof=1) / np.sqrt(len(scores_array)))

    return StatisticalResult(
        estimate=estimate,
        ci_lower=ci_lower,
        ci_upper=ci_upper,
        se=se,
        fold_scores=tuple(scores),
        n_samples=len(scores)
    )


def evaluate_model_with_cv(
    model: Any,
    data: List[Dict[str, Any]],
    config: EvaluationConfig
) -> Dict[str, StatisticalResult]:
    """Evaluate a model with document-level cross-validation.

    Performs k-fold cross-validation at the document level (not paragraph
    level) to prevent data leakage, and calculates bootstrap confidence
    intervals for all metrics.

    Args:
        model: Model to evaluate (must have train and predict methods)
        data: List of tokenized paragraphs with 'doc_id' and 'bio_labels'
        config: Evaluation configuration

    Returns:
        Dictionary mapping metric names to StatisticalResult objects

    Raises:
        ValueError: If model doesn't implement required methods

    Example:
        >>> from dataclasses import dataclass
        >>> @dataclass
        ... class MockModel:
        ...     def train(self, X, y): pass
        ...     def prepare_training_data(self, data):
        ...         X = [[{"token": t} for t in item["tokens"]] for item in data]
        ...         y = [item["bio_labels"] for item in data]
        ...         return X, y
        ...     def predict(self, X):
        ...         return [["O"] * len(x) for x in X]
        >>> data = [
        ...     {"doc_id": "doc1", "tokens": ["Hello"], "bio_labels": ["O"]},
        ...     {"doc_id": "doc2", "tokens": ["Hi"], "bio_labels": ["B-DIRECT"]},
        ... ]
        >>> config = EvaluationConfig(n_folds=2, n_bootstrap=100)
        >>> model = MockModel()
        >>> results = evaluate_model_with_cv(model, data, config)
        >>> 'f1' in results and 'precision' in results and 'recall' in results
        True
    """
    # Create document-level folds
    folds = create_document_folds(
        data,
        n_folds=config.n_folds,
        random_state=config.random_state
    )

    # Storage for fold-wise scores
    fold_scores: Dict[str, List[float]] = {'f1': [], 'precision': [], 'recall': []}

    # Get model class for instantiation
    model_class = type(model)

    # Evaluate each fold
    for fold in folds:
        train_idx = fold['train_indices']
        test_idx = fold['test_indices']

        train_data = [data[i] for i in train_idx]
        test_data = [data[i] for i in test_idx]

        # Create fresh model instance for this fold
        fold_model = model_class()

        # Train model
        if hasattr(fold_model, 'train'):
            fold_model.train(train_data)
        else:
            raise ValueError(
                f"Model {model.__class__.__name__} must have a train() method"
            )

        # Get true labels
        y_true = [item['bio_labels'] for item in test_data]

        # Get predictions
        if hasattr(fold_model, 'predict'):
            # For CRF-style models
            if hasattr(fold_model, 'prepare_training_data'):
                X_test, _ = fold_model.prepare_training_data(test_data)
                y_pred_raw = fold_model.predict(X_test)

                # Convert to list of lists of strings
                if isinstance(y_pred_raw, np.ndarray):
                    y_pred = [[str(label) for label in pred] for pred in y_pred_raw]
                else:
                    y_pred = [list(pred) for pred in y_pred_raw]
            else:
                y_pred = fold_model.predict(test_data)
        elif hasattr(fold_model, 'predict_paragraphs'):
            # For protocol-based models (returns ModelPrediction objects)
            predictions = fold_model.predict_paragraphs(test_data)
            y_pred = [pred.predicted_bio_labels for pred in predictions]
        else:
            raise ValueError(
                f"Model {model.__class__.__name__} must have either "
                f"predict() or predict_paragraphs() method"
            )

        # Calculate metrics
        metrics = compute_metrics(y_true, y_pred)
        fold_scores['f1'].append(metrics['f1'])
        fold_scores['precision'].append(metrics['precision'])
        fold_scores['recall'].append(metrics['recall'])

    # Calculate results with CIs
    results = {}
    for metric_name, scores in fold_scores.items():
        results[metric_name] = bootstrap_metric(
            scores,
            n_bootstrap=config.n_bootstrap,
            ci_width=config.ci_width,
            random_state=config.random_state
        )

    return results


def compare_models(
    model1_results: Dict[str, StatisticalResult],
    model2_results: Dict[str, StatisticalResult],
    alpha: float = 0.05
) -> Dict[str, Dict[str, Any]]:
    """Compare two models using paired fold scores.

    Performs statistical significance testing between two models
    using Wilcoxon signed-rank test (non-parametric paired test).

    Args:
        model1_results: Results from first model
        model2_results: Results from second model
        alpha: Significance level (default 0.05)

    Returns:
        Dictionary with comparison results for each metric

    Example:
        >>> from speech_detection.evaluation.protocols import StatisticalResult
        >>> results1 = {
        ...     'f1': StatisticalResult(0.85, 0.82, 0.88, 0.01, (0.8, 0.85, 0.9), 3)
        ... }
        >>> results2 = {
        ...     'f1': StatisticalResult(0.82, 0.79, 0.85, 0.01, (0.78, 0.82, 0.86), 3)
        ... }
        >>> comparison = compare_models(results1, results2)
        >>> 'f1' in comparison
        True
        >>> 'p_value' in comparison['f1']
        True
    """
    from scipy import stats

    comparison = {}

    for metric_name in ['f1', 'precision', 'recall']:
        if metric_name not in model1_results or metric_name not in model2_results:
            continue

        scores1 = list(model1_results[metric_name].fold_scores)
        scores2 = list(model2_results[metric_name].fold_scores)

        # Wilcoxon signed-rank test (non-parametric paired test)
        statistic, p_value = stats.wilcoxon(scores1, scores2)

        # Mean difference
        mean_diff = np.mean(scores1) - np.mean(scores2)

        # Cohen's d (paired)
        diff = np.array(scores1) - np.array(scores2)
        cohens_d = np.mean(diff) / np.std(diff, ddof=1)

        # Interpret effect size
        abs_d = abs(cohens_d)
        if abs_d < 0.2:
            interpretation = "negligible"
        elif abs_d < 0.5:
            interpretation = "small"
        elif abs_d < 0.8:
            interpretation = "medium"
        else:
            interpretation = "large"

        comparison[metric_name] = {
            'statistic': float(statistic),
            'p_value': float(p_value),
            'significant': p_value < alpha,
            'cohens_d': float(cohens_d),
            'mean_diff': float(mean_diff),
            'interpretation': interpretation
        }

    return comparison


def format_results(results: Dict[str, StatisticalResult], model_name: str) -> str:
    """Format evaluation results for display.

    Creates a human-readable summary of evaluation results with
    estimates, confidence intervals, and standard errors.

    Args:
        results: Dictionary of metric results
        model_name: Name of the model

    Returns:
        Formatted string with results

    Example:
        >>> from speech_detection.evaluation.protocols import StatisticalResult
        >>> results = {
        ...     'f1': StatisticalResult(0.85, 0.82, 0.88, 0.01, (0.8, 0.85, 0.9), 3)
        ... }
        >>> output = format_results(results, "TestModel")
        >>> 'TestModel' in output and 'F1' in output
        True
    """
    lines = []
    lines.append(f"{model_name} Performance")
    lines.append("=" * 50)
    lines.append("")

    for metric_name, result in results.items():
        lines.append(f"{metric_name.capitalize()}: {result}")

    return "\n".join(lines)
