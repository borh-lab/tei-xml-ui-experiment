#!/usr/bin/env python3
"""
Load TEI Corpora with HuggingFace Datasets

This script demonstrates how to load the exported TEI corpus splits
using the HuggingFace datasets library.

Requirements:
    uv run scripts/load-datasets.py

Usage:
    # Load all corpora
    uv run scripts/load-datasets.py

    # Load specific corpus
    uv run scripts/load-datasets.py --corpus wright-american-fiction

    # Show statistics only
    uv run scripts/load-datasets.py --stats
"""

# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "datasets>=3.0.0",
# ]
# ///

import json
import argparse
from pathlib import Path
from typing import Dict, List, Any
from datasets import Dataset, DatasetDict


def load_splits(splits_path: str = "datasets/splits.json") -> Dict[str, Any]:
    """Load the splits configuration."""
    with open(splits_path, "r") as f:
        return json.load(f)


def load_metadata(corpus_id: str, metadata_dir: str = "datasets") -> Dict[str, Any]:
    """Load metadata for a specific corpus."""
    metadata_path = Path(metadata_dir) / corpus_id / "metadata.json"
    with open(metadata_path, "r") as f:
        return json.load(f)


def load_corpus_files(
    corpus_id: str,
    split: str,
    datasets_dir: str = "datasets"
) -> List[str]:
    """Load file paths for a corpus and split."""
    corpus_dir = Path(datasets_dir) / corpus_id / split
    if not corpus_dir.exists():
        return []
    return [str(f) for f in corpus_dir.glob("*.xml")]


def read_tei_file(filepath: str) -> str:
    """Read content of a TEI file."""
    with open(filepath, "r", encoding="utf-8") as f:
        return f.read()


def create_dataset(
    corpus_id: str,
    datasets_dir: str = "datasets"
) -> DatasetDict:
    """
    Create a HuggingFace DatasetDict for a corpus.

    Returns:
        DatasetDict with train, validation, and test splits
    """
    splits = load_splits()
    corpus_splits = splits["corpora"].get(corpus_id)

    if not corpus_splits:
        raise ValueError(f"Corpus '{corpus_id}' not found in splits")

    # Load file paths for each split
    train_files = load_corpus_files(corpus_id, "train", datasets_dir)
    val_files = load_corpus_files(corpus_id, "validation", datasets_dir)
    test_files = load_corpus_files(corpus_id, "test", datasets_dir)

    # Create datasets
    def create_split(filepaths: List[str]) -> Dataset:
        data = {
            "file": [],
            "content": [],
        }

        for filepath in filepaths:
            try:
                content = read_tei_file(filepath)
                data["file"].append(filepath)
                data["content"].append(content)
            except Exception as e:
                print(f"Warning: Failed to read {filepath}: {e}")

        return Dataset.from_dict(data)

    dataset_dict = DatasetDict({
        "train": create_split(train_files),
        "validation": create_split(val_files),
        "test": create_split(test_files),
    })

    return dataset_dict


def load_all_corpora(datasets_dir: str = "datasets") -> Dict[str, DatasetDict]:
    """
    Load all corpora as a dictionary of DatasetDicts.

    Returns:
        Dict mapping corpus_id to DatasetDict
    """
    splits = load_splits()
    corpora = {}

    for corpus_id in splits["corpora"].keys():
        print(f"Loading {corpus_id}...")
        try:
            corpora[corpus_id] = create_dataset(corpus_id, datasets_dir)
        except Exception as e:
            print(f"Error loading {corpus_id}: {e}")

    return corpora


def print_statistics(splits_path: str = "datasets/splits.json"):
    """Print statistics about the datasets."""
    splits = load_splits(splits_path)
    summary = splits["summary"]

    print("=" * 60)
    print("TEI Corpus Statistics")
    print("=" * 60)
    print(f"\nTotal Documents: {summary['totalDocuments']:,}")
    print(f"  Train:      {summary['trainCount']:,} ({summary['trainCount']/summary['totalDocuments']*100:.1f}%)")
    print(f"  Validation: {summary['valCount']:,} ({summary['valCount']/summary['totalDocuments']*100:.1f}%)")
    print(f"  Test:       {summary['testCount']:,} ({summary['testCount']/summary['totalDocuments']*100:.1f}%)")

    print("\n" + "-" * 60)
    print("Per-Corpora Breakdown:")
    print("-" * 60)

    for corpus_id, corpus_splits in splits["corpora"].items():
        total = len(corpus_splits["train"]) + len(corpus_splits["validation"]) + len(corpus_splits["test"])
        if total > 0:
            print(f"\n{corpus_id}:")
            print(f"  Total: {total:,}")
            print(f"  Train:      {len(corpus_splits['train']):,}")
            print(f"  Validation: {len(corpus_splits['validation']):,}")
            print(f"  Test:       {len(corpus_splits['test']):,}")

    print("\n" + "=" * 60)


def main():
    parser = argparse.ArgumentParser(
        description="Load TEI corpora with HuggingFace datasets"
    )
    parser.add_argument(
        "--corpus",
        type=str,
        help="Specific corpus to load (default: load all)"
    )
    parser.add_argument(
        "--stats",
        action="store_true",
        help="Show statistics only"
    )
    parser.add_argument(
        "--datasets-dir",
        type=str,
        default="datasets",
        help="Path to datasets directory (default: datasets)"
    )
    parser.add_argument(
        "--sample",
        type=int,
        default=None,
        help="Print first N samples from dataset"
    )

    args = parser.parse_args()

    # Check if datasets directory exists
    datasets_dir = Path(args.datasets_dir)
    if not datasets_dir.exists():
        print(f"Error: Datasets directory '{datasets_dir}' not found.")
        print("Run: bun run corpus:export")
        return 1

    if args.stats:
        print_statistics(str(datasets_dir / "splits.json"))
        return 0

    if args.corpus:
        # Load single corpus
        print(f"Loading corpus: {args.corpus}")
        try:
            dataset = create_dataset(args.corpus, args.datasets_dir)
            print(f"\n✓ Loaded {args.corpus}")
            print(f"  Train:      {len(dataset['train']):,} examples")
            print(f"  Validation: {len(dataset['validation']):,} examples")
            print(f"  Test:       {len(dataset['test']):,} examples")

            if args.sample:
                print(f"\n--- Sample ({args.sample} from train) ---")
                for i, example in enumerate(dataset["train"].take(args.sample)):
                    print(f"\n[{i}] File: {example['file']}")
                    content_preview = example["content"][:200]
                    print(f"Content: {content_preview}...")

        except Exception as e:
            print(f"Error: {e}")
            return 1
    else:
        # Load all corpora
        print("Loading all corpora...")
        corpora = load_all_corpora(args.datasets_dir)

        print("\n" + "=" * 60)
        print("Loaded Corpora:")
        print("=" * 60)

        for corpus_id, dataset in corpora.items():
            print(f"\n{corpus_id}:")
            print(f"  Train:      {len(dataset['train']):,} examples")
            print(f"  Validation: {len(dataset['validation']):,} examples")
            print(f"  Test:       {len(dataset['test']):,} examples")

    return 0


if __name__ == "__main__":
    exit(main())
