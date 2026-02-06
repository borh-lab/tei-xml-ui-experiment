"""
Evaluation protocol types for speech detection models.

This module defines immutable data structures for evaluation configuration
and results, following functional programming principles.
"""

from dataclasses import dataclass
from typing import Tuple


@dataclass(frozen=True, slots=True)
class EvaluationConfig:
    """Immutable evaluation configuration.

    Attributes:
        n_folds: Number of cross-validation folds
        n_bootstrap: Number of bootstrap iterations for confidence intervals
        n_jobs: Number of parallel jobs for model training (-1 = all cores)
        random_state: Random seed for reproducibility
        ci_width: Confidence interval width (0.95 = 95% CI)

    Example:
        >>> config = EvaluationConfig(n_folds=5, n_bootstrap=2000)
        >>> config.n_folds
        5
    """

    n_folds: int = 5
    n_bootstrap: int = 2000
    n_jobs: int = 2  # For parallel CRF
    random_state: int = 42
    ci_width: float = 0.95


@dataclass(frozen=True, slots=True)
class StatisticalResult:
    """Immutable result with confidence interval.

    This class stores statistical estimates with uncertainty quantification,
    including bootstrap confidence intervals and standard errors.

    Attributes:
        estimate: Point estimate (e.g., mean score)
        ci_lower: Lower bound of confidence interval
        ci_upper: Upper bound of confidence interval
        se: Standard error of the estimate
        fold_scores: Individual fold scores (for transparency)
        n_samples: Number of samples (e.g., number of folds)

    Example:
        >>> result = StatisticalResult(0.5, 0.3, 0.7, 0.1)
        >>> print(result)
        0.500, 95% CI [0.300, 0.700], SE: 0.100
    """

    estimate: float
    ci_lower: float
    ci_upper: float
    se: float
    fold_scores: Tuple[float, ...] = ()
    n_samples: int = 0

    def __str__(self) -> str:
        """Formatted representation.

        Returns:
            Formatted string with estimate, CI, and standard error

        Example:
            >>> result = StatisticalResult(0.5, 0.3, 0.7, 0.1)
            >>> print(result)
            0.500, 95% CI [0.300, 0.700], SE: 0.100
        """
        return f"{self.estimate:.3f}, 95% CI [{self.ci_lower:.3f}, {self.ci_upper:.3f}], SE: {self.se:.3f}"
