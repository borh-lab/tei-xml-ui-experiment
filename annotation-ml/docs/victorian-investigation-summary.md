# Victorian Investigation Summary

## What We Found

The Victorian Women Writers corpus **DOES contain massive speech annotations** - but in poetry/drama format.

### Key Discovery: 121 Consecutive Speech Paragraphs

```
File: VAB7196.xml (test split)
Location: Paragraphs 6846-6966
Format: Poetry/drama with inline speaker attribution
Example: "Lionel.Then it is true!"
```

This is the **largest multi-paragraph speech sequence** found across all 7 corpora!

---

## Why Initial Analysis Was Wrong

| Analysis | Speech Density | Finding |
|----------|---------------|---------|
| Initial (quick sample) | 0.11% | Incorrect - missed speech section |
| Deep investigation | **16.80%** | Correct - found 121-paragraph sequence |

The speech section starts at paragraph 6846, so quick samples of first N paragraphs missed it.

---

## Speech Format

**Pattern:** `SpeakerName.Speech content`

Examples:
```
Lionel.Then it is true!
Eleanor.Oh Lionel, you lookSo strangely at me.
Lionel.No, 'tis at you I wonder.
```

**Characteristics:**
- No quote characters (poetry format)
- Speaker name followed by period
- Dramatic/poetic structure
- Inline speaker attribution

---

## Quote Baseline Performance

| Metric | Value |
|--------|-------|
| Gold speech tokens | 10,480 |
| Predicted speech | 4,080 |
| Overlap | 1,296 |
| **Recall** | **0.1237** |
| Quote characters in speech | **0** |

**Why low recall:** No quote characters for baseline to detect!

---

## Multi-Paragraph Speech Support

### User Requirement

> "We want to support multi-paragraph speech, which is common in novels"

### Status: ✅ ALREADY SUPPORTED

```python
QuoteBaselineModel(QuoteBaselineConfig(
    handle_multi_paragraph=True  # Already enabled
))
```

### Victorian as Test Case

The 121-paragraph consecutive speech sequence is **perfect for testing**:
- ✅ Validates continuity across paragraph boundaries
- ✅ Tests BIO labeling consistency
- ✅ Longest sequence found across all corpora
- ⚠️ Poetry format requires different detection approach

---

## Recommendations

### For Quote-Based Dialogue Detection

**USE:** novel-dialogism corpus
- 3.40% speech density
- Proper dialogue quotes
- Quote Baseline recall: **1.0000** ✅

### For Multi-Paragraph Testing

**USE:** Victorian corpus
- 121 consecutive speech paragraphs
- Tests boundary continuity
- Requires poetry-aware detection (no quote chars)

### For Future Work

1. Create poetry-aware speech detector for Victorian
2. Pattern matching: "SpeakerName.Speech"
3. TEI tag extraction from `<sp>` tags
4. Combine with quote-based for hybrid approach

---

## Files Updated

1. **`docs/victorian-corpus-analysis.md`** - Complete investigation details
2. **`docs/all-corpora-analysis.md`** - Updated with correct Victorian findings

---

## Conclusion

Victorian corpus **has substantial speech** (16.80% density) in poetry format:

✅ **Best multi-paragraph test case** (121 consecutive paragraphs)
⚠️ **Not suitable for quote-based detection** (no quote characters)
✅ **Valuable for poetry/drama speech detection** (requires different approach)

**Recommendation:** Use novel-dialogism for training quote-based models, Victorian for testing multi-paragraph support.
