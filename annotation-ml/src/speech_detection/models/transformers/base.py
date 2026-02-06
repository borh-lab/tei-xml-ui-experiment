"""Shared transformer infrastructure for speech detection models.

This module provides common utilities for transformer-based models including
label encoding, metrics computation, and dataset handling.
"""

from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from torch.utils.data import Dataset
from transformers import PreTrainedTokenizer

# Label encoding constants (shared across all models)
LABEL_ENCODING = {
    "O": 0,
    "B-DIRECT": 1,
    "I-DIRECT": 2,
    "B-INDIRECT": 3,
    "I-INDIRECT": 4,
}
LABEL_DECODING = {v: k for k, v in LABEL_ENCODING.items()}


def compute_metrics(eval_preds: Tuple[np.ndarray, np.ndarray]) -> Dict[str, float]:
    """Compute metrics for token classification using seqeval.

    Args:
        eval_preds: Tuple of (logits, labels) from evaluation

    Returns:
        Dictionary with f1, precision, and recall metrics
    """
    from seqeval.metrics import f1_score, precision_score, recall_score

    logits, labels = eval_preds
    predictions = np.argmax(logits, axis=-1)

    # Remove -100 labels (ignored indices)
    true_labels = []
    pred_labels = []

    for pred_row, label_row in zip(predictions, labels, strict=True):
        true_seq = []
        pred_seq = []

        for pred, label in zip(pred_row, label_row, strict=True):
            if label != -100:
                true_seq.append(LABEL_DECODING.get(label, "O"))
                pred_seq.append(LABEL_DECODING.get(pred, "O"))

        if true_seq:  # Only add non-empty sequences
            true_labels.append(true_seq)
            pred_labels.append(pred_seq)

    # Calculate metrics
    f1 = f1_score(true_labels, pred_labels)
    precision = precision_score(true_labels, pred_labels)
    recall = recall_score(true_labels, pred_labels)

    return {"f1": f1, "precision": precision, "recall": recall}


def align_bio_labels(word_ids: List[Optional[int]], bio_labels: List[str]) -> List[int]:
    """Align BIO labels with tokenizer output word_ids.

    This function handles the alignment between word-level BIO labels and
    tokenizer subword tokens. It assigns -100 to special tokens and subwords
    (except the first subword of each word).

    Args:
        word_ids: List of word indices from tokenizer (None for special tokens)
        bio_labels: List of BIO labels at word level

    Returns:
        List of label IDs aligned with tokenizer output (-100 for ignored tokens)
    """
    label_ids = []

    for word_idx in word_ids:
        if word_idx is None:
            # Special token ([CLS], [SEP], etc.)
            label_ids.append(-100)
        elif word_idx >= len(bio_labels):
            # Token out of bounds (shouldn't happen with truncation)
            label_ids.append(LABEL_ENCODING["O"])
        else:
            # Use the label for this word
            label = bio_labels[word_idx]
            label_ids.append(LABEL_ENCODING.get(label, LABEL_ENCODING["O"]))

    return label_ids


class SpeechDataset(Dataset):
    """Dataset for transformer token classification with dynamic padding.

    This dataset uses dynamic padding: tokens are padded only within batches,
    not to a fixed max_length. This is more efficient than padding everything
    to the maximum sequence length.
    """

    def __init__(
        self,
        tokenized_data: List[Dict[str, Any]],
        tokenizer: PreTrainedTokenizer,
        max_length: int = 512,
    ):
        """Initialize the dataset.

        Args:
            tokenized_data: List of tokenized paragraphs
            tokenizer: Pre-trained tokenizer
            max_length: Maximum sequence length for truncation
        """
        self.tokenized_data = tokenized_data
        self.tokenizer = tokenizer
        self.max_length = max_length

        # Store metadata separately to avoid collation issues
        self._metadata = [
            {
                "text": p["text"],
                "original_labels": p["bio_labels"],
                "doc_id": p.get("doc_id", "unknown"),
                "para_id": p.get("para_id", "unknown"),
            }
            for p in tokenized_data
        ]

    def __len__(self) -> int:
        """Get the number of samples in the dataset."""
        return len(self.tokenized_data)

    def __getitem__(self, idx: int) -> Dict[str, Any]:
        """Get a single sample from the dataset.

        Args:
            idx: Sample index

        Returns:
            Dictionary with input_ids and labels (no padding)
        """
        para = self.tokenized_data[idx]
        text = para["text"]
        bio_labels = para["bio_labels"]

        # Tokenize WITHOUT padding (will pad dynamically in batch)
        encoding = self.tokenizer(
            text,
            truncation=True,
            max_length=self.max_length,
            padding=False,  # Dynamic padding!
            return_tensors=None,  # Return lists, not tensors
            return_offsets_mapping=False,
            return_attention_mask=False,
        )

        # Align BIO labels with tokenizer output
        word_ids = encoding.word_ids(batch_index=0)
        label_ids = align_bio_labels(word_ids, bio_labels)

        # Return only tokenization outputs for batching (no metadata!)
        return {
            "input_ids": encoding["input_ids"],
            "labels": label_ids,
        }
