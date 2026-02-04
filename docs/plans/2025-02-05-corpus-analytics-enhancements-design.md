# Corpus Analytics Enhancements Design Document

**Date:** 2025-02-05
**Status:** Approved for Implementation
**Author:** Claude (via brainstorming skill + Hickey review)

---

## Overview

Enhance the corpus analytics feature with two improvements:

1. **Character Name Lookup** - Display actual character names instead of character IDs
2. **Temporal/Sectional Breakdown** - Visualize quote distribution across passages and chapters

Both enhancements follow Rich Hickey's design principles: pure functions, protocol-first design, and composability.

---

## Architecture

### Design Principles

- **Pure Functions** - All analysis functions are side-effect-free
- **Protocol-First** - Function signatures reveal dependencies explicitly
- **Composability** - Functions combine in unanticipated ways
- **Values over Places** - Immutable data structures throughout
- **Separation of Concerns** - Grouping logic separate from calculation logic

---

## Enhancement 1: Character Name Lookup

### Problem

Currently `calculateRankings()` displays character IDs (e.g., "char-123") instead of human-readable names.

### Solution

Add character lookup as an **explicit protocol boundary** in the function signature.

### Types

```typescript
// Pure lookup function
export function lookupCharacterName(
  characterId: string | null,
  characters: readonly Character[]
): string {
  if (characterId === null) return "Unknown";

  const character = characters.find(c => c.id === characterId);
  return character?.name ?? characterId;  // Fallback to ID
}
```

### Updated Function Signature

```typescript
// Before: Less composable
export function calculateRankings(
  quotes: readonly Quote[],
  totalQuotes: number
): CharacterRanking[]

// After: Explicit dependency injection
export function calculateRankings(
  quotes: readonly Quote[],
  totalQuotes: number,
  characterLookup: (id: string | null) => string  // Protocol boundary
): CharacterRanking[]
```

### Benefits

- ✅ **More composable** - Works with any lookup function
- ✅ **Explicit** - Function signature reveals its dependency
- ✅ **Testable** - Can inject mock lookup in tests
- ✅ **Reusable** - Works with character data from different sources

### Usage

```typescript
// In DocumentAnalytics container
const characterLookup = useCallback(
  (id: string | null) => lookupCharacterName(id, document?.state.characters ?? []),
  [document]
);

const rankings = calculateRankings(
  quotes,
  quotes.length,
  characterLookup  // ← Injected protocol
);
```

---

## Enhancement 2: Temporal/Sectional Breakdown

### Problem

Users need to see how dialogue is distributed across a document (per passage or per chapter).

### Solution

Add a new visualization showing quote counts grouped by section, with switchable granularity.

### Protocol Design

```typescript
// Grouping result (protocol value)
export interface SectionGroup {
  readonly label: string;
  readonly startIndex: number;
  readonly endIndex: number;
  readonly dialogueItems: readonly Dialogue[];
}

// Grouping strategy (protocol)
export interface SectionGroupingStrategy {
  readonly name: string;
  readonly description?: string;
  readonly group: (
    dialogue: readonly Dialogue[],
    passages: readonly Passage[]
  ) => readonly SectionGroup[];
}

// Breakdown result (protocol value)
export interface SectionalBreakdown {
  readonly groups: readonly {
    readonly label: string;
    readonly quoteCount: number;
    readonly percent: number;
  }[];
  readonly totalQuotes: number;
}
```

### Strategy Implementations (Values, Not Classes)

```typescript
// Strategy 1: One passage per section
export const ByPassage: SectionGroupingStrategy = {
  name: 'By Passage',
  description: 'Each passage as a separate section',
  group: (dialogue, passages) => {
    return passages.map(passage => ({
      label: `Passage ${passage.index + 1}`,
      startIndex: passage.index,
      endIndex: passage.index,
      dialogueItems: dialogue.filter(d => d.passageId === passage.id)
    }));
  }
};

// Strategy 2: Group passages into chapters
export const ByChapter: SectionGroupingStrategy = {
  name: 'By Chapter',
  description: 'Group passages into chapters (10 passages each)',
  group: (dialogue, passages) => {
    const CHAPTER_SIZE = 10;
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
```

### Pure Calculation Functions

```typescript
// Step 1: Group dialogue by sections
export function groupDialogueBySections(
  dialogue: readonly Dialogue[],
  passages: readonly Passage[],
  strategy: SectionGroupingStrategy
): readonly SectionGroup[] {
  return strategy.group(dialogue, passages);
}

// Step 2: Calculate statistics for each section
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

### Benefits

- ✅ **Separable concerns** - Grouping logic separate from calculation
- ✅ **Composable** - Can mix and match strategies
- ✅ **Testable** - Each function has single responsibility
- ✅ **Reusable** - Grouping logic usable elsewhere
- ✅ **Extensible** - Can add new strategies without changing types

---

## Data Flow

### Container Component Integration

```typescript
export function DocumentAnalytics() {
  const [state, setState] = useState<State>({ status: 'idle' });
  const { document } = useDocumentService();

  // Create lookup function (curried - captures characters)
  const characterLookup = useCallback(
    (id: string | null) => lookupCharacterName(id, document?.state.characters ?? []),
    [document]
  );

  const analyze = useCallback(() => {
    if (!document) {
      setState({ status: 'error', error: 'No document loaded' });
      return;
    }

    setState({ status: 'analyzing' });

    try {
      // Extract quotes
      const quotes = extractQuotes(document);

      // Calculate rankings with injected lookup
      const rankings = calculateRankings(
        quotes,
        quotes.length,
        characterLookup  // ← Protocol boundary
      );

      // Build conversation matrix
      const matrix = buildConversationMatrix(quotes);

      // Calculate sectional breakdown
      const groups = groupDialogueBySections(
        document.state.dialogue,
        document.state.passages,
        ByPassage  // ← Default strategy
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

  useEffect(() => {
    if (document) analyze();
  }, [document, analyze]);

  // ... rendering based on state
}
```

### Strategy Switching

```typescript
// In SectionalBreakdown component
const onStrategyChange = (strategy: SectionGroupingStrategy) => {
  // Re-group with new strategy
  const groups = groupDialogueBySections(
    document.state.dialogue,
    document.state.passages,
    strategy
  );
  const newStats = calculateSectionStats(groups);

  // Update state (immutable)
  setState(prev => prev.status === 'analyzed'
    ? { ...prev, sectionalStats: newStats, groupingStrategy: strategy }
    : prev
  );
};
```

---

## UI Components

### SectionalBreakdown Component

```typescript
interface SectionalBreakdownProps {
  breakdown: SectionalBreakdown;
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
      {/* Header with strategy selector */}
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

      {/* Bar chart */}
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

      {/* Summary */}
      <div className="text-sm text-muted-foreground pt-2 border-t">
        Total sections: {breakdown.groups.length} • Total quotes: {breakdown.totalQuotes}
      </div>
    </div>
  );
}
```

### Accessibility Features

- ✅ Semantic HTML (`role="list"`, `role="listitem"`, `role="progressbar"`)
- ✅ ARIA attributes for screen readers
- ✅ Keyboard navigation for strategy toggle
- ✅ Visual gradient effect for better perception
- ✅ Tooltips for truncated labels
- ✅ Tabular numbers for alignment

---

## Testing Strategy

### Unit Tests: Character Lookup

```typescript
describe('lookupCharacterName', () => {
  const mockCharacters = [
    { id: 'char-1', xmlId: 'alice', name: 'Alice Smith' },
    { id: 'char-2', xmlId: 'bob', name: 'Bob Jones' }
  ] as const;

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

describe('calculateRankings with character lookup', () => {
  it('should use character names from lookup function', () => {
    const quotes = [
      { id: 'q1', speaker: 'char-1', text: 'Hello' },
      { id: 'q2', speaker: 'char-2', text: 'Hi' }
    ] as const;

    const mockLookup = (id: string | null) =>
      id === 'char-1' ? 'Alice' : id === 'char-2' ? 'Bob' : 'Unknown';

    const rankings = calculateRankings(quotes, 2, mockLookup);

    expect(rankings[0].characterName).toBe('Alice');
    expect(rankings[1].characterName).toBe('Bob');
  });
});
```

### Unit Tests: Sectional Breakdown

```typescript
describe('ByPassage strategy', () => {
  it('should group dialogue by passage', () => {
    const dialogue = [
      { id: 'd1', passageId: 'passage-1', content: 'Quote 1' },
      { id: 'd2', passageId: 'passage-2', content: 'Quote 2' }
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
      content: `Quote ${i}`
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
```

### Component Tests

```typescript
describe('SectionalBreakdown component', () => {
  it('should display section bars', () => {
    const breakdown = {
      groups: [
        { label: 'Chapter 1', quoteCount: 100, percent: 50 },
        { label: 'Chapter 2', quoteCount: 50, percent: 25 }
      ],
      totalQuotes: 150
    };

    render(<SectionalBreakdown
      breakdown={breakdown}
      currentStrategy={ByChapter}
      onStrategyChange={jest.fn()}
    />);

    expect(screen.getByText('Chapter 1')).toBeInTheDocument();
    expect(screen.getByText('100 (50.0%)')).toBeInTheDocument();
  });

  it('should switch strategies', () => {
    const onStrategyChange = jest.fn();
    render(<SectionalBreakdown
      breakdown={mockBreakdown}
      currentStrategy={ByPassage}
      onStrategyChange={onStrategyChange}
    />);

    fireEvent.click(screen.getByRole('button', { name: /chapter/i }));
    expect(onStrategyChange).toHaveBeenCalledWith(ByChapter);
  });
});
```

---

## Implementation Tasks

### Task 1: Add Character Lookup Function
**File:** `lib/analytics/document.ts`

1. Add `lookupCharacterName` function
2. Update `calculateRankings` signature with `characterLookup` parameter
3. Update existing tests
4. Add new tests for character lookup

### Task 2: Add Sectional Breakdown Types
**File:** `lib/analytics/types.ts`

1. Add `SectionGroup` interface
2. Add `SectionGroupingStrategy` interface
3. Add `SectionalBreakdown` interface

### Task 3: Implement Grouping Strategies
**File:** `lib/analytics/sectional.ts` (new)

1. Create `ByPassage` strategy implementation
2. Create `ByChapter` strategy implementation
3. Add `groupDialogueBySections` function
4. Add `calculateSectionStats` function
5. Add comprehensive tests

### Task 4: Create SectionalBreakdown Component
**File:** `components/analytics/SectionalBreakdown.tsx` (new)

1. Implement component with strategy toggle
2. Add bar chart visualization
3. Add accessibility attributes
4. Test component rendering

### Task 5: Update DocumentAnalytics Container
**File:** `components/analytics/DocumentAnalytics.tsx`

1. Update to use new `calculateRankings` signature
2. Add character lookup memoization
3. Add sectional breakdown analysis
4. Add strategy switching logic
5. Update state type

### Task 6: Update Documentation
**File:** `docs/corpus-browsing.md`

1. Document character name lookup feature
2. Document sectional breakdown feature
3. Add usage examples
4. Update screenshots if needed

---

## Migration Notes

### Breaking Changes

- `calculateRankings` signature **changes** - requires third parameter
- This is an internal API, only affects `DocumentAnalytics` component

### Migration Path

1. Update `calculateRankings` function signature
2. Update `DocumentAnalytics` to create `characterLookup` function
3. Add new `SectionalBreakdown` component to visualization panel
4. No data migration needed - pure functional change

---

## Future Enhancements

### Potential New Strategies

- **By Scene** - Detect scenes from dramatic passages
- **By Act** - For plays, group by acts
- **By Section** - Detect from TEI `<div>` structure
- **Custom Range** - User-defined passage ranges

### Performance Optimizations

- Memoize grouping results when document unchanged
- Virtualize long bar charts (100+ sections)
- Lazy load strategies

### Data Visualizations

- Line chart for quote density
- Heatmap for quote intensity
- Comparative view (document vs corpus)

---

## References

- Original corpus analytics design: `docs/plans/2025-02-05-corpus-analytics-design.md`
- TEI types: `lib/tei/types.ts`
- Analytics types: `lib/analytics/types.ts`
- Hickey design principles: See rich-hickey-review skill

---

**Design approved and ready for implementation.**
