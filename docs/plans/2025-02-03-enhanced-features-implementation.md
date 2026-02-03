# Enhanced Features Plan: AI Detection, Shortcuts & Visualizations

> **Goal:** Implement AI-assisted dialogue detection, keyboard shortcuts, sample gallery, and enhanced visualizations using plain TypeScript (no WASM/Ax complexity).

**Architecture:** Pure TypeScript for all features. AI detection uses regex/pattern matching initially (designed to be pluggable). Keyboard shortcuts use composable patterns. Visualizations compute from current state (no stored layout state).

**Tech Stack:** TypeScript, React 19, CmdK (command palette), React Hotkeys, Recharts, Playwright

**Dependencies:** Requires Foundation Plan and Tag Application Plan

---

## Executive Summary

This plan implements **enhanced features** for the TEI Dialogue Editor. Key improvements from original plan:

### What We're Keeping (Core Features)

✅ **AI dialogue detection** - Pattern-based speaker attribution
✅ **Keyboard shortcuts** - Efficient workflow shortcuts
✅ **Sample gallery** - Quick document loading
✅ **Enhanced visualizations** - Charts, graphs, statistics
✅ **Bulk operations** - Apply tags to multiple selections

### What We're Removing (Unnecessary Complexity)

❌ **Rust WASM pattern engine** → Use TypeScript regex/patterns instead
❌ **Ax framework** → Use plain TypeScript + fetch
❌ **IndexedDB pattern database** → Use in-memory arrays (data is small)
❌ **Complex build chain** → Stay within TypeScript/JS ecosystem

### Why This Simpler Approach Works

**Assumption Check:** TEI documents are typically 5,000-50,000 words with ~50-500 dialogue instances. For this scale:

- **Pattern matching in TypeScript is fast enough** (no WASM needed)
- **In-memory pattern storage is sufficient** (~100-500 patterns)
- **Plain fetch for AI calls** (no framework abstraction needed)
- **Computed visualizations** (no need for stored layout state)

**If assumptions prove wrong:** We can add WASM/Ax later as **optimization**, not premature complexity.

---

## Part 1: AI Dialogue Detection (TypeScript)

### 1. Pattern Detection Engine

**Files:**
- Create: `lib/ai/pattern-detector.ts`
- Create: `lib/ai/types.ts`

**Implementation:**
```typescript
// lib/ai/types.ts

export interface SpeakerPattern {
  readonly id: string;
  readonly name: string;
  readonly patterns: readonly string[];  // Regex patterns
  readonly confidence: number;
}

export interface DetectionResult {
  readonly speaker: string;
  readonly confidence: number;
  readonly reason: string;
}

export interface DialogueDetection {
  readonly passageId: string;
  readonly range: TextRange;
  readonly text: string;
  readonly detectedSpeakers: readonly DetectionResult[];
}

export interface TextRange {
  readonly start: number;
  readonly end: number;
}
```

```typescript
// lib/ai/pattern-detector.ts

/**
 * ✅ Pure function: Detect speaker from dialogue text using patterns
 *
 * Uses regex patterns for common dialogue attribution patterns:
 * - "Hello," she said. → speaker = "she"
 * - John replied, "..." → speaker = "John"
 * - "What?" asked Mary. → speaker = "Mary"
 */
export function detectSpeaker(
  dialogue: string,
  characters: readonly Character[],
  patterns: readonly SpeakerPattern[]
): DetectionResult[] {
  const results: DetectionResult[] = [];

  // Check each pattern
  for (const pattern of patterns) {
    for (const regex of pattern.patterns) {
      const match = dialogue.match(new RegExp(regex, 'i'));
      if (match) {
        const character = characters.find(c =>
          c.name.toLowerCase() === match[1]?.toLowerCase()
        );

        results.push({
          speaker: character?.id || pattern.name,
          confidence: pattern.confidence,
          reason: `Pattern match: "${regex}"`
        });
      }
    }
  }

  // Sort by confidence (highest first)
  results.sort((a, b) => b.confidence - a.confidence);

  // Return top 3 matches
  return results.slice(0, 3);
}

/**
 * ✅ Pure function: Detect all dialogue in document
 */
export function detectDialogueInDocument(
  doc: TEIDocument,
  patterns: readonly SpeakerPattern[]
): readonly DialogueDetection[] {
  const detections: DialogueDetection[] = [];

  for (const passage of doc.state.passages) {
    // Find dialogue-like patterns: quotes, speech tags, etc.
    const dialoguePatterns = passage.tags.filter(t =>
      t.type === 'said' || t.type === 'q'
    );

    // For each existing tag, detect speaker attribution
    for (const tag of dialoguePatterns) {
      const text = extractContent(passage, tag);
      const detections = detectSpeaker(text, doc.state.characters, patterns);

      detections.forEach(detection => {
        detections.push({
          passageId: passage.id,
          range: tag.range,
          text,
          detectedSpeakers: [detection]
        });
      });
    }

    // Also detect untagged dialogue (heuristic: text in quotes)
    const untreatedQuotes = findUntaggedDialogue(passage.content);
    for (const quote of untreatedQuotes) {
      const detections = detectSpeaker(quote.text, doc.state.characters, patterns);

      detections.push({
        passageId: passage.id,
        range: quote.range,
        text: quote.text,
        detectedSpeakers: detections
      });
    }
  }

  return detections;
}

// Helper: Find untreated dialogue (text in quotes not yet tagged)
interface Quote { range: TextRange; text: string }
function findUntaggedDialogue(content: string): Quote[] {
  // Find text between quotation marks
  const quoteRegex = /"([^"]+)"/g;
  const quotes: Quote[] = [];
  let match;

  while ((match = quoteRegex.exec(content)) !== null) {
    quotes.push({
      range: { start: match.index, end: match.index + match[0].length },
      text: match[1]
    });
  }

  return quotes;
}
```

---

### 2. Pattern Management

**Files:**
- Create: `lib/ai/PatternManager.ts`

**Implementation:**
```typescript
// lib/ai/PatternManager.ts

import { SpeakerPattern } from './types';

/**
 * ✅ Value-oriented: Pattern database as immutable value
 */
export interface PatternDatabase {
  readonly patterns: readonly SpeakerPattern[];
  readonly lastUpdated: Date;
}

// Default speaker patterns (built-in)
const DEFAULT_PATTERNS: SpeakerPattern[] = [
  {
    id: 'said-she',
    name: 'Narrator (she)',
    patterns: [
      '"([^"]+)",\\s+she\\s+said', 'she\\s+said'
    ],
    confidence: 0.9
  },
  {
    id: 'said-he',
    name: 'Narrator (he)',
    patterns: [
      '"([^"]+)",\\s+he\\s+said', 'he\\s+said'
    ],
    confidence: 0.9
  },
  {
    id: 'said-then-verb',
    name: 'Speaker after quotation',
    patterns: [
      '"([^"]+)",\\s+(said|replied|asked|answered|called)\\s+([A-Z][a-z]+)'
    ],
    confidence: 0.85
  }
];

export function createPatternDatabase(
  patterns: readonly SpeakerPattern[] = []
): PatternDatabase {
  return {
    patterns: [...DEFAULT_PATTERNS, ...patterns],
    lastUpdated: new Date()
  };
}

/**
 * ✅ Pure function: Add pattern to database
 */
export function addPattern(
  db: PatternDatabase,
  pattern: SpeakerPattern
): PatternDatabase {
  return {
    patterns: [...db.patterns, pattern],
    lastUpdated: new Date()
  };
}

/**
 * ✅ Pure function: Update pattern
 */
export function updatePattern(
  db: PatternDatabase,
  patternId: string,
  updates: Partial<Omit<SpeakerPattern, 'id'>>
): PatternDatabase {
  return {
    patterns: db.patterns.map(p =>
      p.id === patternId ? { ...p, ...updates } : p
    ),
    lastUpdated: new Date()
  };
}

/**
 * ✅ Pure function: Remove pattern
 */
export function removePattern(
  db: PatternDatabase,
  patternId: string
): PatternDatabase {
  return {
    patterns: db.patterns.filter(p => p.id !== patternId),
    lastUpdated: new Date()
  };
}
```

---

### 3. AI Provider Interface (Protocol)

**Files:**
- Create: `lib/ai/AIProvider.ts`

**Protocol Definition:**
```typescript
// lib/ai/AIProvider.ts

/**
 * ✅ Protocol: AI detection interface
 *
 * This defines the contract for speaker attribution. Different implementations
 * can provide different strategies (regex, ML models, external APIs).
 */
export interface AIDetector {
  /**
   * Detect speaker for dialogue text
   * @param dialogue - The dialogue text
   * @param characters - Known characters to choose from
   * @param patterns - Pattern database for speaker attribution
   * @returns Array of detected speakers with confidence scores
   */
  detectSpeaker(
    dialogue: string,
    characters: readonly Character[],
    patterns: readonly SpeakerPattern[]
  ): readonly DetectionResult[];

  /**
   * Batch detect speakers for multiple dialogues
   * @param dialogues - Array of dialogue texts with metadata
   * @returns Detection results for each dialogue
   */
  batchDetect(
    dialogues: readonly { dialogue: string; metadata: any }[]
  ): readonly DetectionResult[][];
}

/**
   * Learn from corrections (update patterns based on user feedback)
   * @param corrections - Array of { dialogue, correctSpeaker, previousDetection }
   * @returns Updated pattern database
   */
  learnFromCorrections(
    corrections: readonly {
      dialogue: string;
      correctSpeaker: string;
      previousDetection: DetectionResult;
    }[],
    currentPatterns: readonly SpeakerPattern[]
  ): SpeakerPattern[];
}

/**
 * TypeScript implementation of AIDetector (regex-based)
 */
export class PatternBasedDetector implements AIDetector {
  detectSpeaker(
    dialogue: string,
    characters: readonly Character[],
    patterns: readonly SpeakerPattern[]
  ): readonly DetectionResult[] {
    return detectSpeaker(dialogue, characters, patterns);
  }

  batchDetect(
    dialogues: readonly { dialogue: string; metadata: any }[]
  ): readonly DetectionResult[][] {
    return dialogues.map(({ dialogue }) =>
      this.detectSpeaker(dialogue, [], patterns)
    );
  }

  learnFromCorrections(
    corrections: readonly {
      dialogue: string;
      correctSpeaker: string;
      previousDetection: DetectionResult;
    }[],
    currentPatterns: readonly SpeakerPattern[]
  ): SpeakerPattern[] {
    // TODO: Implement pattern learning from corrections
    // For now, return current patterns unchanged
    return [...currentPatterns] as SpeakerPattern[];
  }
}
```

---

## Part 2: Keyboard Shortcuts System

### 4. Keyboard Shortcut Infrastructure

**Files:**
- Create: `lib/keyboard/shortcut-manager.ts`

**Implementation:**
```typescript
// lib/keyboard/shortcut-manager.ts

export interface Shortcut {
  key: string;
  description: string;
  action: () => void;
  condition?: () => boolean;
}

/**
 * ✅ Value-oriented: Shortcut registry as immutable value
 */
export interface ShortcutRegistry {
  readonly shortcuts: readonly Shortcut[];
}

/**
 * ✅ Pure function: Create shortcut registry
 */
export function createShortcutRegistry(
  shortcuts: readonly Shortcut[] = []
): ShortcutRegistry {
  // Sort by key for predictable matching
  const sorted = [...shortcuts].sort((a, b) => a.key.localeCompare(b.key));

  return {
    shortcuts: sorted
  };
}

/**
 * ✅ Pure function: Add shortcut to registry
 */
export function addShortcut(
  registry: ShortcutRegistry,
  shortcut: Shortcut
): ShortcutRegistry {
  return createShortcutRegistry([...registry.shortcuts, shortcut]);
}

/**
 * ✅ Pure function: Match keyboard event to shortcut
 */
export function matchShortcut(
  registry: ShortcutRegistry,
  event: KeyboardEvent
): Shortcut | null {
  const pressedKey = formatKeyEvent(event);

  for (const shortcut of registry.shortcuts) {
    if (shortcut.key === pressedKey) {
      if (shortcut.condition && !shortcut.condition()) {
        continue; // Condition not met
      }
      return shortcut;
    }
  }

  return null;
}

function formatKeyEvent(event: KeyboardEvent): string {
  const parts: string[] = [];

  if (event.ctrlKey || event.metaKey) parts.push('cmd');
  if (event.altKey) parts.push('alt');
  if (event.shiftKey) parts.push('shift');
  parts.push(event.key);

  return parts.join('+');
}
```

---

### 5. Default Shortcuts

**Files:**
- Create: `lib/keyboard/default-shortcuts.ts`

**Implementation:**
```typescript
// lib/keyboard/default-shortcuts.ts

import { createShortcutRegistry } from './shortcut-manager';

export function createDefaultShortcuts(
  onTagSpeaker1: () => void,
  onTagSpeaker2: () => void,
  onTagSpeaker3: () => void,
  // ... up to speaker9
  onTagQ: () => void,
  onTagPersName: () => void,
  onToggleEntities: () => void,
  onSave: () => void
): ShortcutRegistry {
  const shortcuts: Shortcut[] = [
    { key: 'cmd+s', description: 'Save document', action: onSave },
    { key: 'cmd+e', description: 'Toggle entity editor', action: onToggleEntities },
    { key: 'cmd+k', description: 'Command palette', action: () => {} }, // Placeholder
    { key: 'Escape', description: 'Close dialog/palette', action: () => {} },

    // Tag shortcuts (1-9 for speakers)
    { key: '1', description: 'Tag as speaker1', action: onTagSpeaker1, condition: () => isTextSelected() },
    { key: '2', description: 'Tag as speaker2', action: onTagSpeaker2, condition: () => isTextSelected() },
    { key: '3', description: 'Tag as speaker3', action: onTagSpeaker3, condition: () => isTextSelected() },
    // ... up to 9

    { key: 'ctrl+q', description: 'Tag as q (quotation)', action: onTagQ, condition: () => isTextSelected() },
    { key: 'ctrl+p', description: 'Tag as persName (person name)', action: onTagPersName, condition: () => isTextSelected() },
  ];

  return createShortcutRegistry(shortcuts);
}

function isTextSelected(): boolean {
  const selection = window.getSelection();
  return selection ? selection.toString().trim().length > 0 : false;
}
```

---

## Part 3: Sample Gallery

### 6. Sample Management

**Files:**
- Create: `lib/samples/SampleManager.ts`
- Create: `lib/samples/samples.ts`

**Implementation:**
```typescript
// lib/samples/samples.ts

export interface Sample {
  readonly id: string;
  readonly title: string;
  readonly author: string;
  readonly year: number;
  readonly wordCount: number;
  readonly dialogueCount: number;
  readonly difficulty: 'beginner' | 'intermediate' | 'advanced';
  readonly tags: readonly string[];
}

export const SAMPLES: readonly Sample[] = [
  {
    id: 'yellow-wallpaper',
    title: 'The Yellow Wallpaper',
    author: 'Charlotte Perkins Gilman',
    year: 1892,
    wordCount: 6000,
    dialogueCount: 15,
    difficulty: 'intermediate',
    tags: ['short-story', 'first-person', 'psychological']
  },
  {
    id: 'gift-of-the-magi',
    title: 'The Gift of the Magi',
    author: 'O. Henry',
    year: 1905,
    wordCount: 4500,
    dialogueCount: 25,
    difficulty: 'beginner',
    tags: ['short-story', 'third-person']
  }
  // ... more samples
];

/**
 * ✅ Pure function: Load sample by ID
 */
export function loadSample(sampleId: string): string {
  const sample = SAMPLES.find(s => s.id === sampleId);
  if (!sample) {
    throw new Error(`Sample not found: ${sampleId}`);
  }

  // In production, load from public/samples/{id}.xml
  // For now, return placeholder
  return `<!-- Sample: ${sample.title} -->`;
}
```

---

## Part 4: Enhanced Visualizations

### 7. Statistics Dashboard

**Files:**
- Create: `components/visualization/StatisticsDashboard.tsx`

**Implementation:**
```typescript
// components/visualization/StatisticsDashboard.tsx
'use client';

import React from 'react';
import { useDocumentContext } from '@/lib/context/DocumentContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, BarChartProps } from '@/components/ui/charts';

export function StatisticsDashboard() {
  const { doc } = useDocumentContext();

  const stats = React.useMemo(() => {
    if (!doc) return null;

    const dialogue = doc.state.dialogue;
    const passages = doc.state.passages;
    const characters = doc.state.characters;
    const relationships = doc.state.relationships;

    // Dialogue per passage
    const dialoguePerPassage = passages.map(passage => ({
      passage: passage.index,
      count: passage.tags.filter(t => t.type === 'said').length
    }));

    // Character with most dialogue
    const characterDialogueCount = new Map<CharacterID, number>();
    dialogue.forEach(d => {
      if (d.speaker) {
        characterDialogueCount.set(d.speaker, (characterDialogueCount.get(d.speaker) || 0) + 1);
      }
    });

    const topCharacters = Array.from(characterDialogueCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({ id, count }));

    return {
      totalDialogue: dialogue.length,
      totalPassages: passages.length,
      totalCharacters: characters.length,
      totalRelationships: relationships.length,
      dialoguePerPassage,
      topCharacters
    };
  }, [doc]);

  if (!stats) return null;

  const chartData: BarChartProps['data'] = stats.dialoguePerPassage.map(d => ({
    passage: d.passage.toString(),
    dialogue: d.count
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Document Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Total Dialogue</p>
              <p className="text-2xl font-bold">{stats.totalDialogue}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Passages</p>
              <p className="text-2xl font-bold">{stats.totalPassages}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Characters</p>
              <p className="text-2xl font-bold">{stats.totalCharacters}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Dialogue per Passage</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart
            data={chartData}
            layout="vertical"
            width={600}
            height={300}
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Implementation Tasks

### Task 1: Create AI Types and Interfaces
- Create `lib/ai/types.ts` with detection types
- Create `lib/ai/AIProvider.ts` with protocol interface
- Define `PatternDatabase`, `SpeakerPattern`, `DetectionResult`

### Task 2: Implement Pattern Detector
- Create `lib/ai/pattern-detector.ts`
- Implement `detectSpeaker` with regex patterns
- Implement `detectDialogueInDocument`
- Add helper functions for finding untreated dialogue

### Task 3: Create Pattern Manager
- Create `lib/ai/PatternManager.ts`
- Implement pattern CRUD operations (pure functions)
- Add default speaker patterns
- Add pattern learning infrastructure (placeholder for now)

### Task 4: Update TEI Operations for Entities
- Extend `lib/tei/operations.ts` with entity serialization
- Ensure `serialize()` includes characters and relationships in TEI XML
- Parse `listPerson` and `listRelation` on document load

### Task 5: Create Keyboard Shortcut System
- Create `lib/keyboard/shortcut-manager.ts`
- Implement `createShortcutRegistry`, `addShortcut`, `matchShortcut`
- Add key formatting utilities

### Task 6: Create Default Shortcuts
- Create `lib/keyboard/default-shortcuts.ts`
- Implement tag application shortcuts (1-9, ctrl+q, ctrl+p)
- Add document shortcuts (cmd+s, cmd+e)
- Add validation (check text is selected before tag shortcuts)

### Task 7: Integrate Shortcuts with Editor
- Modify `components/editor/EditorLayout.tsx` to use shortcut registry
- Add keyboard event listener
- Wire up actions to DocumentContext dispatch

### Task 8: Create Sample Manager
- Create `lib/samples/SampleManager.ts`
- Define `Sample` interface
- Implement `loadSample` function
- Add default samples (Yellow Wallpaper, etc.)

### Task 9: Create Sample Gallery Component
- Create `components/samples/SampleGallery.tsx`
- Display available samples with metadata
- Add sample loading button
- Integrate with DocumentContext

### Task 10: Create Statistics Dashboard
- Create `components/visualization/StatisticsDashboard.tsx`
- Display document statistics
- Add bar chart for dialogue per passage
- Show top characters by dialogue count

### Task 11: Create AI Assistant Component
- Create `components/ai/AIAssistant.tsx`
- Display AI suggestions for speaker attribution
- Allow user to accept/reject suggestions
- Auto-apply high-confidence suggestions

### Task 12: Update DocumentContext with AI
- Integrate pattern database into DocumentContext
- Add `detectSpeakers` method
- Add `applySuggestion` method for applying AI results

### Task 13: Unit Tests
- Test pattern detector with various dialogue patterns
- Test shortcut registry matches key events correctly
- Test sample loading
- Test statistics dashboard computes correct stats
- Test AI assistant suggestion application

### Task 14: Integration Tests
- Test AI assistant with document context
- Test shortcuts trigger correct actions
- Test sample gallery loads documents

### Task 15: E2E Tests
- Test AI detection suggests correct speakers
- Test user accepts suggestion and tag is applied
- Test keyboard shortcuts work correctly
- Test sample gallery loads and displays document

---

## Success Criteria

✅ **AI Detection:**
- Pattern-based detection works for common dialogue patterns
- AI assistant shows suggestions for speaker attribution
- User can accept/reject suggestions
- High-confidence suggestions auto-applied

✅ **Keyboard Shortcuts:**
- All shortcuts defined in one place
- Shortcuts work consistently across application
- Clear visual feedback for triggered shortcuts
- Conditions checked (e.g., text selected before tag shortcuts)

✅ **Sample Gallery:**
- Sample gallery displays available samples
- Loading sample replaces current document
- Samples show metadata (title, author, difficulty)

✅ **Visualizations:**
- Statistics dashboard shows document statistics
- Bar chart displays dialogue per passage
- Character network visualization updates with document changes

✅ **Simplicity:**
- No WASM complexity (pure TypeScript)
- No Ax framework (plain fetch)
- No IndexedDB (in-memory patterns)
- Composable design (each feature independent)

---

## Dependencies

**Requires:**
- Foundation Plan (immutable TEIDocument)
- Tag Application Plan (tag operations, SelectionManager)
- Existing: React 19, shadcn/ui components
- New: `recharts` (for statistics charts)

**No changes to:**
- XML parsing (keep existing)
- Tag application (extend with AI suggestions)
- Entity modeling (extend with AI-enhanced relationship detection)

---

## Time Estimates

- Task 1 (AI Types): 1 hour
- Task 2 (Pattern Detector): 3 hours
- Task 3 (Pattern Manager): 2 hours
- Task 4 (TEI Operations): 2 hours
- Task 5 (Shortcut Manager): 2 hours
- Task 6 (Default Shortcuts): 2 hours
- Task 7 (Integration): 2 hours
- Task 8 (Sample Manager): 1 hour
- Task 9 (Sample Gallery): 2 hours
- Task 10 (Stats Dashboard): 3 hours
- Task 11 (AI Assistant): 3 hours
- Task 12 (Context Integration): 2 hours
- Task 13-15 (Tests): 5 hours

**Total:** ~30 hours (4-5 days)

---

**Plan Status:** ✅ Ready for implementation
**Complexity:** Low-Medium (pure TypeScript, no new languages)
**Risk:** Low (builds on existing foundation, removes unnecessary complexity)

---

## Notes

**Why we removed WASM/Ax:**
- **YAGNI principle:** Start simple, optimize only if needed
- **Measuring first:** Profile before adding complexity
- **TypeScript is fast enough:** Regex pattern matching is fast for document scales
- **No clear benefit:** WASM doesn't solve a proven problem here

**Why we removed IndexedDB:**
- **Data is small:** ~100-500 patterns fit easily in memory
- **Complexity not justified:** IndexedDB adds async complexity, persists what's ephemeral
- **Session-based:** Patterns are session-specific, no need for persistence

**Future optimization opportunities** (only if measured performance issues):
- Add WASM for pattern matching if profiling shows it's a bottleneck
- Add IndexedDB if patterns grow to thousands of entries
- Add Ax if AI API integration becomes complex

**This plan is designed to be ship-able and testable, with clear paths for optimization if needed.**
