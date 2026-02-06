"""Baseline models for speech detection.

This module provides rule-based baseline models that do not require training,
serving as strong references for model comparison.
"""

from .quote_baseline import QuoteBaselineModel

__all__ = ["QuoteBaselineModel"]
