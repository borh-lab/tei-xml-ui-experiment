# Pattern Engine Accuracy Test Results

**Date:** 2026-01-26
**Test Suite:** Pattern Engine Accuracy Integration Tests
**Status:** ✅ All Tests Passing (9/9)

## Overview

This document reports the accuracy metrics for the pattern engine dialogue detection system. The tests evaluate the current regex-based fallback implementation on a manually annotated dataset of five literary works.

## Test Dataset

The evaluation uses a manually annotated corpus of 5 public domain literary works:

1. **The Yellow Wallpaper** (Charlotte Perkins Gilman, 1892)
2. **The Gift of the Magi** (O. Henry, 1905)
3. **The Tell-Tale Heart** (Edgar Allan Poe, 1843)
4. **An Occurrence at Owl Creek Bridge** (Ambrose Bierce, 1890)
5. **Pride and Prejudice Chapter 1** (Jane Austen, 1813)

**Total Dialogue Annotations:** 106 passages across all documents

## Current Implementation

### Detection Method
- **Primary:** Ax AI framework (currently failing due to signature validation)
- **Fallback:** Multi-pattern regex-based detection

### Regex Patterns
1. Double-quoted dialogue: `"([^"]+)"` (confidence: 0.7)
2. Em-dash dialogue: `—([^—]+)—` (confidence: 0.6)
3. Single-quoted dialogue with speech verbs (confidence: 0.5)

### Detection Characteristics
- **Precision-oriented:** Prioritizes reducing false positives
- **Multi-pattern:** Handles various dialogue formatting styles
- **Context-aware:** Uses speech verb detection for single quotes

## Test Results

### Individual Document Results

#### 1. The Yellow Wallpaper
- **True Positives:** 1
- **False Positives:** 23
- **False Negatives:** 13
- **Precision:** 4.2%
- **Recall:** 7.1%
- **F1 Score:** 5.3%

**Analysis:** Very low precision due to many non-dialogue quotes being detected. The text contains many quoted terms that aren't dialogue.

#### 2. The Gift of the Magi
- **Precision:** ~9%
- **Recall:** ~14%
- **F1 Score:** ~11%

**Analysis:** Similar issues with non-dialogue quotations.

#### 3-5. Other Documents
- All documents show similar low precision/recall patterns
- Consistent issue: regex detects any quoted text, not just dialogue

### Aggregate Dataset Results

**Overall Metrics (All 5 Documents):**
- **True Positives:** 16
- **False Positives:** 148
- **False Negatives:** 90
- **Precision:** 9.8%
- **Recall:** 15.1%
- **F1 Score:** 11.9%

**Interpretation:**
- Only 16 out of 106 dialogue passages correctly detected (15.1% recall)
- High false positive rate: 148 incorrect detections
- Overall F1 score of 11.9% indicates poor performance

### Speaker Attribution Accuracy

**Test Result:**
- **Overall Accuracy:** 100% (1/1 correct)
- **Note:** Only tested with synthetic data due to limited speaker attribution in current implementation

### Confidence Threshold Optimization

**Optimal Threshold:** 0.6
- **F1 Score:** 0.750
- **Precision:** 0.750
- **Recall:** 0.750

**Note:** This optimization was performed on synthetic test data, not the actual dataset.

## Issues Identified

### 1. Ax Framework Integration
```
AxSignatureValidationError: Invalid Signature: Field name "text" is too generic
```
**Status:** Blocking AI-powered detection
**Impact:** System falls back to regex-only detection
**Fix Required:** Rename fields to more descriptive names (e.g., `documentContent`, `passageText`)

### 2. Regex False Positives
**Issue:** Pattern `"([^"]+)"` matches ALL quoted text, including:
- Book titles
- Emphasized words
- Non-dialogue quotations
- Technical terms

**Impact:** 148 false positives vs. only 16 true positives

### 3. Position Tracking
**Issue:** Current XML parser has simplified position tracking
**Impact:** May not accurately map dialogue positions in complex nested structures
**Status:** Needs refinement for production use

## Recommendations

### Immediate Actions (High Priority)

1. **Fix Ax Signature Validation**
   - Rename `text` parameter to `documentContent` or `passageText`
   - Update all field names to be more descriptive
   - Test AI-powered detection after fix

2. **Improve Regex Patterns**
   - Add context requirements (must be near speech verbs)
   - Exclude known non-dialogue patterns (book titles, etc.)
   - Implement dialogue punctuation patterns (dashes, etc.)

3. **Add Character Position Tracking**
   - Implement proper XML-to-plain-text position mapping
   - Track character offsets through XML parsing
   - Validate position accuracy

### Medium-Term Improvements

1. **Implement Pattern Engine (WASM)**
   - Complete Rust pattern matching implementation
   - Integrate WASM module for detection
   - Train on annotated dataset

2. **Add Confidence Calibration**
   - Calibrate confidence scores on validation set
   - Implement dynamic confidence thresholds
   - Add per-document threshold optimization

3. **Speaker Attribution**
   - Implement proper speaker attribution logic
   - Test speaker accuracy on annotated data
   - Add character relationship tracking

### Long-Term Goals

1. **Achieve >70% Accuracy**
   - Target metrics from implementation plan
   - F1 score >0.7 on test set
   - Precision and recall both >0.6

2. **Implement Machine Learning**
   - Train dialogue detection model
   - Add speaker attribution model
   - Continuous learning from corrections

3. **Optimize Performance**
   - Batch processing for large documents
   - Cached pattern matching
   - Parallel detection where possible

## Test Infrastructure

### Files Created
1. **`lib/evaluation/AccuracyMetrics.ts`**
   - Precision, recall, F1 calculation
   - Speaker attribution metrics
   - Confidence threshold optimization
   - Formatting utilities

2. **`tests/utils/xml-parser.ts`**
   - TEI document parsing
   - Dialogue annotation extraction
   - Position tracking
   - IoU calculation for span matching

3. **`tests/integration/pattern-engine-accuracy.test.ts`**
   - Integration test suite
   - Tests all 5 documents
   - Aggregate metrics
   - Confidence optimization

### Test Execution
```bash
npm test tests/integration/pattern-engine-accuracy.test.ts
```

**Status:** All 9 tests passing ✅

## Next Steps

1. ✅ Complete Task 17 (Test Pattern Engine Accuracy) - **DONE**
2. Fix Ax framework signature validation issues
3. Improve regex patterns to reduce false positives
4. Re-run tests after improvements
5. Document improved results
6. Optimize confidence thresholds
7. Implement pattern engine in Rust
8. Train and evaluate ML models

## Conclusion

The current implementation provides a functional baseline but requires significant improvements to meet the target accuracy of >70% F1 score. The test infrastructure is in place and working correctly, providing reliable metrics for future iterations.

**Key Metric:**
- **Current F1 Score:** 11.9%
- **Target F1 Score:** >70%
- **Gap:** 58.1 percentage points

The regex-based fallback is insufficient for production use. Priority should be given to:
1. Fixing Ax framework integration
2. Implementing proper pattern matching
3. Adding machine learning-based detection

---

**Generated:** 2026-01-26
**Test Command:** `npm test tests/integration/pattern-engine-accuracy.test.ts`
**Test Framework:** Jest
**Total Test Time:** 0.394s
