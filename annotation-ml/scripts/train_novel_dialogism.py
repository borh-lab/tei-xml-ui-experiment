#!/usr/bin/env python3
"""Train CRF model on novel-dialogism with quote-based speech labels."""

import sys
sys.path.insert(0, '/home/bor/Projects/tei-xml/annotation-ml/src')

import json
from pathlib import Path
from speech_detection.data.quote_based_extractor import QuoteBasedSpeechExtractor
from speech_detection.data.splits import load_splits
from speech_detection.models.crf import CRFModel
from speech_detection.models.protocols import CRFConfig
from speech_detection.evaluation import compute_f1, compute_precision, compute_recall
from sklearn.model_selection import KFold
import numpy as np

print("="*70)
print("TRAINING CRF ON NOVEL-DIALOGISM WITH QUOTE-BASED LABELS")
print("="*70)

# Load splits
splits_path = '../datasets/novel-dialogism/splits_quote_based.json'
print(f"\nLoading splits from {splits_path}...")
splits = load_splits(splits_path)

# Initialize quote-based parser
parser = QuoteBasedSpeechExtractor()

# Load data for each split
corpus_name = 'novel-dialogism'
corpus_dir = Path('../datasets/novel-dialogism')

all_data = {'train': [], 'validation': [], 'test': []}

for split_name in ['train', 'validation', 'test']:
    print(f"\nLoading {split_name} split...")
    file_names = splits['corpora'][corpus_name][split_name]
    print(f"  Files: {len(file_names)}")

    for file_name in file_names:
        file_path = corpus_dir / split_name / file_name
        if not file_path.exists():
            print(f"  Warning: File not found: {file_path}")
            continue

        try:
            paragraphs = parser.parse_and_label(str(file_path))
            all_data[split_name].extend(paragraphs)
        except Exception as e:
            print(f"  Error parsing {file_name}: {e}")
            continue

    print(f"  Loaded {len(all_data[split_name])} paragraphs")

# Print statistics
print("\n" + "="*70)
print("DATA STATISTICS")
print("="*70)

for split_name in ['train', 'validation', 'test']:
    data = all_data[split_name]
    total_tokens = sum(len(p['tokens']) for p in data)
    speech_tokens = sum(sum(1 for l in p['bio_labels'] if l != 'O') for p in data)
    speech_density = speech_tokens / total_tokens * 100 if total_tokens > 0 else 0

    print(f"\n{split_name.capitalize()}:")
    print(f"  Paragraphs: {len(data)}")
    print(f"  Tokens: {total_tokens}")
    print(f"  Speech tokens: {speech_tokens}")
    print(f"  Speech density: {speech_density:.2f}%")

# Prepare training data
print("\n" + "="*70)
print("TRAINING CRF MODEL")
print("="*70)

train_data = all_data['train']
val_data = all_data['validation']
test_data = all_data['test']

# Configure CRF
config = CRFConfig(
    c1=0.5,  # L1 regularization
    c2=0.5,  # L2 regularization
    max_iterations=100,
)

# Train model
print("\nInitializing CRF model...")
model = CRFModel(config)

print("Training on {} paragraphs...".format(len(train_data)))
model.train(train_data)

# Evaluate on validation set
print("\nEvaluating on validation set...")
val_predictions = model.predict_paragraphs(val_data)

val_true_labels = [p['bio_labels'] for p in val_data]
val_pred_labels = [p.predicted_bio_labels for p in val_predictions]

val_f1 = compute_f1(val_true_labels, val_pred_labels)
val_precision = compute_precision(val_true_labels, val_pred_labels)
val_recall = compute_recall(val_true_labels, val_pred_labels)

print("\nValidation Results:")
print(f"  F1:        {val_f1:.4f}")
print(f"  Precision: {val_precision:.4f}")
print(f"  Recall:    {val_recall:.4f}")

# Evaluate on test set
print("\nEvaluating on test set...")
test_predictions = model.predict_paragraphs(test_data)

test_true_labels = [p['bio_labels'] for p in test_data]
test_pred_labels = [p.predicted_bio_labels for p in test_predictions]

test_f1 = compute_f1(test_true_labels, test_pred_labels)
test_precision = compute_precision(test_true_labels, test_pred_labels)
test_recall = compute_recall(test_true_labels, test_pred_labels)

print("\nTest Results:")
print(f"  F1:        {test_f1:.4f}")
print(f"  Precision: {test_precision:.4f}")
print(f"  Recall:    {test_recall:.4f}")

# Save results
results_dir = Path('results/crf_novel_dialogism')
results_dir.mkdir(parents=True, exist_ok=True)

results = {
    'validation': {
        'f1': val_f1,
        'precision': val_precision,
        'recall': val_recall,
        'n_samples': len(val_data),
    },
    'test': {
        'f1': test_f1,
        'precision': test_precision,
        'recall': test_recall,
        'n_samples': len(test_data),
    },
    'data_stats': {
        'train_paragraphs': len(train_data),
        'val_paragraphs': len(val_data),
        'test_paragraphs': len(test_data),
    }
}

results_path = results_dir / 'metrics.json'
with open(results_path, 'w') as f:
    json.dump(results, f, indent=2)

print(f"\nResults saved to {results_path}")

# Save model
model_path = results_dir / 'crf_model.pkl'
model.save_model(str(model_path))
print(f"Model saved to {model_path}")

print("\n" + "="*70)
print("TRAINING COMPLETE")
print("="*70)
