#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "datasets>=3.0.0",
# ]
# ///

"""
TEI Corpus Loading with HuggingFace Datasets

This script demonstrates loading the TEI corpus as a HuggingFace Dataset.
Run with: uv run examples/02_huggingface_datasets.py
"""

import json
from pathlib import Path
from datasets import Dataset, DatasetDict


def main():
    print("=" * 60)
    print("TEI Corpus - HuggingFace Datasets Example")
    print("=" * 60)
    print()

    # Load splits
    with open('data/splits.json') as f:
        data = json.load(f)

    # Convert to HuggingFace DatasetDict
    print("Converting to HuggingFace Dataset format...")
    splits = {}
    for split_name in ['train', 'validation', 'test']:
        details = data['split_details'][split_name]
        ds = Dataset.from_list(details)
        splits[split_name] = ds

    dataset_dict = DatasetDict(splits)

    print("✓ Created DatasetDict")
    print()
    print(dataset_dict)
    print()

    # Access training set
    train_ds = dataset_dict['train']
    print(f"Training set size: {len(train_ds):,} documents")
    print(f"Features: {train_ds.features}")
    print()

    # Show sample
    print("Sample from training set:")
    sample = train_ds[0]
    print(f"  File: {sample['file']}")
    print(f"  Corpus: {sample['corpus']}")
    print()

    # Filter by corpus
    print("Filtering examples by corpus...")
    wright_ds = train_ds.filter(lambda x: x['corpus'] == 'wright-american-fiction')
    print(f"✓ Wright American Fiction docs: {len(wright_ds):,}")
    print()

    # Count documents per corpus
    print("Documents per corpus in training set:")
    corpus_counts = train_ds.to_pandas()['corpus'].value_counts()
    for corpus, count in corpus_counts.items():
        print(f"  {corpus}: {count:,}")
    print()

    # Map function example: Add filename
    print("Adding filename column with map...")
    def add_filename(example):
        example['filename'] = Path(example['file']).name
        return example

    train_ds = train_ds.map(add_filename)
    print(f"✓ Added filename: {train_ds[0]['filename']}")
    print()

    # Verify file exists
    print("Verifying file access...")
    first_file = train_ds[0]['file']
    if Path(first_file).exists():
        content = Path(first_file).read_text()
        print(f"✓ Successfully read {len(content):,} characters from {Path(first_file).name}")
    else:
        print(f"✗ File not found: {first_file}")

    print()
    print("=" * 60)
    print("✓ HuggingFace Datasets integration successful!")
    print()
    print("You can now use this dataset with:")
    print("  - Transformers models (BERT, GPT, T5, etc.)")
    print("  - Trainer API for fine-tuning")
    print("  - Evaluation metrics")
    print("  - Data collators and samplers")
    print("=" * 60)


if __name__ == '__main__':
    main()
