"""Load data using splits.json configuration."""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from speech_detection.data.parsers import TEIParser


def load_splits(splits_path: str = "../datasets/splits.json") -> Dict[str, Any]:
    """Load the splits configuration.

    Args:
        splits_path: Path to splits.json file

    Returns:
        Dictionary with splits configuration
    """
    with open(splits_path, "r") as f:
        return json.load(f)


def get_files_for_split(
    split: str,
    splits_path: str = "../datasets/splits.json",
    base_dir: str = "..",
    corpora: Optional[List[str]] = None,
) -> List[Tuple[str, str]]:
    """Get file paths for a specific split.

    Args:
        split: One of 'train', 'validation', or 'test'
        splits_path: Path to splits.json file
        base_dir: Base directory for resolving relative paths
        corpora: Optional list of corpus names to include (default: all)

    Returns:
        List of tuples (corpus_name, absolute_file_path)
    """
    splits = load_splits(splits_path)
    base_path = Path(base_dir)

    file_paths: List[Tuple[str, str]] = []

    # Iterate through all corpora
    for corpus_name, corpus_splits in splits["corpora"].items():
        if corpora and corpus_name not in corpora:
            continue

        if split not in corpus_splits:
            continue

        # Try both datasets/ and corpora/ directories
        corpus_dir = None
        for dir_name in ["datasets", "corpora"]:
            test_dir = base_path / dir_name / corpus_name
            if test_dir.exists() and any(test_dir.glob("*.xml")):
                corpus_dir = test_dir
                break

        if corpus_dir is None:
            # Skip this corpus if no files found
            continue

        for filename in corpus_splits[split]:
            abs_path = corpus_dir / filename
            if abs_path.exists():
                file_paths.append((corpus_name, str(abs_path)))

    return file_paths


def load_split_data(
    split: str,
    splits_path: str = "../datasets/splits.json",
    base_dir: str = "..",
    max_docs: Optional[int] = None,
    parser: Optional[TEIParser] = None,
    corpora: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    """Load and parse data for a specific split.

    Args:
        split: One of 'train', 'validation', or 'test'
        splits_path: Path to splits.json file
        base_dir: Base directory for resolving relative paths
        max_docs: Maximum number of documents to load
        parser: TEIParser instance (creates new one if not provided)
        corpora: Optional list of corpus names to include (default: all)

    Returns:
        List of tokenized paragraphs
    """
    if parser is None:
        parser = TEIParser()

    file_paths = get_files_for_split(split, splits_path, base_dir, corpora)
    if max_docs:
        file_paths = file_paths[:max_docs]

    all_data: List[Dict[str, Any]] = []
    for _corpus_name, file_path in file_paths:
        try:
            doc = parser.parse_tei_file(file_path, Path(file_path).stem)
            paras = parser.create_tokenized_paragraphs(doc)
            all_data.extend(paras)
        except Exception as e:
            print(f"Warning: Failed to parse {file_path}: {e}")
            continue

    return all_data


def get_split_info(
    splits_path: str = "../datasets/splits.json", corpora: Optional[List[str]] = None
) -> Dict[str, Any]:
    """Get information about splits.

    Args:
        splits_path: Path to splits.json file
        corpora: Optional list of corpus names to include (default: all)

    Returns:
        Dictionary with split sizes and corpus breakdown
    """
    splits = load_splits(splits_path)

    info: Dict[str, Any] = {"train": 0, "validation": 0, "test": 0, "total": 0, "corpora": {}}

    for corpus_name, corpus_splits in splits["corpora"].items():
        if corpora and corpus_name not in corpora:
            continue

        train_count = len(corpus_splits.get("train", []))
        val_count = len(corpus_splits.get("validation", []))
        test_count = len(corpus_splits.get("test", []))

        corpus_info: Dict[str, int] = {
            "train": train_count,
            "validation": val_count,
            "test": test_count,
            "total": train_count + val_count + test_count,
        }

        info["corpora"][corpus_name] = corpus_info
        info["train"] += corpus_info["train"]
        info["validation"] += corpus_info["validation"]
        info["test"] += corpus_info["test"]
        info["total"] += corpus_info["total"]

    return info
