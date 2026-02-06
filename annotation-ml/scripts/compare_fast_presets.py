#!/usr/bin/env python3
"""Compare all model types with fast presets on novel-dialogism corpus.

This script evaluates three model types:
1. Quote Baseline (rule-based, no training)
2. CRF (fast: 20 iterations)
3. DistilBERT (fast: 1 epoch)

Results are saved to results/fast_comparison.json
"""

import sys
sys.path.insert(0, '/home/bor/Projects/tei-xml/annotation-ml/src')

import json
import time
from pathlib import Path
from typing import Dict, List, Any

from speech_detection.data.parsers import TEIParser
from speech_detection.data.splits import load_splits
from speech_detection.models import (
    CRFModel,
    CRFConfig,
    DistilBERTModel,
    DistilBERTConfig,
    QuoteBaselineModel,
    QuoteBaselineConfig,
)
from speech_detection.evaluation import compute_f1, compute_precision, compute_recall


def load_test_data() -> List[Dict[str, Any]]:
    """Load test data from novel-dialogism corpus."""
    splits_path = Path('/home/bor/Projects/tei-xml/datasets/novel-dialogism/splits_quote_based.json')
    corpus_dir = Path('/home/bor/Projects/tei-xml/datasets/novel-dialogism')

    print("Loading test data...")
    splits = load_splits(str(splits_path))

    parser = TEIParser()
    test_data = []

    test_files = splits['corpora']['novel-dialogism']['test']
    for file_name in test_files:
        file_path = corpus_dir / 'test' / file_name
        if file_path.exists():
            doc = parser.parse_tei_file(str(file_path), file_path.stem)
            paras = parser.create_tokenized_paragraphs(doc)
            test_data.extend(paras)

    print(f"Loaded {len(test_data)} paragraphs from test set")
    return test_data


def evaluate_model(model_name: str, model, test_data: List[Dict[str, Any]]) -> Dict[str, float]:
    """Evaluate a model on test data.

    Args:
        model_name: Name of the model
        model: Model instance with predict_paragraphs method
        test_data: Test paragraphs

    Returns:
        Dictionary with metrics
    """
    print(f"\n{'='*70}")
    print(f"EVALUATING {model_name.upper()}")
    print(f"{'='*70}")

    start_time = time.time()

    predictions = model.predict_paragraphs(test_data)

    true_labels = [p['bio_labels'] for p in test_data]
    pred_labels = [p.predicted_bio_labels for p in predictions]

    f1 = compute_f1(true_labels, pred_labels)
    precision = compute_precision(true_labels, pred_labels)
    recall = compute_recall(true_labels, pred_labels)

    elapsed = time.time() - start_time

    print(f"\n{model_name} Results:")
    print(f"  F1:        {f1:.4f}")
    print(f"  Precision: {precision:.4f}")
    print(f"  Recall:    {recall:.4f}")
    print(f"  Time:      {elapsed:.2f}s")

    return {
        'f1': f1,
        'precision': precision,
        'recall': recall,
        'time_seconds': elapsed,
    }


def main():
    """Run comparison of all model types with fast presets."""
    print("="*70)
    print("FAST MODEL COMPARISON ON NOVEL-DIALOGISM")
    print("="*70)
    print("\nModel configurations:")
    print("  - Quote Baseline: rule-based, no training")
    print("  - CRF: 20 iterations (fast)")
    print("  - DistilBERT: 1 epoch (fast)")

    # Load test data once
    test_data = load_test_data()

    # Store all results
    all_results = {}

    # 1. Quote Baseline (no training needed)
    print("\n" + "="*70)
    print("QUOTE BASELINE (no training)")
    print("="*70)
    quote_baseline = QuoteBaselineModel(QuoteBaselineConfig())
    all_results['quote_baseline'] = evaluate_model('Quote Baseline', quote_baseline, test_data)

    # 2. CRF with fast preset
    print("\n" + "="*70)
    print("CRF MODEL (fast preset: 20 iterations)")
    print("="*70)

    # Load training data for CRF
    print("\nLoading training data for CRF...")
    splits_path = Path('/home/bor/Projects/tei-xml/datasets/novel-dialogism/splits_quote_based.json')
    splits = load_splits(str(splits_path))
    corpus_dir = Path('/home/bor/Projects/tei-xml/datasets/novel-dialogism')

    parser = TEIParser()
    train_data = []

    train_files = splits['corpora']['novel-dialogism']['train']
    for file_name in train_files[:10]:  # Only use 10 files for fast training
        file_path = corpus_dir / 'train' / file_name
        if file_path.exists():
            doc = parser.parse_tei_file(str(file_path), file_path.stem)
            paras = parser.create_tokenized_paragraphs(doc)
            train_data.extend(paras)

    print(f"Loaded {len(train_data)} paragraphs for training")

    # Configure CRF with fast preset
    crf_config = CRFConfig(
        c1=0.5,
        c2=0.5,
        max_iterations=20,  # Fast: only 20 iterations
    )

    crf_model = CRFModel(crf_config)

    print(f"\nTraining CRF ({len(train_data)} paragraphs, 20 iterations)...")
    start_time = time.time()
    crf_model.train(train_data)
    train_time = time.time() - start_time
    print(f"Training completed in {train_time:.2f}s")

    # Evaluate CRF
    crf_results = evaluate_model('CRF', crf_model, test_data)
    crf_results['train_time_seconds'] = train_time
    all_results['crf'] = crf_results

    # 3. DistilBERT with fast preset (commented out - requires GPU and lots of time)
    print("\n" + "="*70)
    print("DISTILBERT (SKIPPED - requires GPU)")
    print("="*70)
    print("\nNote: DistilBERT training is skipped for fast comparison.")
    print("To run DistilBERT, use the full training script with GPU support.")

    # Add placeholder for DistilBERT
    all_results['distilbert'] = {
        'f1': None,
        'precision': None,
        'recall': None,
        'time_seconds': None,
        'note': 'Skipped - requires GPU for fast training',
    }

    # Print comparison table
    print("\n" + "="*70)
    print("COMPARISON TABLE")
    print("="*70)
    print(f"{'Model':<20} {'F1':<10} {'Precision':<10} {'Recall':<10} {'Time':<10}")
    print("-" * 70)

    for model_name, results in all_results.items():
        if results.get('f1') is not None:
            print(f"{model_name:<20} {results['f1']:<10.4f} {results['precision']:<10.4f} "
                  f"{results['recall']:<10.4f} {results['time_seconds']:<10.2f}")
        else:
            print(f"{model_name:<20} {'Skipped':<10} {results.get('note', ''):<40}")

    # Save results
    results_dir = Path('results/fast_comparison')
    results_dir.mkdir(parents=True, exist_ok=True)

    results_path = results_dir / 'metrics.json'
    with open(results_path, 'w') as f:
        json.dump(all_results, f, indent=2)

    print(f"\nResults saved to {results_path}")

    print("\n" + "="*70)
    print("COMPARISON COMPLETE")
    print("="*70)


if __name__ == '__main__':
    main()
