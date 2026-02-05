# Corpus Analytics Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add dialogue analytics to TEI XML editor showing character quotation rankings and conversation patterns

**Architecture:** Pure functions for data extraction, React components for visualization, protocol-first design for extensibility

**Tech Stack:** TypeScript, React, Bun, Playwright, ReST

---

## Task 1: Define Protocol Types

**Files:**
- Create: `lib/analytics/types.ts`

**Step 1: Write the failing test**

```typescript
// lib/analytics/__tests__/types.test.ts
import { describe, it, expect } from 'bun:test';

describe('Quote type', () => {
  it('should create a valid Quote value', () => {
    const quote: Quote = {
      id: 'q1',
      speaker: 'Alice',
      addressee: 'Bob',
      text: 'Hello'
    };

    expect(quote.id).toBe('q1');
    expect(quote.speaker).toBe('Alice');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test lib/analytics/__tests__/types.test.ts`
Expected: FAIL with "Cannot find name 'Quote'"

**Step 3: Write minimal implementation**

```typescript
// lib/analytics/types.ts
export interface Quote {
  readonly id: string;
  readonly speaker: string;
  readonly addressee?: string;
  readonly text: string;
}

export interface CharacterRanking {
  readonly characterId: string;
  readonly characterName: string;
  readonly quoteCount: number;
  readonly percent: number;
}

export interface ConversationMatrix {
  readonly matrix: ReadonlyMap<
    string,
    ReadonlyMap<string, number>
  >;
  readonly totalInteractions: number;
}

export type DocumentAnalysisResult =
  | { readonly _tag: 'success'; readonly rankings: CharacterRanking[]; readonly matrix: ConversationMatrix }
  | { readonly _tag: 'error'; readonly error: string };

export type ComparisonResult =
  | { readonly _tag: 'available'; readonly percentiles: Map<string, number> }
  | { readonly _tag: 'unavailable'; readonly reason: string };
```

**Step 4: Run test to verify it passes**

Run: `bun test lib/analytics/__tests__/types.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/analytics/
git commit -m "feat: add analytics protocol types"
```

---

## Task 2: Implement Document Analysis Functions

**Files:**
- Create: `lib/analytics/document.ts`
- Test: `lib/analytics/__tests__/document.test.ts`

**Step 1: Write the failing test for extractQuotes**

```typescript
// lib/analytics/__tests__/document.test.ts
import { describe, it, expect } from 'bun:test';
import { extractQuotes } from '../document';

describe('extractQuotes', () => {
  it('should extract quotes from TEI document', () => {
    const mockDocument = {
      id: 'test-doc',
      state: {
        quotes: [
          { id: 'q1', speaker: 'Alice', addressee: 'Bob', text: 'Hi' }
        ]
      }
    };

    const quotes = extractQuotes(mockDocument as any);

    expect(quotes).toHaveLength(1);
    expect(quotes[0].id).toBe('q1');
    expect(quotes[0].speaker).toBe('Alice');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test lib/analytics/__tests__/document.test.ts`
Expected: FAIL with "Cannot find name 'extractQuotes'"

**Step 3: Write minimal implementation**

```typescript
// lib/analytics/document.ts
import type { Quote } from './types';

export function extractQuotes(document: { state: { quotes: any[] } }): Quote[] {
  return document.state.quotes.map((q: any) => ({
    id: q.id,
    speaker: q.speaker,
    addressee: q.addressee,
    text: q.text
  }));
}

export function calculateRankings(quotes: Quote[], totalQuotes: number): typeof import('./types').CharacterRanking[] {
  // Reuse CharacterRanking type
  type CharacterRanking = {
    readonly characterId: string;
    readonly characterName: string;
    readonly quoteCount: number;
    readonly percent: number;
  };

  const counts = new Map<string, number>();

  for (const quote of quotes) {
    counts.set(quote.speaker, (counts.get(quote.speaker) || 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([id, count]) => ({
      characterId: id,
      characterName: id,  // TODO: Look up actual name from character index
      quoteCount: count,
      percent: (count / totalQuotes) * 100
    }))
    .sort((a, b) => b.quoteCount - a.quoteCount);
}

export function buildConversationMatrix(quotes: Quote[]): typeof import('./types').ConversationMatrix {
  type ConversationMatrix = {
    readonly matrix: ReadonlyMap<string, ReadonlyMap<string, number>>;
    readonly totalInteractions: number;
  };

  const matrix = new Map<string, Map<string, number>>();

  for (const quote of quotes) {
    if (!quote.addressee) continue;

    let speakerRow = matrix.get(quote.speaker);
    if (!speakerRow) {
      speakerRow = new Map();
      matrix.set(quote.speaker, speakerRow);
    }

    speakerRow.set(quote.addressee, (speakerRow.get(quote.addressee) || 0) + 1);
  }

  const total = Array.from(matrix.values())
    .reduce((sum, row) => sum + Array.from(row.values()).reduce((s, c) => s + c, 0), 0);

  return {
    matrix: matrix as ReadonlyMap<string, ReadonlyMap<string, number>>,
    totalInteractions: total
  };
}

export function analyzeDocument(document: any): typeof import('./types').DocumentAnalysisResult {
  try {
    if (!document?.state?.quotes || document.state.quotes.length === 0) {
      return {
        _tag: 'error',
        error: 'Document contains no dialogue (no <quote> elements found)'
      };
    }

    const quotes = extractQuotes(document);
    const rankings = calculateRankings(quotes, quotes.length);
    const matrix = buildConversationMatrix(quotes);

    return { _tag: 'success', rankings, matrix };
  } catch (e) {
    return {
      _tag: 'error',
      error: `Failed to analyze document: ${e instanceof Error ? e.message : String(e)}`
    };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `bun test lib/analytics/__tests__/document.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/analytics/document.ts lib/analytics/__tests__/document.test.ts
git commit -m "feat: implement document analysis functions"
```

---

## Task 3: Implement Metadata Generation Script

**Files:**
- Create: `scripts/generate-corpus-metadata.ts`
- Output: `public/metadata/novel-dialogism-analytics.json`

**Step 1: Write the script**

```typescript
#!/usr/bin/env bun
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { parseTEIDocument } from '../lib/tei/parse';

const CORPUS_DIR = 'corpora/novel-dialogism/';
const OUTPUT_DIR = 'public/metadata';
const OUTPUT_FILE = join(OUTPUT_DIR, 'novel-dialogism-analytics.json');

interface NovelMetadata {
  readonly novelId: string;
  readonly totalQuotes: number;
  readonly characters: readonly {
    readonly characterId: string;
    readonly quoteCount: number;
  }[];
}

interface CorpusMetadataFile {
  readonly format: 'corpus-metadata-v1';
  readonly generatedAt: string;
  readonly novels: readonly NovelMetadata[];
}

function generateMetadata() {
  const files = readdirSync(CORPUS_DIR)
    .filter(f => f.endsWith('.tei.xml'));

  const novels: NovelMetadata[] = [];

  console.log(`Parsing ${files.length} TEI files...`);

  for (const file of files) {
    const content = readFileSync(join(CORPUS_DIR, file), 'utf-8');

    // Reuse existing XML parser
    const document = parseTEIDocument(content);

    // Build immutable character counts
    const counts: Record<string, number> = {};
    for (const quote of document.state.quotes) {
      counts[quote.speaker] = (counts[quote.speaker] || 0) + 1;
    }

    const characters = Object.entries(counts)
      .map(([characterId, quoteCount]) => ({ characterId, quoteCount }))
      .sort((a, b) => b.quoteCount - a.quoteCount);

    novels.push({
      novelId: file.replace('.tei.xml', ''),
      totalQuotes: document.state.quotes.length,
      characters
    });
  }

  return {
    format: 'corpus-metadata-v1',
    generatedAt: new Date().toISOString(),
    novels
  };
}

// Generate
console.log('Generating corpus metadata...');
const metadata = generateMetadata();

// Ensure output directory exists
mkdirSync(OUTPUT_DIR, { recursive: true });

writeFileSync(OUTPUT_FILE, JSON.stringify(metadata, null, 2));
console.log(`✓ Generated metadata for ${metadata.novels.length} novels`);
console.log(`✓ Output: ${OUTPUT_FILE}`);
```

**Step 2: Run script to generate metadata**

Run: `bun run scripts/generate-corpus-metadata.ts`
Expected: Output showing 28 novels processed

**Step 3: Verify output file exists**

Run: `cat public/metadata/novel-dialogism-analytics.json | head -20`
Expected: JSON with `format: "corpus-metadata-v1"`

**Step 4: Commit**

```bash
git add scripts/generate-corpus-metadata.ts public/metadata/novel-dialogism-analytics.json
git commit -m "feat: add corpus metadata generation script"
```

---

## Task 4: Implement CharacterRankings Component

**Files:**
- Create: `components/analytics/CharacterRankings.tsx`
- Test: `components/analytics/__tests__/CharacterRankings.test.tsx`

**Step 1: Write failing test**

```typescript
// components/analytics/__tests__/CharacterRankings.test.tsx
import { describe, it, expect } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { CharacterRankings } from '../CharacterRankings';

describe('CharacterRankings', () => {
  it('should display rankings', () => {
    const rankings = [
      { characterId: 'Alice', characterName: 'Alice', quoteCount: 10, percent: 50 },
      { characterId: 'Bob', characterName: 'Bob', quoteCount: 5, percent: 25 }
    ];

    render(<CharacterRankings rankings={rankings} />);

    expect(screen.getByText('Alice')).toBeDefined();
    expect(screen.getByText('10 (50.0%)')).toBeDefined();
  });

  it('should show empty state', () => {
    render(<CharacterRankings rankings={[]} />);

    expect(screen.getByText('No dialogue found')).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test components/analytics/__tests__/CharacterRankings.test.tsx`
Expected: FAIL with "Cannot find module"

**Step 3: Write component**

```typescript
// components/analytics/CharacterRankings.tsx
'use client';

import React from 'react';
import type { CharacterRanking as RankingType } from '@/lib/analytics/types';

export function CharacterRankings({ rankings }: { rankings: RankingType[] }) {
  if (!rankings || rankings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted">
        <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 16h.01M21 12c0 4.418-4.03 8-9 8-9s8-3.582 8-9-8-4.418 0-9-4.03-9-9z" />
        </svg>
        <p className="text-sm">No dialogue found in this document</p>
        <p className="text-xs mt-1">
          The document doesn't contain any &lt;quote&gt; elements with speaker information.
        </p>
      </div>
    );
  }

  const maxCount = rankings[0].quoteCount;

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">Top Speakers</h3>
      <div className="space-y-1">
        {rankings.slice(0, 10).map((ranking) => (
          <div key={ranking.characterId} className="flex items-center gap-2">
            <span className="w-32 text-sm truncate" title={ranking.characterName}>
              {ranking.characterName}
            </span>
            <div className="flex-1 bg-muted rounded h-6">
              <div
                className="h-6 rounded bg-blue-500"
                style={{ width: `${(ranking.quoteCount / maxCount) * 100}%` }}
              />
            </div>
            <span className="text-sm w-20 text-right">
              {ranking.quoteCount} <span className="text-muted">({ranking.percent.toFixed(1)}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `bun test components/analytics/__tests__/CharacterRankings.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add components/analytics/
git commit -m "feat: add CharacterRankings component"
```

---

## Task 5: Implement ConversationMatrix Component

**Files:**
- Create: `components/analytics/ConversationMatrix.tsx`
- Test: `components/analytics/__tests__/ConversationMatrix.test.tsx`

**Step 1: Write failing test**

```typescript
// components/analytics/__tests__/ConversationMatrix.test.tsx
import { describe, it, expect } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { ConversationMatrix } from '../ConversationMatrix';
import type { ConversationMatrix as MatrixType } from '@/lib/analytics/types';

describe('ConversationMatrix', () => {
  it('should display heatmap', () => {
    const matrix: MatrixType = {
      matrix: new Map([
        ['Alice', new Map([['Bob', 5]])]
      ]),
      totalInteractions: 5
    };

    render(<ConversationMatrix matrix={matrix} />);

    expect(screen.getByText('Who Talks to Whom')).toBeDefined();
    expect(screen.getByText(/5 total interactions/)).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test components/analytics/__tests__/ConversationMatrix.test.tsx`
Expected: FAIL with "Cannot find module"

**Step 3: Write component**

```typescript
// components/analytics/ConversationMatrix.tsx
'use client';

import React from 'react';
import type { ConversationMatrix as MatrixType } from '@/lib/analytics/types';

export function ConversationMatrix({
  matrix,
  onCellClick
}: {
  matrix: MatrixType;
  onCellClick?: (speaker: string, addressee: string) => void;
}) {
  const characters = Array.from(matrix.matrix.keys());
  const maxValue = Math.max(
    ...Array.from(matrix.matrix.values()).flatMap(row => Array.from(row.values()))
  );

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">Who Talks to Whom</h3>
      <div className="grid gap-1" style={{
        gridTemplateColumns: `auto repeat(${characters.length}, 1fr)`
      }}>
        {/* Header row */}
        <div></div>
        {characters.map(char => (
          <div key={char} className="text-xs text-center p-1" title={char}>
            {char.split('-').pop()}
          </div>
        ))}

        {/* Data rows */}
        {characters.map(speaker => (
          <React.Fragment key={speaker}>
            <div className="text-xs text-right p-1" title={speaker}>
              {speaker.split('-').pop()}
            </div>
            {characters.map(addressee => {
              const count = matrix.matrix.get(speaker)?.get(addressee) || 0;
              const intensity = count > 0 ? count / maxValue : 0;

              return (
                <div
                  key={addressee}
                  className="aspect-square border cursor-pointer hover:ring-2 ring-blue-500"
                  style={{
                    backgroundColor: `rgba(59, 130, 246, ${intensity})`
                  }}
                  onClick={() => onCellClick?.(speaker, addressee)}
                  title={`${speaker} → ${addressee}: ${count} quotes`}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {matrix.totalInteractions} total interactions
      </p>
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `bun test components/analytics/__tests__/ConversationMatrix.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add components/analytics/ConversationMatrix.tsx components/analytics/__tests__/ConversationMatrix.test.tsx
git commit -m "feat: add ConversationMatrix heatmap component"
```

---

## Task 6: Implement DocumentAnalytics Container

**Files:**
- Create: `components/analytics/DocumentAnalytics.tsx`
- Modify: `components/visualization/VisualizationPanel.tsx` (add tab)

**Step 1: Write failing test**

```typescript
// components/analytics/__tests__/DocumentAnalytics.test.tsx
import { describe, it, expect } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { DocumentAnalytics } from '../DocumentAnalytics';

describe('DocumentAnalytics', () => {
  it('should show error when no document loaded', () => {
    render(<DocumentAnalytics />);

    expect(screen.getByText(/no document loaded/i)).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test components/analytics/__tests__/DocumentAnalytics.test.tsx`
Expected: FAIL with "Cannot find module"

**Step 3: Write container component**

```typescript
// components/analytics/DocumentAnalytics.tsx
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useDocumentService } from '@/lib/effect/react/hooks';
import { analyzeDocument } from '@/lib/analytics/document';
import { CharacterRankings } from './CharacterRankings';
import { ConversationMatrix } from './ConversationMatrix';

export function DocumentAnalytics() {
  const [state, setState] = useState<{
    status: 'idle' | 'analyzing' | 'analyzed' | 'error';
    rankings?: typeof import('@/lib/analytics/types').CharacterRanking[];
    matrix?: typeof import('@/lib/analytics/types').ConversationMatrix;
    error?: string;
  }>({ status: 'idle' });

  const { document } = useDocumentService();

  const analyze = useCallback(() => {
    if (!document) {
      setState({ status: 'error', error: 'No document loaded' });
      return;
    }

    setState({ status: 'analyzing' });
    const result = analyzeDocument(document);

    setState(
      result._tag === 'success'
        ? { status: 'analyzed', rankings: result.rankings, matrix: result.matrix }
        : { status: 'error', error: result.error }
    );
  }, [document]);

  // Auto-analyze when document changes
  useEffect(() => {
    if (document) analyze();
  }, [document, analyze]);

  if (!document) {
    return (
      <div className="p-6 text-muted">No document loaded</div>
    );
  }

  if (state.status === 'analyzing') {
    return (
      <div className="p-6">Analyzing dialogue...</div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="p-6 border-l-4 border-destructive bg-destructive/10">
        <h3 className="font-semibold text-destructive">Analysis Error</h3>
        <p className="text-sm mt-1">{state.error}</p>
        <button
          onClick={analyze}
          className="mt-2 text-sm underline text-blue-600 hover:text-blue-800"
        >
          Retry
        </button>
      </div>
    );
  }

  if (state.status === 'analyzed' && state.rankings && state.matrix) {
    return (
      <div className="space-y-6 p-6">
        <CharacterRankings rankings={state.rankings} />
        <ConversationMatrix matrix={state.matrix} />
      </div>
    );
  }

  return null;
}
```

**Step 4: Add tab to VisualizationPanel**

Modify `components/visualization/VisualizationPanel.tsx`:

```typescript
// Add import
import { DocumentAnalytics } from '@/components/analytics/DocumentAnalytics';

// In TabsList, change grid-cols-2 to grid-cols-3
<TabsList className="grid w-full grid-cols-3">
  <TabsTrigger value="analytics">Corpus Analytics</TabsTrigger>
  // ... existing tabs
</TabsList>

// Add TabsContent after "statistics" tab
<TabsContent value="analytics" className="flex-1 mt-4 px-6 pb-6 overflow-auto">
  <DocumentAnalytics />
</TabsContent>
```

**Step 5: Run test to verify it passes**

Run: `bun test components/analytics/__tests__/DocumentAnalytics.test.tsx`
Expected: PASS

**Step 6: Commit**

```bash
git add components/analytics/DocumentAnalytics.tsx components/analytics/__tests__/DocumentAnalytics.test.tsx components/visualization/VisualizationPanel.tsx
git commit -m "feat: add DocumentAnalytics container with tab integration"
```

---

## Task 7: Add E2E Tests

**Files:**
- Create: `tests/e2e/corpus-analytics.spec.ts`

**Step 1: Write test**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Corpus Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display analytics for document with dialogue', async ({ page }) => {
    // Upload a TEI document with dialogue
    await page.setInputFiles('input[type="file"]', ['tests/fixtures/sample-document-with-quotes.tei.xml']);
    await page.click('button:text="Upload"');
    await page.waitForLoadState('networkidle');

    // Navigate to Corpus Analytics tab
    await page.click('[data-tab="analytics"]');

    // Should show rankings
    await expect(page.locator('text=Top Speakers')).toBeVisible();
    await expect(page.locator('text=Who Talks to Whom')).toBeVisible();
  });

  test('should show empty state for document without dialogue', async ({ page }) => {
    // Upload document without quotes
    await page.setInputFiles('input[type="file"]', ['tests/fixtures/document-without-quotes.tei.xml']);
    await page.click('button:text="Upload"']);
    await page.waitForLoadState('networkidle');

    await page.click('[data-tab="analytics"]');

    await expect(page.locator('text=/no dialogue/i')).toBeVisible();
  });
});
```

**Step 2: Run E2E test**

Run: `bun run test:e2e tests/e2e/corpus-analytics.spec.ts`
Expected: FAIL (fixtures don't exist yet)

**Step 3: Create test fixtures**

```bash
# Create minimal test documents
mkdir -p tests/fixtures

# Document with quotes
cat > tests/fixtures/sample-document-with-quotes.tei.xml << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text>
    <body>
      <quote xml:id="q1" who="#alice">Hello</quote>
      <quote xml:id="q2" who="#bob" addr="#alice">Hi Alice</quote>
    </body>
  </text>
</TEI>
EOF

# Document without quotes
cat > tests/fixtures/document-without-quotes.tei.xml << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <text>
    <body>
      <p>Narrative text without dialogue.</p>
    </body>
  </text>
</TEI>
EOF
```

**Step 4: Run E2E test again**

Run: `bun run test:e2e tests/e2e/corpus-analytics.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/e2e/corpus-analytics.spec.ts tests/fixtures/
git commit -m "test: add E2E tests for corpus analytics"
```

---

## Task 8: Update Documentation

**Files:**
- Modify: `docs/corpus-browsing.md` (add section about analytics)

**Step 1: Add documentation section**

Add to `docs/corpus-browsing.md` after the existing content:

```markdown
## Corpus Analytics

The Corpus Analytics feature provides dialogue statistics for TEI documents:

### Character Rankings

Visualize top speakers by quote count with horizontal bar charts showing:
- Character name
- Quote count and percentage of total dialogue
- Visual bar indicating relative frequency

### Conversation Matrix

Heatmap showing which characters speak to whom most frequently:
- Rows: speakers
- Columns: addressees
- Cell color intensity: number of quotes
- Click on cells to highlight character pairs

### Data Sources

- **Document Mode**: Extracts statistics from currently loaded TEI document
- Pure functional analysis with no side effects
- Automatic re-analysis when document changes

### Implementation

See `lib/analytics/` for analysis functions and `components/analytics/` for React components.
```

**Step 2: Commit**

```bash
git add docs/corpus-browsing.md
git commit -m "docs: add corpus analytics documentation"
```

---

## Task 9: Run Full Test Suite

**Step 1: Run unit tests**

Run: `bun test`
Expected: All tests pass

**Step 2: Run E2E tests**

Run: `bun run test:e2e`
Expected: All tests pass

**Step 3: Fix any failing tests**

If tests fail, debug and fix issues.

**Step 4: Final commit**

```bash
git add .
git commit -m "test: all corpus analytics tests passing"
```

---

## Task 10: Manual Verification

**Step 1: Start dev server**

Run: `bun run dev`

**Step 2: Navigate to app**

Open: `http://localhost:3000`

**Step 3: Test in browser**

1. Upload a TEI document with dialogue (e.g., `corpora/novel-dialogism/WinnieThePooh.tei.xml`)
2. Click "Corpus Analytics" tab
3. Verify:
   - Character rankings display
   - Conversation matrix heatmap displays
   - Percentages calculate correctly

**Step 4: Check console for errors**

Open browser DevTools console, ensure no errors.

**Step 5: Commit**

```bash
git commit --allow-empty -m "test: manual verification complete"
```

---

## Summary

This plan implements Corpus Analytics in 10 tasks:

1. ✅ Protocol types
2. ✅ Document analysis functions
3. ✅ Metadata generation
4. ✅ CharacterRankings component
5. ✅ ConversationMatrix component
6. ✅ DocumentAnalytics container
7. ✅ E2E tests
8. ✅ Documentation
9. ✅ Full test suite
10. ✅ Manual verification

**Architecture highlights:**
- Pure functions for data extraction (no Effect runtime)
- React hooks for state management
- Protocol-first design with versioning
- Lazy metadata loading (no build coupling)
- TDD approach with failing tests first
- Frequent commits per task

**Total estimated time:** ~2-3 hours
