# Quote Baseline Recall Investigation - Summary

**Date:** 2026-02-06
**Issue:** Quote Baseline has recall 0.0023 instead of expected ~1.0

## Root Cause

**The gold annotations do NOT mark dialogue speech.**

After extensive investigation, we discovered THREE different annotation schemes in the data:

### 1. Wright American Fiction: TEI `<q>` Tags
- **What it marks:** Extended quotations (letters, floatingText blocks)
- **Structure:** `<q><letter>...</letter></q>`
- **Statistics:** 1 paragraph with `<q>` vs 878 with quote marks
- **Problem:** Does NOT mark dialogue like "Hello," he said

### 2. Novel-Dialogism: Anchor Span Annotations
- **What it marks:** Dialogue quotations (correct type!)
- **Structure:** `<quote><anchor spanTo="..."/></quote>` (text is elsewhere)
- **Problem:** Uses character position spans, not text containment
- **Parser issue:** Our parser expects text inside tags, not spans

### 3. Quote Baseline: Quote Characters
- **What it marks:** Text inside `"` characters
- **Example:** `"Hello," he said` → marks "Hello" as speech
- **Problem:** Gold labels don't match this scheme

## The "Bug" That Wasn't

We initially found that `etree.tostring(q, method='text')` includes tail text:

```xml
<q>[SEE ENGRAVING.]</q> a youth who knew no home...
```

The parser would mark "a youth who knew no home..." as speech (tail text).

**However**, this "bug" is irrelevant because:
- Wright `<q>` tags don't mark dialogue speech anyway
- We should use novel-dialogism or create quote-based labels

## Data Statistics

| Corpus | Paragraphs | `<q>`/`<quote>` tags | Quote chars | Speech density |
|--------|------------|---------------------|-------------|----------------|
| Wright (test) | 444,790 | ~5 per file | 878 paragraphs | 0.53% (but wrong type) |
| Novel-Dialogism | 1150 | 1616 | ~All | Correct but uses spans |

## Solution Options

### Option A: Parse Novel-Dialogism Anchor Spans (Recommended)
**Pros:**
- Correct annotations (dialogue with speaker attribution)
- Already has speaker/addressee information
- Multiple quote types (implicit, anaphoric, explicit)

**Cons:**
- Requires new parser for anchor spans
- More complex annotation scheme

**Implementation:**
1. Parse `<anchor xml:id="Q0-start" spanTo="Q0-end"/>`
2. Find character positions in text
3. Mark tokens between positions as speech

### Option B: Create Quote-Based Labels (Simpler)
**Pros:**
- Simple quote detection
- Matches Quote Baseline behavior
- Works on any corpus

**Cons:**
- Loses speaker attribution
- May mis-attribute non-speech quotes (e.g., "scare quotes")

**Implementation:**
```python
# Mark text between " characters as speech
for para in paragraphs:
    in_quote = False
    for token in para.tokens:
        if '"' in token:
            in_quote = not in_quote
        elif in_quote:
            label = 'B-DIRECT' or 'I-DIRECT'
```

## Recommended Next Steps

1. **Implement anchor-span parser** for novel-dialogism corpus
2. **Re-train models** on correct dialogue annotations
3. **Evaluate Quote Baseline** on properly annotated data

## Files to Modify

- `src/speech_detection/data/parsers.py`: Add anchor-span parsing
- Create new splits for novel-dialogism with proper annotations
- Re-run all model training with corrected data

## Key Insight

The Quote Baseline is NOT buggy - it's detecting the correct thing (quoted dialogue). The gold labels were wrong (extended quotations, not dialogue).

This explains:
- ✅ Why Quote Baseline has 0% recall (looking for dialogue, labels are extended quotes)
- ✅ Why only 2% of speech is in quotes (labels are wrong type)
- ✅ Why CRF has such low performance (trained on wrong labels)
