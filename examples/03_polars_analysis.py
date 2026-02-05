#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "polars>=1.0.0",
# ]
# ///

"""
TEI Corpus Analysis with Polars

This script demonstrates high-performance data analysis with Polars.
Run with: uv run examples/03_polars_analysis.py
"""

import json
import polars as pl
from pathlib import Path


def main():
    print("=" * 60)
    print("TEI Corpus - Polars Analysis Example")
    print("=" * 60)
    print()

    # Load splits
    with open('data/splits.json') as f:
        data = json.load(f)

    # Load training data as Polars DataFrame
    print("Loading training split with Polars...")
    train_details = data['split_details']['train']
    df = pl.DataFrame(train_details)

    print(f"✓ Loaded DataFrame: {df.shape}")
    print(f"  Rows: {df.height:,}")
    print(f"  Columns: {df.width}")
    print()

    # Show schema
    print("Schema:")
    for name, dtype in df.schema.items():
        print(f"  {name}: {dtype}")
    print()

    # Show first few rows
    print("First 5 rows:")
    print(df.head(5))
    print()

    # Add file existence check
    print("Checking file existence...")
    df = df.with_columns([
        pl.col('file').map_elements(
            lambda x: Path(x).exists(),
            return_dtype=pl.Boolean
        ).alias('exists')
    ])

    exist_count = df.filter(pl.col('exists')).height
    print(f"✓ Files exist: {exist_count:,}/{df.height:,}")
    print()

    # Count by corpus
    print("Documents by corpus:")
    corpus_counts = df.group_by('corpus').agg(
        pl.len().alias('count')
    ).sort('count', descending=True)

    for row in corpus_counts.iter_rows(named=True):
        print(f"  {row['corpus']}: {row['count']:,}")
    print()

    # Filter examples
    print("Filtering operations:")

    # Filter by corpus
    wright_df = df.filter(pl.col('corpus') == 'wright-american-fiction')
    print(f"  Wright American Fiction: {wright_df.height:,} docs")

    # Filter by file pattern
    dialogism_df = df.filter(pl.col('file').str.contains('novel-dialogism'))
    print(f"  Novel Dialogism corpus: {dialogism_df.height:,} docs")

    # Add filename column
    df = df.with_columns([
        pl.col('file').map_elements(
            lambda x: Path(x).name,
            return_dtype=pl.String
        ).alias('filename')
    ])
    print()
    print("Added filename column:")
    print(df.head(3).select('corpus', 'filename'))
    print()

    # Group by and aggregate
    print("Aggregation by corpus:")
    agg_df = df.group_by('corpus').agg([
        pl.len().alias('count'),
        pl.col('filename').str.len_chars().mean().alias('avg_filename_length')
    ]).sort('count', descending=True)

    print(agg_df)
    print()

    # Verify file access
    print("Verifying file access...")
    first_file = df[0, 'file']  # Polars syntax: df[row, col]
    if Path(first_file).exists():
        content = Path(first_file).read_text()
        print(f"✓ Read {len(content):,} characters from {Path(first_file).name}")
    else:
        print(f"✗ File not found: {first_file}")

    print()
    print("=" * 60)
    print("✓ Polars analysis successful!")
    print()
    print("Polars advantages:")
    print("  - Faster than pandas for large datasets")
    print("  - Lazy evaluation for memory efficiency")
    print("  - Expressive API for data manipulation")
    print("  - Multi-threaded operations")
    print("=" * 60)


if __name__ == '__main__':
    main()
