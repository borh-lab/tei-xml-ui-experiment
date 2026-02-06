#!/usr/bin/env python3
"""Train DistilBERT model on novel-dialogism with GPU support.

This script trains a DistilBERT model for speech detection using the
novel-dialogism corpus with quote-based labels.

Fast preset: 1 epoch for quick iteration.
"""

import sys
sys.path.insert(0, '/home/bor/Projects/tei-xml/annotation-ml/src')

import json
import time
import torch
from pathlib import Path

from speech_detection.data.parsers import TEIParser
from speech_detection.data.splits import load_splits
from speech_detection.models import DistilBERTModel, DistilBERTConfig
from speech_detection.evaluation import compute_f1, compute_precision, compute_recall

print("="*70)
print("TRAINING DISTILBERT ON NOVEL-DIALOGISM")
print("="*70)

# Check GPU availability
if torch.cuda.is_available():
    device = torch.device("cuda")
    print(f"\n✓ GPU detected: {torch.cuda.get_device_name(0)}")
    print(f"  Memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.2f} GB")
else:
    device = torch.device("cpu")
    print("\n✗ No GPU detected, using CPU (training will be slow)")

# Load splits
splits_path = Path('/home/bor/Projects/tei-xml/datasets/novel-dialogism/splits_quote_based.json')
print(f"\nLoading splits from {splits_path}...")
splits = load_splits(str(splits_path))

# Initialize parser
parser = TEIParser()

# Load data
corpus_dir = Path('/home/bor/Projects/tei-xml/datasets/novel-dialogism')

all_data = {'train': [], 'validation': [], 'test': []}

print("\nLoading data...")
for split_name in ['train', 'validation', 'test']:
    file_names = splits['corpora']['novel-dialogism'][split_name]
    print(f"  {split_name.capitalize()}: {len(file_names)} files")

    for file_name in file_names:
        file_path = corpus_dir / split_name / file_name
        if file_path.exists():
            doc = parser.parse_tei_file(str(file_path), file_path.stem)
            paras = parser.create_tokenized_paragraphs(doc)
            all_data[split_name].extend(paras)

    print(f"    Loaded {len(all_data[split_name])} paragraphs")

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

# Configure DistilBERT (fast preset: 1 epoch)
print("\n" + "="*70)
print("MODEL CONFIGURATION")
print("="*70)

config = DistilBERTConfig(
    model_name="distilbert/distilbert-base-cased",
    max_length=512,
    num_labels=5,  # O, B-DIRECT, I-DIRECT, B-INDIRECT, I-INDIRECT
    batch_size=16,  # Adjust based on GPU memory
    epochs=1,  # Fast preset
    learning_rate=2e-5,
    warmup_steps=100,
    bf16=True,  # Use mixed precision
    gradient_accumulation_steps=1,
)

print(f"\nModel: {config.model_name}")
print(f"Max length: {config.max_length}")
print(f"Batch size: {config.batch_size}")
print(f"Epochs: {config.epochs}")
print(f"Learning rate: {config.learning_rate}")
print(f"BFloat16: {config.bf16}")
print(f"Gradient accumulation: {config.gradient_accumulation_steps}")

# Initialize model
print("\n" + "="*70)
print("INITIALIZING MODEL")
print("="*70)

model = DistilBERTModel(config, device=device)
print(f"Model loaded on {device}")

# Prepare datasets
train_data = all_data['train']
val_data = all_data['validation']
test_data = all_data['test']

# Train
print("\n" + "="*70)
print("TRAINING")
print("="*70)
print(f"\nTraining on {len(train_data)} paragraphs for {config.epochs} epoch(s)...")

start_time = time.time()
model.train(train_data, val_data)
train_time = time.time() - start_time

print(f"\nTraining completed in {train_time/60:.2f} minutes")

# Evaluate on validation set
print("\n" + "="*70)
print("EVALUATION")
print("="*70)

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
results_dir = Path('results/distilbert_novel_dialogism')
results_dir.mkdir(parents=True, exist_ok=True)

results = {
    'config': {
        'model_name': config.model_name,
        'max_length': config.max_length,
        'batch_size': config.batch_size,
        'epochs': config.epochs,
        'learning_rate': config.learning_rate,
        'bf16': config.bf16,
    },
    'training': {
        'train_paragraphs': len(train_data),
        'val_paragraphs': len(val_data),
        'test_paragraphs': len(test_data),
        'train_time_minutes': train_time / 60,
        'device': str(device),
    },
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
}

results_path = results_dir / 'metrics.json'
with open(results_path, 'w') as f:
    json.dump(results, f, indent=2)

print(f"\nResults saved to {results_path}")

# Save model
model_path = results_dir / 'distilbert_model'
model.save_model(str(model_path))
print(f"Model saved to {model_path}")

print("\n" + "="*70)
print("TRAINING COMPLETE")
print("="*70)
