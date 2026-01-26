# TEI Dialogue Editor Enhanced Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add comprehensive enhancements to TEI Dialogue Editor including AI-assisted annotation with Ax, keyboard shortcuts, bulk operations, sample gallery, and advanced visualizations.

**Architecture:** Build on MVP foundation with Ax integration for structured AI, pattern-based learning system (Rust WASM), and enhanced React UI with keyboard shortcuts and visualizations.

**Tech Stack:** Ax framework, React Hotkeys, Cmdk, React Flow, D3.js, Recharts, Dexie, Playwright, Rust (WASM), Next.js 14, TypeScript.

---

## Phase 1: Foundation + Dataset Creation (Weeks 1-2)

### Task 1: Annotate Dataset - "The Yellow Wallpaper"

**Files:**
- Create: `tests/dataset/manually-annotated/yellow-wallpaper.xml`
- Create: `tests/dataset/metadata.json`

**Step 1: Create TEI document structure**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>The Yellow Wallpaper</title>
        <author>Charlotte Perkins Gilman</author>
      </titleStmt>
      <publicationStmt>
        <publisher>Public Domain</publisher>
        <date>1892</date>
      </publicationStmt>
    </fileDesc>
    <encodingDesc>
      <editorialDecl>
        <p>Dialogue tagged with <said> elements. Speaker attribution based on narrative context.</p>
      </editorialDecl>
    </encodingDesc>
  </teiHeader>
  <text>
    <front>
      <titlePage>
        <titlePart>The Yellow Wallpaper</titlePart>
        <docAuthor>Charlotte Perkins Gilman</docAuthor>
      </titlePage>
    </front>
    <body>
      <!-- Content to be annotated -->
    </body>
  </text>
  <standOff>
    <listPerson>
      <!-- Characters to be defined -->
    </listPerson>
  </standOff>
</TEI>
```

**Step 2: Add full content with dialogue annotations**

Use public domain text, annotate all dialogue with `<said who="#speaker">` tags.

**Step 3: Create metadata.json**

```json
{
  "title": "The Yellow Wallpaper",
  "author": "Charlotte Perkins Gilman",
  "year": 1892,
  "wordCount": 6000,
  "dialogueCount": 15,
  "characters": 3,
  "patterns": ["first-person", "indirect-speech", "internal-monologue"],
  "difficulty": "intermediate"
}
```

**Step 4: Verify TEI validity**

Run: `npx xmllint --noout tests/dataset/manually-annotated/yellow-wallpaper.xml`
Expected: No errors

**Step 5: Commit**

```bash
git add tests/dataset/manually-annotated/yellow-wallpaper.xml tests/dataset/metadata.json
git commit --no-gpg-sign -m "dataset: add annotated 'The Yellow Wallpaper'"
```

---

### Task 2: Annotate Dataset - "The Gift of the Magi"

**Follow same pattern as Task 1**

**Files:**
- Create: `tests/dataset/manually-annotated/gift-of-the-magi.xml`
- Modify: `tests/dataset/metadata.json` (add entry)

**Content:** O. Henry's classic story, ~3,000 words, ~12 dialogue passages, 2 characters.

**Step 5: Commit**

```bash
git add tests/dataset/manually-annotated/gift-of-the-magi.xml tests/dataset/metadata.json
git commit --no-gpg-sign -m "dataset: add annotated 'The Gift of the Magi'"
```

---

### Task 3: Annotate Dataset - "The Tell-Tale Heart"

**Follow same pattern**

**Files:**
- Create: `tests/dataset/manually-annotated/tell-tale-heart.xml`

**Content:** Edgar Allan Poe, ~2,000 words, ~8 passages, 2 characters.

**Commit:**

```bash
git add tests/dataset/manually-annotated/tell-tale-heart.xml tests/dataset/metadata.json
git commit --no-gpg-sign -m "dataset: add annotated 'The Tell-Tale Heart'"
```

---

### Task 4: Annotate Dataset - "An Occurrence at Owl Creek Bridge"

**Follow same pattern**

**Files:**
- Create: `tests/dataset/manually-annotated/owl-creek-bridge.xml`

**Content:** Ambrose Bierce, ~3,000 words, ~10 passages, 3 characters.

**Commit:**

```bash
git add tests/dataset/manually-annotated/owl-creek-bridge.xml tests/dataset/metadata.json
git commit --no-gpg-sign -m "dataset: add annotated 'An Occurrence at Owl Creek Bridge'"
```

---

### Task 5: Annotate Dataset - "Pride and Prejudice" Chapter 1

**Follow same pattern**

**Files:**
- Create: `tests/dataset/manually-annotated/pride-prejudice-ch1.xml`

**Content:** Jane Austen (Chapter 1 only), ~5,000 words, ~20 passages, 3 characters.

**Commit:**

```bash
git add tests/dataset/manually-annotated/pride-prejudice-ch1.xml tests/dataset/metadata.json
git commit --no-gpg-sign -m "dataset: add annotated 'Pride and Prejudice' Chapter 1"
```

---

### Task 6: Install Ax Framework Dependencies

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

**Step 1: Install packages**

```bash
npm install @ax-llm/ax @ax-llm/ax-ai-sdk-provider
```

**Step 2: Verify installation**

Run: `npm list @ax-llm/ax @ax-llm/ax-ai-sdk-provider`
Expected: Both packages listed with versions

**Step 3: Update package.json scripts**

Add to scripts section:
```json
"scripts": {
  "ax:test": "tsx -e \"import { ax, ai } from '@ax-llm/ax'; const llm = ai({ name: 'openai', apiKey: process.env.OPENAI_API_KEY }); const test = ax('text:string -> sentiment:class'); console.log('Ax installed');\""
}
```

**Step 4: Test basic Ax functionality**

Run: `npm run ax:test`
Expected: "Ax installed" output

**Step 5: Commit**

```bash
git add package.json package-lock.json
git commit --no-gpg-sign -m "feat: install Ax framework for structured AI generation"
```

---

### Task 7: Implement Ax Provider Interface

**Files:**
- Create: `lib/ai/ax-provider.ts`
- Modify: `lib/ai/index.ts`

**Step 1: Write failing test**

```typescript
// tests/unit/ax-provider.test.ts
import { AxProvider } from '@/lib/ai/ax-provider';

describe('AxProvider', () => {
  test('should initialize with provider name', () => {
    const provider = new AxProvider('openai', 'test-key');
    expect(provider.providerName).toBe('openai');
  });

  test('should have detectDialogue method', async () => {
    const provider = new AxProvider('openai', 'test-key');
    expect(provider.detectDialogue).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test tests/unit/ax-provider.test.ts`
Expected: FAIL with "Cannot find module '@/lib/ai/ax-provider'"

**Step 3: Implement AxProvider class**

```typescript
// lib/ai/ax-provider.ts
import { ax, ai } from "@ax-llm/ax";
import { createOpenAI } from "@ax-llm/ax-ai-sdk-provider";
import { AIProvider, DialogueSpan, Character, Issue } from './providers';

export class AxProvider implements AIProvider {
  private providerName: string;
  private apiKey: string;
  private llm: any;

  constructor(providerName: string, apiKey: string) {
    this.providerName = providerName;
    this.apiKey = apiKey;

    // Initialize LLM based on provider name
    if (providerName === 'openai') {
      this.llm = ai({ name: 'openai', apiKey });
    } else if (providerName === 'anthropic') {
      this.llm = ai({ name: 'anthropic', apiKey });
    } else {
      throw new Error(`Unsupported provider: ${providerName}`);
    }
  }

  async detectDialogue(text: string): Promise<DialogueSpan[]> {
    // TODO: Implement with Ax signature
    // For now, use regex as placeholder
    const spans: DialogueSpan[] = [];
    const quoteRegex = /"([^"]+)"/g;
    let match;

    while ((match = quoteRegex.exec(text)) !== null) {
      spans.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[1],
        confidence: 0.8
      });
    }

    return spans;
  }

  async attributeSpeaker(context: string, characters: Character[]): Promise<string> {
    // TODO: Implement with Ax signature
    return characters[0]?.xmlId || '';
  }

  async validateConsistency(document: any): Promise<Issue[]> {
    // TODO: Implement with Ax signature
    return [];
  }
}
```

**Step 4: Export from index**

```typescript
// lib/ai/index.ts
export { AxProvider } from './ax-provider';
```

**Step 5: Run tests to verify they pass**

Run: `npm test tests/unit/ax-provider.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add lib/ai/ax-provider.ts lib/ai/index.ts tests/unit/ax-provider.test.ts
git commit --no-gpg-sign -m "feat: implement Ax provider interface"
```

---

### Task 8: Add Command Palette Component

**Files:**
- Create: `components/keyboard/CommandPalette.tsx`
- Modify: `components/editor/EditorLayout.tsx`

**Step 1: Write failing test**

```typescript
// tests/unit/command-palette.test.tsx
import { render, screen } from '@testing-library/react';
import { CommandPalette } from '@/components/keyboard/CommandPalette';

describe('CommandPalette', () => {
  test('should open when Cmd+K is pressed', async () => {
    const { user } = userEvent.setup();
    render(<CommandPalette open={true} onClose={() => {}} />);

    await user.keyboard('{Control>}k');

    expect(screen.getByText('Save document')).toBeInTheDocument();
  });
});
```

**Step 2: Install cmdk**

```bash
npm install cmdk
```

**Step 3: Implement CommandPalette component**

```typescript
// components/keyboard/CommandPalette.tsx
'use client';

import React from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from 'cmdk';
import { useDocumentContext } from '@/lib/context/DocumentContext';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const { document, loadDocument } = useDocumentContext();

  const handleSave = () => {
    // TODO: Implement save
    onClose();
  };

  const handleLoadSample = () => {
    // TODO: Load sample
    onClose();
  };

  return (
    <CommandDialog open={open} onOpenChange={onClose}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Document">
          <CommandItem onSelect={handleSave}>
            Save document
          </CommandItem>
          <CommandItem onSelect={onClose}>
            Export TEI
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
```

**Step 4: Integrate into EditorLayout**

```typescript
// Add to EditorLayout.tsx
import { CommandPalette } from '@/components/keyboard/CommandPalette';
import { useHotkeys } from 'react-hotkeys-hook';

// In EditorLayout component:
const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

useHotkeys('mod+k', (e) => {
  e.preventDefault();
  setCommandPaletteOpen(true);
});

return (
  <div>
    <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
    {/* existing editor */}
  </div>
);
```

**Step 5: Install react-hotkeys-hook**

```bash
npm install react-hotkeys-hook
```

**Step 6: Run tests**

Run: `npm test tests/unit/command-palette.test.tsx`
Expected: PASS

**Step 7: Commit**

```bash
git add components/keyboard/CommandPalette.tsx components/editor/EditorLayout.tsx tests/unit/command-palette.test.tsx package.json package-lock.json
git commit --no-gpg-sign -m "feat: add command palette with Cmd+K shortcut"
```

---

### Task 9: Implement Basic Keyboard Shortcuts

**Files:**
- Create: `lib/hooks/useKeyboardShortcuts.ts`
- Create: `components/keyboard/KeyboardShortcutHelp.tsx`

**Step 1: Write test for keyboard shortcuts hook**

```typescript
// tests/unit/keyboard-shortcuts.test.ts
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  test('should register keyboard shortcuts', () => {
    const { result } = renderHook(() => useKeyboardShortcuts());
    expect(result.current.shortcuts).toBeDefined();
  });
});
```

**Step 2: Implement keyboard shortcuts hook**

```typescript
// lib/hooks/useKeyboardShortcuts.ts
import { useEffect } from 'react';
import useHotkeys from 'react-hotkeys-hook';

export interface ShortcutAction {
  key: string;
  description: string;
  action: () => void;
}

export function useKeyboardShortcuts(shortcuts: ShortcutAction[]) {
  useEffect(() => {
    shortcuts.forEach(({ key, action }) => {
      useHotkeys(key, action);
    });
  }, [shortcuts]);
}
```

**Step 3: Create keyboard shortcut help component**

```typescript
// components/keyboard/KeyboardShortcutHelp.tsx
'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ShortcutHelpProps {
  open: boolean;
  onClose: () => void;
}

export function KeyboardShortcutHelp({ open, onClose }: ShortcutHelpProps) {
  const shortcuts = [
    { keys: 'Cmd+K', description: 'Open command palette' },
    { keys: 'J / K', description: 'Next / previous passage' },
    { keys: '1-9', description: 'Tag as speaker 1-9' },
    { keys: 'A', description: 'Accept AI suggestion' },
    { keys: 'X', description: 'Reject AI suggestion' },
    { keys: '?', description: 'Show keyboard shortcuts' },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {shortcuts.map((shortcut) => (
            <div key={shortcut.keys} className="flex justify-between">
              <kbd className="px-2 py-1 bg-muted rounded">{shortcut.keys}</kbd>
              <span>{shortcut.description}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 4: Run tests**

Run: `npm test tests/unit/keyboard-shortcuts.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/hooks/useKeyboardShortcuts.ts components/keyboard/KeyboardShortcutHelp.tsx tests/unit/keyboard-shortcuts.test.ts
git commit --no-gpg-sign -m "feat: add keyboard shortcuts system"
```

---

### Task 10: Set Up IndexedDB Pattern Database

**Files:**
- Create: `lib/db/PatternDB.ts`
- Create: `tests/unit/pattern-db.test.ts`

**Step 1: Write failing test**

```typescript
// tests/unit/pattern-db.test.ts
import { PatternDB } from '@/lib/db/PatternDB';

describe('PatternDB', () => {
  test('should initialize database', async () => {
    const db = new PatternDB();
    await db.init();

    const speakers = await db.getSpeakers();
    expect(speakers).toEqual({});
  });

  test('should store speaker patterns', async () => {
    const db = new PatternDB();
    await db.init();

    await db.updateSpeakerPattern('speaker1', { lastUsed: Date.now() });

    const speaker = await db.getSpeaker('speaker1');
    expect(speaker).toBeDefined();
  });
});
```

**Step 2: Install dexie**

```bash
npm install dexie
```

**Step 3: Implement PatternDB class**

```typescript
// lib/db/PatternDB.ts
import Dexie, { Table } from 'dexie';

export interface SpeakerPattern {
  id?: number;
  xmlId: string;
  name: string;
  lastUsed: number;
  chapterAffinity: Record<string, number>;
}

export interface PatternCorrection {
  id?: number;
  timestamp: number;
  passage: string;
  accepted: string;
  rejected: string[];
  confidence: number;
}

export class PatternDB extends Dexie {
  speakers!: Table<SpeakerPattern>;
  corrections!: Table<PatternCorrection>;

  constructor() {
    super('TEIDialogueEditorDB', 1);
  }
}

export const db = new PatternDB();

export async function initDB() {
  await db.version(1).stores({
    speakers: '++xmlId, name',
    corrections: '++id, timestamp'
  });
}
```

**Step 4: Run tests**

Run: `npm test tests/unit/pattern-db.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/db/PatternDB.ts tests/unit/pattern-db.test.ts package.json package-lock.json
git commit --no-gpg-sign -m "feat: add IndexedDB pattern database with Dexie"
```

---

## Phase 2: Intelligence Layer (Weeks 3-4)

*Continue with 30+ more tasks covering pattern engine, AI modes, Ax signatures, etc. Due to length, this is a representative subset. The full plan would include all phases with similar granularity.*

---

## Summary

This implementation plan breaks down the enhanced features into **bite-sized TDD tasks**:

**Phase 1:** 10 tasks covering dataset creation (5 works), Ax integration, command palette, keyboard shortcuts, and pattern database setup.

**Key Principles:**
- Every task follows TDD: test → implement → verify → commit
- Exact file paths and code provided
- All changes committed immediately
- Each task is 2-5 minutes of work

**Next Steps:**
Execute with subagent-driven development for rapid iteration with code reviews between tasks.

**Total Tasks:** ~150 tasks across 5 phases (10-week timeline)
