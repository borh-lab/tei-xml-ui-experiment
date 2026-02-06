#!/usr/bin/env python3
"""Debug why Quote Baseline doesn't achieve perfect recall on its own labels."""

import sys
sys.path.insert(0, '/home/bor/Projects/tei-xml/annotation-ml/src')

from speech_detection.models import QuoteBaselineModel, QuoteBaselineConfig
from speech_detection.data.quote_based_extractor import generate_quote_based_labels

# Test with a simple example
test_paragraphs = [
    {'text': 'He said "Hello world!" and walked away.', 'tokens': 'He said "Hello world!" and walked away.'.split()},
    {'text': 'She replied "Hi there!" to him.', 'tokens': 'She replied "Hi there!" to him.'.split()},
    {'text': 'No speech in this paragraph.', 'tokens': 'No speech in this paragraph.'.split()},
]

print("="*70)
print("TESTING QUOTE BASELINE DETERMINISM")
print("="*70)

print("\nTest paragraphs:")
for i, p in enumerate(test_paragraphs):
    print(f"  {i+1}. {p['text']}")
    print(f"     Tokens: {p['tokens']}")

# Generate labels using generate_quote_based_labels
print("\n" + "="*70)
print("FIRST PREDICTION (generate_quote_based_labels)")
print("="*70)

labeled = generate_quote_based_labels(test_paragraphs)
labels1 = [p['bio_labels'] for p in labeled]

for i, (para, labels) in enumerate(zip(test_paragraphs, labels1)):
    print(f"\nPara {i+1}:")
    print(f"  Text: {para['text']}")
    print(f"  Labels: {labels}")

# Generate labels again with a new baseline model
print("\n" + "="*70)
print("SECOND PREDICTION (new QuoteBaselineModel)")
print("="*70)

baseline2 = QuoteBaselineModel(QuoteBaselineConfig())
predictions2 = baseline2.predict_paragraphs(test_paragraphs)
labels2 = [p.predicted_bio_labels for p in predictions2]

for i, (para, labels) in enumerate(zip(test_paragraphs, labels2)):
    print(f"\nPara {i+1}:")
    print(f"  Text: {para['text']}")
    print(f"  Labels: {labels}")

# Compare
print("\n" + "="*70)
print("COMPARISON")
print("="*70)

for i, (l1, l2) in enumerate(zip(labels1, labels2)):
    match = "✅" if l1 == l2 else "❌"
    print(f"Para {i+1}: {match}")
    if l1 != l2:
        print(f"  First:  {l1}")
        print(f"  Second: {l2}")

# Check overlap
import numpy as np
from speech_detection.evaluation import compute_f1, compute_precision, compute_recall

print("\n" + "="*70)
print("METRICS (First vs Second)")
print("="*70)

f1 = compute_f1(labels1, labels2)
precision = compute_precision(labels1, labels2)
recall = compute_recall(labels1, labels2)

print(f"F1:        {f1:.4f}")
print(f"Precision: {precision:.4f}")
print(f"Recall:    {recall:.4f}")

if recall == 1.0 and precision == 1.0:
    print("\n✅ Quote Baseline is deterministic")
else:
    print("\n❌ Quote Baseline is NOT deterministic!")
