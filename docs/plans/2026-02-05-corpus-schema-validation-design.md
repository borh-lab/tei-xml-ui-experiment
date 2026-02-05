# TEI Corpus Schema Validation Design

**Goal:** Add RelaxNG schema validation to TEI corpus analysis with progressive fallback and comprehensive error reporting.

**Date:** 2025-02-05
**Status:** Implementation Complete, Deployed

**Completed:** 2026-02-05

---

## Overview

Currently, TEI corpus files are only validated for basic XML well-formedness. This design adds proper RelaxNG schema validation with progressive fallback (tei-all → tei-novel → tei-minimal) and reports compliance results in corpus metadata without excluding valid XML files that fail schema validation.

---

## Validation Strategy

### For P5 Corpora

**Corpora:** Wright American Fiction, Victorian Women Writers, Brevier Legislative, TEI Texts, Novel Dialogism

**Progressive Fallback:**

1. **First attempt:** `tei-all.rng` (full TEI P5 schema - 612KB)
   - Most comprehensive validation
   - Catches all schema violations
   - May be slow for large corpora

2. **Fallback 1:** `tei-novel.rng` (3KB)
   - Optimized for prose fiction
   - Faster validation
   - Less strict than tei-all

3. **Fallback 2:** `tei-minimal.rng` (2.5KB)
   - Core dialogue elements only
   - Very fast
   - Minimal requirements

4. **Final result:** Record which schema passed (or all failures)

### For P4 Corpora

**Corpora:** Indiana Magazine of History, Indiana Authors Books

- Still try P5 schemas (P4 often validates against P5)
- Same progressive fallback
- Report if P4-specific issues exist

---

## Metadata Structure

### Updated CorpusMetadata Interface

```typescript
export interface CorpusMetadata {
  name: string;
  sourceUrl: string;
  documentCount: number;
  totalSizeBytes: number;
  teiVersion: string[];
  tagFrequency: Record<string, number>;
  structuralPatterns: {
    usesSaid: boolean;
    usesQ: boolean;
    usesSp: boolean;
    usesWhoAttributes: boolean;
    nestingLevels: number;
  };
  encodingType: 'dialogue-focused' | 'dramatic-text' | 'minimal-markup' | 'mixed';
  sampleDocuments: string[];

  // NEW: Schema validation results
  validationResults: {
    totalDocuments: number;
    validAgainstSchema: number;
    schemaCompliance: number; // percentage

    // Per-schema pass rates
    teiAllPass: number;
    teiNovelPass: number;
    teiMinimalPass: number;

    // Files that failed all schemas
    filesWithValidationErrors: number;

    // Sample errors (up to 10)
    sampleErrors: SchemaValidationError[];
  };

  issues: string[];
}

export interface SchemaValidationError {
  file: string;
  attemptedSchemas: string[];
  allErrors: SchemaError[];
}

export interface SchemaError {
  schema: string;
  line?: number;
  column?: number;
  message: string;
}
```

### Example Result

```json
{
  "validationResults": {
    "totalDocuments": 2876,
    "validAgainstSchema": 2850,
    "schemaCompliance": 99.1,
    "teiAllPass": 2800,
    "teiNovelPass": 50,
    "teiMinimalPass": 26,
    "filesWithValidationErrors": 26,
    "sampleErrors": [
      {
        "file": "corpora/wright/VAC1234.xml",
        "attemptedSchemas": ["tei-all"],
        "allErrors": [
          {
            "schema": "tei-all",
            "line": 45,
            "message": "Element <p> not allowed here"
          }
        ]
      }
    ]
  }
}
```

---

## Implementation Approach

### Integration Point

Modify `scripts/analyze-corpora.ts`

### Changes Required

1. **Import SchemaLoader:**
```typescript
import { validateTEIFile, getTEIVersion, analyzeTags, determineEncodingType } from './corpus-utils';
import { SchemaLoader, type ParsedSchema } from '../lib/schema/SchemaLoader';
```

2. **Initialize in main():**
```typescript
const schemaLoader = new SchemaLoader();
const TEI_ALL = 'public/schemas/tei-all.rng';
const TEI_NOVEL = 'public/schemas/tei-novel.rng';
const TEI_MINIMAL = 'public/schemas/tei-minimal.rng';
```

3. **New helper function:**
```typescript
interface ValidationResult {
  teiAllPass: boolean;
  teiNovelPass: boolean;
  teiMinimalPass: boolean;
  errors: SchemaError[];
}

async function validateWithSchemas(
  content: string,
  filePath: string,
  teiVersion: string
): Promise<ValidationResult> {
  const result: ValidationResult = {
    teiAllPass: false,
    teiNovelPass: false,
    teiMinimalPass: false,
    errors: []
  };

  // Try tei-all.rng
  try {
    const teiAllResult = await schemaLoader.validate(content, TEI_ALL);
    if (teiAllResult.valid) {
      result.teiAllPass = true;
      return result; // Success! Stop here
    }
    result.errors.push(...teiAllResult.errors.map(e => ({
      schema: 'tei-all',
      line: e.line,
      column: e.column,
      message: e.message
    })));
  } catch (error) {
    // Schema error or timeout - log and continue
    console.warn(`  tei-all validation failed for ${filePath}: ${error}`);
  }

  // Try tei-novel.rng
  try {
    const teiNovelResult = await schemaLoader.validate(content, TEI_NOVEL);
    if (teiNovelResult.valid) {
      result.teiNovelPass = true;
      return result; // Success! Stop here
    }
    result.errors.push(...teiNovelResult.errors.map(e => ({
      schema: 'tei-novel',
      line: e.line,
      column: e.column,
      message: e.message
    })));
  } catch (error) {
    console.warn(`  tei-novel validation failed for ${filePath}: ${error}`);
  }

  // Try tei-minimal.rng
  try {
    const teiMinimalResult = await schemaLoader.validate(content, TEI_MINIMAL);
    if (teiMinimalResult.valid) {
      result.teiMinimalPass = true;
      return result; // Success or final result
    }
    result.errors.push(...teiMinimalResult.errors.map(e => ({
      schema: 'tei-minimal',
      line: e.line,
      column: e.column,
      message: e.message
    })));
  } catch (error) {
    console.warn(`  tei-minimal validation failed for ${filePath}: ${error}`);
  }

  return result;
}
```

4. **Update analyzeCorpus function:**
   - After basic TEI validation
   - For each valid TEI file, call `validateWithSchemas()`
   - Aggregate validation results
   - Collect sample errors (first 10 unique)
   - Add to metadata

5. **Progress tracking (optional):**
```typescript
console.log(`  Validating with schemas [${current}/${total}]...`);
```

---

## Data Flow

```
1. validateTEIFile() - BASIC CHECKS
   ├─ File size > 500 chars?
   ├─ Has <TEI> root?
   ├─ XML well-formed?
   └─ Returns: isTEI, isValid (basic)

2. IF isTEI && isValid (basic):
   └─ validateWithSchemas()
       ├─ Try tei-all.rng
       │  ├─ Success? → mark teiAllPass=true, stop
       │  └─ Collect errors
       ├─ Try tei-novel.rng (fallback 1)
       │  ├─ Success? → mark teiNovelPass=true, stop
       │  └─ Collect errors
       ├─ Try tei-minimal.rng (fallback 2)
       │  ├─ Success? → mark teiMinimalPass=true, stop
       │  └─ Collect errors
       └─ Return validation result

3. AGGREGATE results across corpus:
   ├─ Count files passing each schema
   ├─ Calculate compliance percentage
   ├─ Collect sample errors (first 10)
   └─ Store in CorpusMetadata.validationResults
```

---

## Error Handling

### Schema Validation Errors

1. **SchemaLoader failures** (non-blocking):
   - Missing schema file → Log warning, skip that schema
   - Parse error in schema → Log error, continue to next schema
   - Don't fail entire analysis

2. **File validation errors** (collect and report):
   - Parse error → Record in sampleErrors
   - Schema violation → Record in sampleErrors
   - All schemas failed → Flag in `filesWithValidationErrors`

### Error Collection Strategy

```typescript
const MAX_SAMPLE_ERRORS = 10;
const MAX_ERRORS_PER_FILE = 5;

// Only store first 10 unique errors across corpus
// Store max 5 errors per file to avoid bloating metadata
```

### Graceful Degradation

- If schema validation times out → Skip, log warning
- If file too large for validation → Skip schema check, note in issues
- If SchemaLoader crashes → Catch, continue basic analysis

### Performance Safeguards

```typescript
const VALIDATION_TIMEOUT = 5000; // 5 seconds per file max

// If timeout, skip that file's schema validation
// File still included in corpus, noted in issues
```

---

## Testing Strategy

### Unit Tests

**File:** `tests/unit/schema-validation.test.ts`

1. **Test validateWithSchemas function:**
   - Mock SchemaLoader responses
   - Test file that passes tei-all
   - Test file that fails tei-all but passes tei-novel
   - Test file that only passes tei-minimal
   - Test file that fails all schemas

2. **Test error aggregation:**
   - Verify sample errors limited to 10
   - Verify per-file error limit
   - Test compliance percentage calculation

### Integration Tests

**File:** `tests/integration/corpus-schema-validation.test.ts`

1. **Test full corpus analysis:**
   - Run on small corpus (tei-texts: 14 files)
   - Verify validationResults populated correctly
   - Check file counts match
   - Verify compliance percentage accurate

2. **Test progressive fallback:**
   - Create mock file with known schema violations
   - Verify it tries all three schemas
   - Verify stops at first passing schema

### Manual Testing

```bash
# Run analysis and check metadata
bun run corpus:analyze

# Check validation results
cat tests/corpora/metadata/wright-american-fiction.json | jq '.validationResults'

# Verify performance (should complete in < 5 min for full corpora)
```

### Edge Cases to Test

- Empty TEI files
- Malformed XML (basic check catches it)
- Files with DOCTYPE entities
- Very large files (>1MB)
- Files with custom TEI extensions
- P4 files validating against P5 schemas

---

## Performance Considerations

**Expected Performance:**

- SchemaLoader caches parsed schemas (one-time cost)
- tei-all.rng: ~100-500ms per file
- tei-novel.rng: ~50-200ms per file
- tei-minimal.rng: ~10-50ms per file

**For large corpora:**
- Wright American Fiction (2,876 files): ~5-15 minutes with full validation
- Indiana Magazine (7,289 files): ~12-30 minutes with full validation

**Optimization Opportunities:**
- Skip validation for files that passed in previous run (cache results)
- Parallel validation with worker threads
- Validate only sample of files for quick analysis

---

## Success Criteria

1. ✅ All P5/P4 corpora validated against RelaxNG schemas
2. ✅ Progressive fallback (tei-all → tei-novel → tei-minimal) working
3. ✅ Validation results reported in metadata
4. ✅ Sample errors collected (up to 10 per corpus)
5. ✅ Schema compliance percentage calculated
6. ✅ Files still included even if all schemas fail
7. ✅ Performance acceptable (< 30 min for full analysis)
8. ✅ Tests pass (unit + integration)

---

## Implementation Files

**Modified:**
- `scripts/types.ts` - Add validation result interfaces
- `scripts/corpus-utils.ts` - Add validateWithSchemas function
- `scripts/analyze-corpora.ts` - Integrate schema validation

**New:**
- `tests/unit/schema-validation.test.ts` - Unit tests
- `tests/integration/corpus-schema-validation.test.ts` - Integration tests

**Schema Files (existing):**
- `public/schemas/tei-all.rng`
- `public/schemas/tei-novel.rng`
- `public/schemas/tei-minimal.rng`

---

## Open Questions

1. Should we cache validation results to speed up re-analysis?
2. Should we add a `--skip-schema-validation` flag for quick analysis?
3. Should we validate excluded files or just valid ones?
