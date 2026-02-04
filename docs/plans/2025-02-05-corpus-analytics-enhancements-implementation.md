# Corpus Analytics Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Add character name lookup and temporal/sectional breakdown visualizations to the corpus analytics feature

**Architecture:** Pure functions with explicit protocol boundaries, strategy pattern for section grouping, composable design following Hickey principles

**Tech Stack:** TypeScript, React, Bun test runner, existing analytics infrastructure

---

## Task 1: Add lookupCharacterName Function

**Files:**
- Modify: `lib/analytics/document.ts`
- Test: `lib/analytics/__tests__/document.test.ts`

**Step 1: Write the failing test**

Add to `lib/analytics/__tests__/document.test.ts`:

```typescript
describe('lookupCharacterName', () => {
  const mockCharacters = [
    { id: 'char-1', xmlId: 'alice', name: 'Alice Smith' },
    { id: 'char-2', xmlId: 'bob', name: 'Bob Jones' }
  ] as any;

  it('should return character name when found', () => {
    const name = lookupCharacterName('char-1', mockCharacters);
    expect(name).toBe('Alice Smith');
  });

  it('should fallback to ID when character not found', () => {
    const name = lookupCharacterName('char-999', mockCharacters);
    expect(name).toBe('char-999');
  });

  it('should return "Unknown" for null speaker', () => {
    const name = lookupCharacterName(null, mockCharacters);
    expect(name).toBe('Unknown');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test lib/analytics/__tests__/document.test.ts`
Expected: FAIL with "lookupCharacterName is not defined"

**Step 3: Write minimal implementation**

Add to `lib/analytics/document.ts`:

```typescript
import type { Character } from '../tei/types';

/**
 * Look up character name from character index.
 * Pure function - no side effects.
 * @param characterId - Character ID to look up (null = unknown speaker)
 * @param characters - Array of characters from document state
 * @returns Character name if found, ID as fallback, or "Unknown" for null
 */
export function lookupCharacterName(
  characterId: string | null,
  characters: readonly Character[]
): string {
  if (characterId === null) return "Unknown";

  const character = characters.find(c => c.id === characterId);
  return character?.name ?? characterId;
}
```

**Step 4: Run test to verify it passes**

Run: `bun test lib/analytics/__tests__/document.test.ts`
Expected: 3 new tests PASS

**Step 5: Commit**

```bash
git add lib/analytics/document.ts lib/analytics/__tests__/document.test.ts
git commit -m "feat(analytics): add character name lookup function

- Add lookupCharacterName to resolve character IDs to names
- Returns 'Unknown' for null speakers
- Falls back to character ID if not found in index
- Pure function with no side effects
- Comprehensive test coverage

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: glm-4.7"
```

---

## Task 2: Update calculateRankings Signature

**Files:**
- Modify: `lib/analytics/document.ts`
- Modify: `lib/analytics/__tests__/document.test.ts`

**Step 1: Write the failing test**

Update existing test in `lib/analytics/__tests__/document.test.ts`:

```typescript
describe('calculateRankings', () => {
  it('should use character names from lookup function', () => {
    const quotes = [
      { id: 'q1', speaker: 'char-1', text: 'Hello' },
      { id: 'q2', speaker: 'char-2', text: 'Hi' },
      { id: 'q3', speaker: 'char-1', text: 'Goodbye' }
    ] as any;

    const mockLookup = (id: string | null) =>
      id === 'char-1' ? 'Alice' :
      id === 'char-2' ? 'Bob' :
      'Unknown';

    const rankings = calculateRankings(quotes, 3, mockLookup);

    expect(rankings[0].characterName).toBe('Alice');
    expect(rankings[0].quoteCount).toBe(2);
    expect(rankings[1].characterName).toBe('Bob');
    expect(rankings[1].quoteCount).toBe(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test lib/analytics/__tests__/document.test.ts`
Expected: FAIL with "calculateRankings expects 2 arguments but got 3"

**Step 3: Write minimal implementation**

Update `calculateRankings` in `lib/analytics/document.ts`:

```typescript
/**
 * Calculate character rankings from quotes.
 * Returns array sorted by quote count descending.
 * Pure function - no side effects.
 * @param quotes - Array of quote objects
 * @param totalQuotes - Total number of quotes (for percentage calculation)
 * @param characterLookup - Function to resolve character IDs to names
 */
export function calculateRankings(
  quotes: readonly Quote[],
  totalQuotes: number,
  characterLookup: (id: string | null) => string
): CharacterRanking[] {
  const counts = new Map<string, number>();

  for (const quote of quotes) {
    counts.set(quote.speaker, (counts.get(quote.speaker) || 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([characterId, quoteCount]) => ({
      characterId,
      characterName: characterLookup(characterId),
      quoteCount,
      percent: totalQuotes > 0 ? (quoteCount / totalQuotes) * 100 : 0
    }))
    .sort((a, b) => b.quoteCount - a.quoteCount);
}
```

**Step 4: Update existing tests to work with new signature**

Update all existing `calculateRankings` tests to provide a lookup function:

```typescript
// Before:
const rankings = calculateRankings(quotes, 4);

// After:
const rankings = calculateRankings(quotes, 4, (id) => id);
```

**Step 5: Run test to verify it passes**

Run: `bun test lib/analytics/__tests__/document.test.ts`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add lib/analytics/document.ts lib/analytics/__tests__/document.test.ts
git commit -m "feat(analytics): update calculateRankings with character lookup

- Add characterLookup parameter for dependency injection
- More composable - works with any lookup strategy
- Explicit protocol boundary in function signature
- Update all tests to provide lookup function
- Character names now resolved instead of showing IDs

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: glm-4.7"
```

---

## Task 3: Add Sectional Breakdown Types

**Files:**
- Modify: `lib/analytics/types.ts`

**Step 1: Add types to protocol file**

Add to `lib/analytics/types.ts`:

```typescript
/**
 * Section grouping result
 */
export interface SectionGroup {
  readonly label: string;
  readonly startIndex: number;
  readonly endIndex: number;
  readonly dialogueItems: readonly Dialogue[];
}

/**
 * Section grouping strategy protocol
 */
export interface SectionGroupingStrategy {
  readonly name: string;
  readonly description?: string;
  readonly group: (
    dialogue: readonly Dialogue[],
    passages: readonly Passage[]
  ) => readonly SectionGroup[];
}

/**
 * Sectional breakdown statistics
 */
export interface SectionalBreakdown {
  readonly groups: readonly {
    readonly label: string;
    readonly quoteCount: number;
    readonly percent: number;
  }[];
  readonly totalQuotes: number;
}
```

Also need to import Dialogue and Passage types:

```typescript
import type { Dialogue, Passage } from '../tei/types';
```

**Step 2: Commit**

```bash
git add lib/analytics/types.ts
git commit -m "feat(analytics): add sectional breakdown protocol types

- Add SectionGroup, SectionGroupingStrategy, SectionalBreakdown
- Import Dialogue and Passage types from TEI module
- Protocol-first design for section grouping
- All types readonly for immutability

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: glm-4.7"
```

---

## Task 4: Implement Sectional Grouping Functions

**Files:**
- Create: `lib/analytics/sectional.ts`
- Test: `lib/analytics/__tests__/sectional.test.ts`

**Step 1: Write the failing test**

Create `lib/analytics/__tests__/sectional.test.ts`:

```typescript
import { describe, it, expect } from 'bun:test';
import { ByPassage, ByChapter, groupDialogueBySections, calculateSectionStats } from '../sectional';

describe('ByPassage strategy', () => {
  it('should group dialogue by passage', () => {
    const dialogue = [
      { id: 'd1', passageId: 'passage-1', content: 'Quote 1', speaker: null, range: { start: 0, end: 6 } },
      { id: 'd2', passageId: 'passage-2', content: 'Quote 2', speaker: null, range: { start: 0, end: 6 } }
    ] as const;

    const passages = [
      { id: 'passage-1', index: 0, content: 'Text 1', tags: [] },
      { id: 'passage-2', index: 1, content: 'Text 2', tags: [] }
    ] as const;

    const groups = ByPassage.group(dialogue, passages);

    expect(groups).toHaveLength(2);
    expect(groups[0].label).toBe('Passage 1');
    expect(groups[0].dialogueItems).toHaveLength(1);
    expect(groups[1].label).toBe('Passage 2');
  });
});

describe('ByChapter strategy', () => {
  it('should group passages into chapters', () => {
    const dialogue = Array.from({ length: 25 }, (_, i) => ({
      id: `d${i}`,
      passageId: `passage-${i}`,
      content: `Quote ${i}`,
      speaker: null,
      range: { start: 0, end: 6 }
    })) as const;

    const passages = Array.from({ length: 25 }, (_, i) => ({
      id: `passage-${i}`,
      index: i,
      content: `Text ${i}`,
      tags: []
    })) as const;

    const groups = ByChapter.group(dialogue, passages);

    expect(groups).toHaveLength(3);
    expect(groups[0].label).toBe('Chapter 1');
    expect(groups[0].dialogueItems).toHaveLength(10);
    expect(groups[2].dialogueItems).toHaveLength(5);
  });
});

describe('calculateSectionStats', () => {
  it('should calculate statistics for section groups', () => {
    const groups = [
      { label: 'Chapter 1', startIndex: 0, endIndex: 10, dialogueItems: Array(15) },
      { label: 'Chapter 2', startIndex: 10, endIndex: 20, dialogueItems: Array(10) }
    ] as const;

    const stats = calculateSectionStats(groups);

    expect(stats.totalQuotes).toBe(25);
    expect(stats.groups[0].percent).toBe(60);
    expect(stats.groups[1].percent).toBe(40);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test lib/analytics/__tests__/sectional.test.ts`
Expected: FAIL with "Cannot find module '../sectional'"

**Step 3: Write minimal implementation**

Create `lib/analytics/sectional.ts`:

```typescript
import type { Dialogue, Passage } from '../tei/types';
import type { SectionGroup, SectionGroupingStrategy, SectionalBreakdown } from './types';

const CHAPTER_SIZE = 10;

/**
 * Group dialogue by individual passages
 */
export const ByPassage: SectionGroupingStrategy = {
  name: 'By Passage',
  description: 'Each passage as a separate section',
  group: (dialogue: readonly Dialogue[], passages: readonly Passage[]): readonly SectionGroup[] => {
    return passages.map(passage => ({
      label: `Passage ${passage.index + 1}`,
      startIndex: passage.index,
      endIndex: passage.index,
      dialogueItems: dialogue.filter(d => d.passageId === passage.id)
    }));
  }
};

/**
 * Group passages into chapters
 */
export const ByChapter: SectionGroupingStrategy = {
  name: 'By Chapter',
  description: 'Group passages into chapters (10 passages each)',
  group: (dialogue: readonly Dialogue[], passages: readonly Passage[]): readonly SectionGroup[] => {
    const chapters = [];

    for (let i = 0; i < passages.length; i += CHAPTER_SIZE) {
      const chapterPassages = passages.slice(i, i + CHAPTER_SIZE);
      const passageIds = new Set(chapterPassages.map(p => p.id));

      chapters.push({
        label: `Chapter ${Math.floor(i / CHAPTER_SIZE) + 1}`,
        startIndex: i,
        endIndex: Math.min(i + CHAPTER_SIZE, passages.length),
        dialogueItems: dialogue.filter(d => passageIds.has(d.passageId))
      });
    }

    return chapters;
  }
};

/**
 * Group dialogue using specified strategy
 * Pure function - no side effects.
 */
export function groupDialogueBySections(
  dialogue: readonly Dialogue[],
  passages: readonly Passage[],
  strategy: SectionGroupingStrategy
): readonly SectionGroup[] {
  return strategy.group(dialogue, passages);
}

/**
 * Calculate statistics for section groups
 * Pure function - no side effects.
 */
export function calculateSectionStats(
  groups: readonly SectionGroup[]
): SectionalBreakdown {
  const totalQuotes = groups.reduce((sum, g) => sum + g.dialogueItems.length, 0);

  return {
    groups: groups.map(g => ({
      label: g.label,
      quoteCount: g.dialogueItems.length,
      percent: totalQuotes > 0 ? (g.dialogueItems.length / totalQuotes) * 100 : 0
    })),
    totalQuotes
  };
}
```

**Step 4: Run test to verify it passes**

Run: `bun test lib/analytics/__tests__/sectional.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add lib/analytics/sectional.ts lib/analytics/__tests__/sectional.test.ts
git commit -m "feat(analytics): implement sectional grouping functions

- Add ByPassage and ByChapter grouping strategies
- Add groupDialogueBySections to apply strategies
- Add calculateSectionStats for statistics
- All functions pure (no side effects)
- Comprehensive test coverage

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: glm-4.7"
```

---

## Task 5: Create SectionalBreakdown Component

**Files:**
- Create: `components/analytics/SectionalBreakdown.tsx`
- Test: `components/analytics/__tests__/SectionalBreakdown.test.tsx`

**Step 1: Write the failing test**

Create `components/analytics/__tests__/SectionalBreakdown.test.tsx`:

```typescript
import { describe, it, expect } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import { SectionalBreakdown } from '../SectionalBreakdown';
import { ByPassage, ByChapter } from '../../../lib/analytics/sectional';

describe('SectionalBreakdown', () => {
  it('should display section bars', () => {
    const breakdown = {
      groups: [
        { label: 'Chapter 1', quoteCount: 100, percent: 50 },
        { label: 'Chapter 2', quoteCount: 50, percent: 25 }
      ],
      totalQuotes: 150
    };

    render(
      <SectionalBreakdown
        breakdown={breakdown}
        currentStrategy={ByChapter}
        onStrategyChange={jest.fn()}
      />
    );

    expect(screen.getByText('Chapter 1')).toBeInTheDocument();
    expect(screen.getByText('100 (50.0%)')).toBeInTheDocument();
  });

  it('should display empty state when no quotes', () => {
    const breakdown = {
      groups: [],
      totalQuotes: 0
    };

    render(
      <SectionalBreakdown
        breakdown={breakdown}
        currentStrategy={ByPassage}
        onStrategyChange={jest.fn()}
      />
    );

    expect(screen.getByText('No dialogue found in this document')).toBeInTheDocument();
  });

  it('should call onStrategyChange when button clicked', () => {
    const onStrategyChange = jest.fn();
    const breakdown = {
      groups: [{ label: 'Passage 1', quoteCount: 10, percent: 100 }],
      totalQuotes: 10
    };

    render(
      <SectionalBreakdown
        breakdown={breakdown}
        currentStrategy={ByPassage}
        onStrategyChange={onStrategyChange}
      />
    );

    const chapterButton = screen.getByRole('button', { name: /chapter/i });
    fireEvent.click(chapterButton);

    expect(onStrategyChange).toHaveBeenCalledWith(ByChapter);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test components/analytics/__tests__/SectionalBreakdown.test.tsx`
Expected: FAIL with "Cannot find module '../SectionalBreakdown'"

**Step 3: Write minimal implementation**

Create `components/analytics/SectionalBreakdown.tsx`:

```typescript
import type { SectionalBreakdown as BreakdownType, SectionGroupingStrategy } from '../../lib/analytics/types';

interface SectionalBreakdownProps {
  breakdown: BreakdownType;
  currentStrategy: SectionGroupingStrategy;
  onStrategyChange: (strategy: SectionGroupingStrategy) => void;
}

export function SectionalBreakdown({
  breakdown,
  currentStrategy,
  onStrategyChange
}: SectionalBreakdownProps) {
  if (breakdown.totalQuotes === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted">
        <p className="text-sm">No dialogue found in this document</p>
      </div>
    );
  }

  const maxCount = Math.max(...breakdown.groups.map(g => g.quoteCount));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {currentStrategy.name}
        </h3>
        <div className="flex gap-2" role="group" aria-label="View granularity">
          {[ByPassage, ByChapter].map(strategy => (
            <button
              key={strategy.name}
              onClick={() => onStrategyChange(strategy)}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                currentStrategy === strategy
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted-foreground/10'
              }`}
              aria-pressed={currentStrategy === strategy}
            >
              {strategy.name.replace('By ', '')}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1" role="list" aria-label="Quote counts by section">
        {breakdown.groups.map((group, index) => (
          <div
            key={`${group.label}-${index}`}
            className="flex items-center gap-2"
            role="listitem"
          >
            <span className="w-24 text-sm truncate" title={group.label}>
              {group.label}
            </span>

            <div
              className="flex-1 bg-muted rounded h-6 relative"
              role="progressbar"
              aria-valuenow={group.quoteCount}
              aria-valuemin={0}
              aria-valuemax={maxCount}
              aria-label={`${group.label}: ${group.quoteCount} quotes`}
            >
              <div
                className="h-6 rounded bg-primary absolute top-0 left-0 transition-all"
                style={{
                  width: `${(group.quoteCount / maxCount) * 100}%`,
                  opacity: 0.7 + (index / breakdown.groups.length) * 0.3
                }}
              />
            </div>

            <span className="text-sm w-24 text-right tabular-nums">
              {group.quoteCount} ({group.percent.toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>

      <div className="text-sm text-muted-foreground pt-2 border-t">
        Total sections: {breakdown.groups.length} • Total quotes: {breakdown.totalQuotes}
      </div>
    </div>
  );
}
```

Need to import the strategies:

```typescript
import { ByPassage, ByChapter } from '../../lib/analytics/sectional';
```

**Step 4: Run test to verify it passes**

Run: `bun test components/analytics/__tests__/SectionalBreakdown.test.tsx`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add components/analytics/SectionalBreakdown.tsx components/analytics/__tests__/SectionalBreakdown.test.tsx
git commit -m "feat(analytics): add SectionalBreakdown component

- Display quote distribution by passage or chapter
- Strategy toggle button for switching views
- Horizontal bar chart with accessibility
- Empty state when no dialogue found
- Comprehensive component tests

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: glm-4.7"
```

---

## Task 6: Update DocumentAnalytics Container

**Files:**
- Modify: `components/analytics/DocumentAnalytics.tsx`

**Step 1: Update state type**

Add to state type in `components/analytics/DocumentAnalytics.tsx`:

```typescript
import { lookupCharacterName } from '../../lib/analytics/document';
import { groupDialogueBySections, calculateSectionStats, ByPassage } from '../../lib/analytics/sectional';
import type { SectionGroupingStrategy } from '../../lib/analytics/types';

type State =
  | { readonly status: 'idle' }
  | { readonly status: 'analyzing' }
  | { readonly status: 'analyzed';
      rankings: readonly CharacterRanking[];
      matrix: ConversationMatrix;
      sectionalStats: import('../../lib/analytics/types').SectionalBreakdown;
      groupingStrategy: SectionGroupingStrategy;
    }
  | { readonly status: 'error'; readonly error: string };
```

**Step 2: Add character lookup memoization**

Add in component body:

```typescript
const characterLookup = useCallback(
  (id: string | null) => lookupCharacterName(id, document?.state.characters ?? []),
  [document]
);
```

**Step 3: Update analyze function**

Update the analyze function to include character lookup and sectional breakdown:

```typescript
const analyze = useCallback(() => {
  if (!document) {
    setState({ status: 'error', error: 'No document loaded' });
    return;
  }

  setState({ status: 'analyzing' });

  try {
    const quotes = extractQuotes(document);

    // Updated with character lookup
    const rankings = calculateRankings(
      quotes,
      quotes.length,
      characterLookup
    );

    const matrix = buildConversationMatrix(quotes);

    // Add sectional breakdown
    const groups = groupDialogueBySections(
      document.state.dialogue,
      document.state.passages,
      ByPassage
    );
    const sectionalStats = calculateSectionStats(groups);

    setState({
      status: 'analyzed',
      rankings,
      matrix,
      sectionalStats,
      groupingStrategy: ByPassage
    });
  } catch (error) {
    setState({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}, [document, characterLookup]);
```

**Step 4: Add SectionalBreakdown to render**

Add to JSX render:

```typescript
return (
  <div className="space-y-6">
    <CharacterRankings rankings={state.rankings} />
    <ConversationMatrix matrix={state.matrix} />
    <SectionalBreakdown
      breakdown={state.sectionalStats}
      currentStrategy={state.groupingStrategy}
      onStrategyChange={(strategy) => {
        if (!document) return;

        const groups = groupDialogueBySections(
          document.state.dialogue,
          document.state.passages,
          strategy
        );
        const newStats = calculateSectionStats(groups);

        setState(prev => prev.status === 'analyzed'
          ? { ...prev, sectionalStats: newStats, groupingStrategy: strategy }
          : prev
        );
      }}
    />
  </div>
);
```

**Step 5: Run tests to verify**

Run: `bun test components/analytics/__tests__/DocumentAnalytics.test.tsx`
Expected: Tests PASS (may need to update tests to handle new state structure)

**Step 6: Commit**

```bash
git add components/analytics/DocumentAnalytics.tsx
git commit -m "feat(analytics): integrate character lookup and sectional breakdown

- Update calculateRankings to use character lookup
- Add sectional breakdown analysis
- Integrate SectionalBreakdown component
- Add strategy switching functionality
- Character names now display correctly

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: glm-4.7"
```

---

## Task 7: Update Documentation

**Files:**
- Modify: `docs/corpus-browsing.md`

**Step 1: Add enhancements section**

Add to `docs/corpus-browsing.md` after existing analytics section:

```markdown
### Recent Enhancements

#### Character Name Lookup

The analytics now displays actual character names instead of character IDs. The system:
- Looks up character names from the document's character index
- Falls back to character ID if not found
- Shows "Unknown" for null speakers

#### Temporal/Sectional Breakdown

A new visualization shows quote distribution across the document:
- **By Passage**: Shows each passage as a separate section
- **By Chapter**: Groups passages into chapters (10 passages each)
- Toggle between views using the buttons above the chart
- Horizontal bar chart shows quote count and percentage per section

### Technical Details

- **Character Lookup**: `lib/analytics/document.ts` - `lookupCharacterName()`
- **Sectional Grouping**: `lib/analytics/sectional.ts` - Strategy pattern for grouping
- **Component**: `components/analytics/SectionalBreakdown.tsx`
```

**Step 2: Commit**

```bash
git add docs/corpus-browsing.md
git commit -m "docs: document analytics enhancements

- Add character name lookup feature documentation
- Add temporal/sectional breakdown documentation
- Update technical details section
- Include usage instructions

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: glm-4.7"
```

---

## Task 8: Run Full Test Suite

**Step 1: Run all analytics tests**

Run: `bun test lib/analytics components/analytics`

Expected: All tests PASS

**Step 2: Run TypeScript check**

Run: `bun run typecheck`

Expected: No analytics-related errors

**Step 3: Manual verification**

1. Start dev server: `bun run dev`
2. Navigate to http://localhost:3000
3. Load a TEI document with dialogue
4. Click Analytics tab
5. Verify:
   - Character names display (not IDs)
   - Sectional breakdown shows
   - Strategy toggle works
   - Charts render correctly

**Step 4: Final commit**

```bash
git add .
git commit -m "feat(analytics): complete character lookup and sectional breakdown

All enhancements complete and tested:
- Character names resolved from index
- Temporal breakdown by passage/chapter
- Strategy switching functional
- Full test coverage
- Documentation updated

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: glm-4.7"
```

---

## Notes

- All functions are pure (no side effects)
- Protocol-first design with explicit dependencies
- Strategy pattern for composability
- Full TypeScript type safety
- Comprehensive test coverage
- Accessibility features included
