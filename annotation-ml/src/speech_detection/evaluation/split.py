"""
Document-level splitting functions for cross-validation.

This module provides pure functions for creating document-level splits
to prevent data leakage during evaluation. All splits are performed at
the document level, not the paragraph level.
"""

from typing import Any, Dict, List, Set, Tuple

import numpy as np
from sklearn.model_selection import GroupKFold


def split_documents_by_id(
    data: List[Dict[str, Any]],
    n_folds: int,
    random_state: int
) -> List[Tuple[List[int], List[int]]]:
    """Create document-level cross-validation folds.

    This function ensures that all paragraphs from the same document
    stay in the same fold, preventing data leakage.

    Args:
        data: List of tokenized paragraphs with 'doc_id' field
        n_folds: Number of cross-validation folds
        random_state: Random seed for reproducibility

    Returns:
        List of (train_indices, test_indices) tuples for each fold

    Raises:
        ValueError: If n_folds is greater than number of unique documents

    Example:
        >>> data = [
        ...     {"doc_id": "doc1", "tokens": ["Hello"], "bio_labels": ["O"]},
        ...     {"doc_id": "doc1", "tokens": ["World"], "bio_labels": ["O"]},
        ...     {"doc_id": "doc2", "tokens": ["Hi"], "bio_labels": ["B-DIRECT"]},
        ... ]
        >>> folds = split_documents_by_id(data, n_folds=2, random_state=42)
        >>> len(folds)
        2
        >>> train_idx, test_idx = folds[0]
        >>> # Verify no document appears in both train and test
        >>> train_docs = set(data[i]["doc_id"] for i in train_idx)
        >>> test_docs = set(data[i]["doc_id"] for i in test_idx)
        >>> len(train_docs.intersection(test_docs))
        0
    """
    # Extract document IDs
    doc_ids = np.array([item.get('doc_id', f'doc_{i}') for i, item in enumerate(data)])
    unique_docs = np.unique(doc_ids)

    # Validate n_folds
    if n_folds > len(unique_docs):
        raise ValueError(
            f"n_folds ({n_folds}) cannot be greater than "
            f"number of unique documents ({len(unique_docs)})"
        )

    # Create document-level folds
    group_kfold = GroupKFold(n_splits=n_folds)
    folds = []

    for train_idx, test_idx in group_kfold.split(data, groups=doc_ids):
        folds.append((list(train_idx), list(test_idx)))

    return folds


def create_document_folds(
    data: List[Dict[str, Any]],
    n_folds: int,
    random_state: int
) -> List[Dict[str, Any]]:
    """Create detailed document-level folds with metadata.

    This is a helper function that provides additional information
    about each fold, such as document counts and speech ratios.

    Args:
        data: List of tokenized paragraphs with 'doc_id' and 'bio_labels' fields
        n_folds: Number of cross-validation folds
        random_state: Random seed for reproducibility

    Returns:
        List of fold dictionaries with train/test indices and metadata

    Example:
        >>> data = [
        ...     {"doc_id": "doc1", "tokens": ["Hello"], "bio_labels": ["O"]},
        ...     {"doc_id": "doc2", "tokens": ["Hi"], "bio_labels": ["B-DIRECT"]},
        ... ]
        >>> folds = create_document_folds(data, n_folds=2, random_state=42)
        >>> len(folds)
        2
        >>> fold = folds[0]
        >>> "fold" in fold and "train_indices" in fold and "test_indices" in fold
        True
    """
    # Get basic folds
    fold_indices = split_documents_by_id(data, n_folds, random_state)

    # Extract document IDs
    doc_ids = [item.get('doc_id', f'doc_{i}') for i, item in enumerate(data)]

    # Create detailed folds
    detailed_folds = []

    for fold_idx, (train_idx, test_idx) in enumerate(fold_indices):
        # Get document sets
        train_docs = set(doc_ids[i] for i in train_idx)
        test_docs = set(doc_ids[i] for i in test_idx)

        # Calculate speech ratio (proportion of paragraphs with speech)
        train_speech_ratio = np.mean([
            any(label != 'O' for label in data[i]['bio_labels'])
            for i in train_idx
        ]) if train_idx else 0.0

        test_speech_ratio = np.mean([
            any(label != 'O' for label in data[i]['bio_labels'])
            for i in test_idx
        ]) if test_idx else 0.0

        detailed_folds.append({
            'fold': fold_idx,
            'train_indices': train_idx,
            'test_indices': test_idx,
            'train_docs': len(train_docs),
            'test_docs': len(test_docs),
            'train_speech_ratio': float(train_speech_ratio),
            'test_speech_ratio': float(test_speech_ratio),
            'train_size': len(train_idx),
            'test_size': len(test_idx)
        })

    return detailed_folds


def verify_no_leakage(
    train_data: List[Dict[str, Any]],
    test_data: List[Dict[str, Any]]
) -> bool:
    """Verify that no document appears in both train and test sets.

    This validation function ensures data integrity by checking for
    document-level leakage between splits.

    Args:
        train_data: Training set paragraphs
        test_data: Test set paragraphs

    Returns:
        True if no leakage detected, False otherwise

    Example:
        >>> train = [
        ...     {"doc_id": "doc1", "tokens": ["Hello"], "bio_labels": ["O"]},
        ... ]
        >>> test = [
        ...     {"doc_id": "doc2", "tokens": ["Hi"], "bio_labels": ["B-DIRECT"]},
        ... ]
        >>> verify_no_leakage(train, test)
        True
        >>> test_leaky = [
        ...     {"doc_id": "doc1", "tokens": ["World"], "bio_labels": ["O"]},
        ... ]
        >>> verify_no_leakage(train, test_leaky)
        False
    """
    # Extract document IDs
    train_docs: Set[str] = set(
        item.get('doc_id', f'doc_{i}')
        for i, item in enumerate(train_data)
    )
    test_docs: Set[str] = set(
        item.get('doc_id', f'doc_{i}')
        for i, item in enumerate(test_data)
    )

    # Check for intersection
    leakage = train_docs.intersection(test_docs)

    if leakage:
        return False

    return True
