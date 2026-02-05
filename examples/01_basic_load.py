#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///

"""
Basic TEI Corpus Loading - No External Dependencies

This script demonstrates loading the TEI corpus with only Python standard library.
Run with: uv run examples/01_basic_load.py
"""

import json
from pathlib import Path


def main():
    print("=" * 60)
    print("TEI Corpus - Basic Loading Example")
    print("=" * 60)
    print()

    # Load dataset info
    with open('data/splits.json') as f:
        data = json.load(f)

    info = data['dataset_info']

    # Display dataset information
    print(f"Dataset: {info['name']}")
    print(f"Version: {info['version']}")
    print(f"Description: {info['description']}")
    print()
    print("Split sizes:")
    print(f"  Train:      {info['splits']['train']:,}")
    print(f"  Validation: {info['splits']['validation']:,}")
    print(f"  Test:       {info['splits']['test']:,}")
    print(f"  Total:      {info['total_documents']:,}")
    print()

    # Load training split
    train_files = data['splits']['train']
    print(f"✓ Loaded {len(train_files):,} training file paths")
    print()

    # Show first few files
    print("First 5 training files:")
    for i, filepath in enumerate(train_files[:5], 1):
        exists = "✓" if Path(filepath).exists() else "✗"
        print(f"  {i}. {exists} {filepath}")

    print()

    # Read and display first document
    first_file = train_files[0]
    if Path(first_file).exists():
        content = Path(first_file).read_text()
        print(f"First document ({first_file}):")
        print("-" * 60)
        print(content[:300])
        if len(content) > 300:
            print("...")
        print("-" * 60)
        print(f"Total size: {len(content):,} characters")
    else:
        print(f"✗ File not found: {first_file}")

    print()
    print("=" * 60)
    print("✓ Basic loading successful!")
    print("=" * 60)


if __name__ == '__main__':
    main()
