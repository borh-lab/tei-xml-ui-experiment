"""Data module for speech detection."""

from speech_detection.data.parsers import TEIParser, load_corpus, parse_tei_file
from speech_detection.data.protocols import TEIDocument, TEIParagraph  # noqa: F401
from speech_detection.data.splits import (
    get_files_for_split,
    get_split_info,
    load_split_data,
    load_splits,
)

__all__ = [
    "TEIParser",
    "parse_tei_file",
    "load_corpus",
    "TEIParagraph",
    "TEIDocument",
    "load_splits",
    "get_files_for_split",
    "load_split_data",
    "get_split_info",
]
