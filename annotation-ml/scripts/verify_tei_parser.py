#!/usr/bin/env python3
"""Verify TEIParser correctly handles novel-dialogism quote tags."""

import sys
sys.path.insert(0, '/home/bor/Projects/tei-xml/annotation-ml/src')

from pathlib import Path
from speech_detection.data.parsers import TEIParser
from speech_detection.data.splits import load_splits
from speech_detection.evaluation import compute_f1, compute_precision, compute_recall

print("="*70)
print("VERIFYING TEIPARSER ON NOVEL-DIALOGISM")
print("="*70)

# Load splits
splits_path = '../datasets/novel-dialogism/splits_quote_based.json'
splits = load_splits(splits_path)

# Initialize TEI parser
parser = TEIParser()

# Load test data
corpus_name = 'novel-dialogism'
corpus_dir = Path('../datasets/novel-dialogism')
split_name = 'test'

file_names = splits['corpora'][corpus_name][split_name]
print(f"\nLoading {split_name} split: {len(file_names)} files")

data = []
for file_name in file_names:
    file_path = corpus_dir / split_name / file_name
    if not file_path.exists():
        continue

    try:
        doc = parser.parse_tei_file(str(file_path), Path(file_path).stem)
        paras = parser.create_tokenized_paragraphs(doc)
        data.extend(paras)
    except Exception as e:
        print(f"  Error parsing {file_name}: {e}")
        continue

print(f"Loaded {len(data)} paragraphs")

# Show some examples
print("\n" + "="*70)
print("EXAMPLE PARAGRAPHS WITH SPEECH")
print("="*70)

speech_examples = [p for p in data if any(l != 'O' for l in p['bio_labels'])]
print(f"\nFound {len(speech_examples)} paragraphs with speech")

for i, example in enumerate(speech_examples[:5], 1):
    print(f"\nExample {i}:")
    print(f"  Text: {example['text'][:150]}...")
    print(f"  Tokens: {example['tokens'][:10]}...")
    print(f"  Labels: {example['bio_labels'][:10]}...")
    speech_count = sum(1 for l in example['bio_labels'] if l != 'O')
    print(f"  Speech tokens: {speech_count}/{len(example['tokens'])}")

# Show some paragraphs without speech
print("\n" + "="*70)
print("EXAMPLE PARAGRAPHS WITHOUT SPEECH")
print("="*70)

non_speech_examples = [p for p in data if all(l == 'O' for l in p['bio_labels'])]
print(f"\nFound {len(non_speech_examples)} paragraphs without speech")

for i, example in enumerate(non_speech_examples[:3], 1):
    print(f"\nExample {i}:")
    print(f"  Text: {example['text'][:150]}...")

# Calculate statistics
print("\n" + "="*70)
print("STATISTICS")
print("="*70)

total_tokens = sum(len(p['tokens']) for p in data)
speech_tokens = sum(sum(1 for l in p['bio_labels'] if l != 'O') for p in data)
speech_density = speech_tokens / total_tokens * 100 if total_tokens > 0 else 0

print(f"\nTotal paragraphs: {len(data)}")
print(f"Total tokens: {total_tokens}")
print(f"Speech tokens: {speech_tokens}")
print(f"Speech density: {speech_density:.2f}%")
print(f"Paragraphs with speech: {len(speech_examples)}")
print(f"Paragraphs without speech: {len(non_speech_examples)}")
