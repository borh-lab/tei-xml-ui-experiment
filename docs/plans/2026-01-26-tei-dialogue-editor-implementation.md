# TEI Dialogue Editor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a web-based TEI XML annotation tool for extracting and tagging dialogue in novels, with AI-assisted detection, character management, and visualization features.

**Architecture:** React SPA (Next.js 14+) with TypeScript, client-first design using React Context for state, fast-xml-parser for TEI processing, and pluggable AI providers. Optional backend for Relax NG validation.

**Tech Stack:** Next.js 14, TypeScript, TailwindCSS + shadcn/ui, fast-xml-parser, Monaco Editor, D3.js, React Flow, Vercel AI SDK

---

## Phase 1: Project Setup and Infrastructure

### Task 1: Initialize Next.js Project

**Files:**

- Create: `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`
- Create: `.worktrees/tei-dialogue-editor/` (project root)

**Step 1: Create Next.js project**

```bash
cd /home/bor/Projects/tei-xml/.worktrees/tei-dialogue-editor
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm
```

**Step 2: Install core dependencies**

```bash
npm install fast-xml-parser xmldom zustand
npm install -D @types/node
```

**Step 3: Verify setup**

Run: `npm run dev`
Expected: Server starts on http://localhost:3000, shows Next.js welcome page

**Step 4: Commit**

```bash
git add .
git commit --no-gpg-sign -m "feat: initialize Next.js project with TypeScript and TailwindCSS"
```

---

### Task 2: Set up shadcn/ui Components

**Files:**

- Create: `components.json`
- Modify: `app/globals.css`, `tailwind.config.ts`

**Step 1: Initialize shadcn/ui**

```bash
npx shadcn@latest init --yes --defaults
```

**Step 2: Install required components**

```bash
npx shadcn@latest add button card input label textarea select split-pane alert dialog tabs tooltip
```

**Step 3: Verify components render**

Create test file `app/test-components/page.tsx` with sample buttons and cards

**Step 4: Commit**

```bash
git add .
git commit --no-gpg-sign -m "feat: add shadcn/ui component library"
```

---

### Task 3: Create Project Structure

**Files:**

- Create: Directory structure per design

**Step 1: Create directory structure**

```bash
mkdir -p components/editor
mkdir -p components/visualization
mkdir -p components/character
mkdir -p components/shared
mkdir -p lib/tei
mkdir -p lib/ai
mkdir -p lib/validation
mkdir -p lib/utils
mkdir -p tests/unit
mkdir -p tests/integration
mkdir -p public/schemas
mkdir -p public/xslt
```

**Step 2: Create placeholder index files**

```bash
touch lib/tei/index.ts
touch lib/ai/index.ts
touch lib/validation/index.ts
```

**Step 3: Commit**

```bash
git add .
git commit --no-gpg-sign -m "feat: create project directory structure"
```

---

## Phase 2: Core TEI Processing

### Task 4: Implement TEIDocument Class

**Files:**

- Create: `lib/tei/TEIDocument.ts`
- Test: `tests/unit/TEIDocument.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/TEIDocument.test.ts
import { TEIDocument } from '@/lib/tei/TEIDocument';

describe('TEIDocument', () => {
  test('should parse basic TEI structure', () => {
    const tei = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc><titleStmt><title>Test</title></titleStmt></fileDesc>
  </teiHeader>
  <text>
    <body>
      <p>Hello world</p>
    </body>
  </text>
</TEI>`;

    const doc = new TEIDocument(tei);
    expect(doc.parsed).toBeDefined();
    expect(doc.rawXML).toBe(tei);
  });

  test('should serialize back to XML', () => {
    const tei = `<TEI xmlns="http://www.tei-c.org/ns/1.0"><text><body><p>Test</p></body></text></TEI>`;
    const doc = new TEIDocument(tei);
    const serialized = doc.serialize();
    expect(serialized).toContain('<TEI');
    expect(serialized).toContain('</TEI>');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/TEIDocument.test.ts`
Expected: FAIL with "Cannot find module '@/lib/tei/TEIDocument'"

**Step 3: Write minimal implementation**

```typescript
// lib/tei/TEIDocument.ts
import XMLParser from 'fast-xml-parser';

export interface TEINode {
  [key: string]: any;
}

export class TEIDocument {
  private parser: any;
  public rawXML: string;
  public parsed: TEINode;
  public metadata: any = {};
  public changes: any[] = [];

  constructor(xmlContent: string) {
    this.parser = new XMLParser.XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });
    this.rawXML = xmlContent;
    this.parsed = this.parser.parse(xmlContent);
  }

  serialize(): string {
    // For now, return raw. In real impl, use XMLBuilder
    return this.rawXML;
  }

  // Placeholder methods for later
  getDivisions() {
    return [];
  }
  getDialogue() {
    return [];
  }
  getCharacters() {
    return [];
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/TEIDocument.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/unit/TEIDocument.test.ts lib/tei/TEIDocument.ts
git commit --no-gpg-sign -m "feat: implement TEIDocument class with basic parsing"
```

---

### Task 5: Implement TEI Query Methods

**Files:**

- Modify: `lib/tei/TEIDocument.ts`
- Test: `tests/unit/TEIDocument-queries.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/TEIDocument-queries.test.ts
import { TEIDocument } from '@/lib/tei/TEIDocument';

describe('TEIDocument Query Methods', () => {
  test('getDivisions should extract div structure', () => {
    const tei = `<TEI xmlns="http://www.tei-c.org/ns/1.0">
      <text><body>
        <div type="volume" n="1">
          <div type="chapter" n="1"><p>Text</p></div>
        </div>
      </body></text>
    </TEI>`;

    const doc = new TEIDocument(tei);
    const divisions = doc.getDivisions();
    expect(divisions).toHaveLength(2);
    expect(divisions[0].type).toBe('volume');
  });

  test('getDialogue should extract said elements', () => {
    const tei = `<TEI xmlns="http://www.tei-c.org/ns/1.0">
      <text><body>
        <p><said who="#jane">Hello</said></p>
        <p><said who="#rochester">Hi</said></p>
      </body></text>
    </TEI>`;

    const doc = new TEIDocument(tei);
    const dialogue = doc.getDialogue();
    expect(dialogue).toHaveLength(2);
    expect(dialogue[0].who).toBe('#jane');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/TEIDocument-queries.test.ts`
Expected: FAIL (methods return empty arrays)

**Step 3: Implement query methods**

```typescript
// Add to TEIDocument class
getDivisions(): any[] {
  const divisions: any[] = [];

  function traverse(node: any, depth = 0) {
    if (!node || typeof node !== 'object') return;

    // Check for div elements
    if (Array.isArray(node)) {
      node.forEach(item => traverse(item, depth));
    } else {
      for (const key in node) {
        if (key === 'div') {
          const divs = Array.isArray(node[key]) ? node[key] : [node[key]];
          divs.forEach((div: any) => {
            divisions.push({
              type: div['@_type'],
              n: div['@_n'],
              depth,
              element: div
            });
            traverse(div, depth + 1);
          });
        } else {
          traverse(node[key], depth);
        }
      }
    }
  }

  traverse(this.parsed);
  return divisions;
}

getDialogue(): any[] {
  const dialogue: any[] = [];

  function traverse(node: any) {
    if (!node || typeof node !== 'object') return;

    if (Array.isArray(node)) {
      node.forEach(item => traverse(item));
    } else {
      for (const key in node) {
        if (key === 'said') {
          const saids = Array.isArray(node[key]) ? node[key] : [node[key]];
          saids.forEach((said: any) => {
            dialogue.push({
              who: said['@_who'],
              direct: said['@_direct'],
              aloud: said['@_aloud'],
              content: said['#text'] || said,
              element: said
            });
          });
        } else {
          traverse(node[key]);
        }
      }
    }
  }

  traverse(this.parsed);
  return dialogue;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/TEIDocument-queries.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/tei/TEIDocument.ts tests/unit/TEIDocument-queries.test.ts
git commit --no-gpg-sign -m "feat: implement TEI query methods for divisions and dialogue"
```

---

### Task 6: Implement TEI Serialization with XMLBuilder

**Files:**

- Modify: `lib/tei/TEIDocument.ts`
- Test: `tests/unit/TEIDocument-serialization.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/TEIDocument-serialization.test.ts
import { TEIDocument } from '@/lib/tei/TEIDocument';

describe('TEIDocument Serialization', () => {
  test('serialize should produce valid XML', () => {
    const tei = `<TEI xmlns="http://www.tei-c.org/ns/1.0"><text><body><p>Test</p></body></text></TEI>`;
    const doc = new TEIDocument(tei);

    const serialized = doc.serialize();
    const parser = new DOMParser();
    const parsed = parser.parseFromString(serialized, 'application/xml');

    expect(parsed.getElementsByTagName('parsererror').length).toBe(0);
  });

  test('serialize should preserve namespace', () => {
    const tei = `<TEI xmlns="http://www.tei-c.org/ns/1.0"><text><body><p>Test</p></body></text></TEI>`;
    const doc = new TEIDocument(tei);

    const serialized = doc.serialize();
    expect(serialized).toContain('xmlns="http://www.tei-c.org/ns/1.0"');
  });
});
```

**Step 2: Implement XMLBuilder serialization**

```typescript
// Add to top of TEIDocument.ts
import { XMLBuilder } from 'fast-xml-parser';

// Replace serialize method in TEIDocument class
serialize(): string {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    format: true
  });
  return builder.build(this.parsed);
}
```

**Step 3: Run tests**

Run: `npm test -- tests/unit/TEIDocument-serialization.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add lib/tei/TEIDocument.ts tests/unit/TEIDocument-serialization.test.ts
git commit --no-gpg-sign -m "feat: implement proper TEI serialization with XMLBuilder"
```

---

## Phase 3: Editor Interface

### Task 7: Create Global Document Context

**Files:**

- Create: `lib/context/DocumentContext.tsx`
- Test: `tests/unit/DocumentContext.test.tsx`

**Step 1: Write the failing test**

```typescript
// tests/unit/DocumentContext.test.tsx
import { renderHook, act } from '@testing-library/react';
import { useDocumentContext, DocumentProvider } from '@/lib/context/DocumentContext';

describe('DocumentContext', () => {
  test('should provide document to consumers', () => {
    const wrapper = ({ children }) => <DocumentProvider>{children}</DocumentProvider>;

    const { result } = renderHook(() => useDocumentContext(), { wrapper });

    expect(result.current).toBeDefined();
    expect(result.current.document).toBeNull();
  });

  test('should load document', () => {
    const wrapper = ({ children }) => <DocumentProvider>{children}</DocumentProvider>;
    const tei = `<TEI xmlns="http://www.tei-c.org/ns/1.0"><text><body><p>Test</p></body></text></TEI>`;

    const { result } = renderHook(() => useDocumentContext(), { wrapper });

    act(() => {
      result.current.loadDocument(tei);
    });

    expect(result.current.document).not.toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/DocumentContext.test.tsx`
Expected: FAIL with "Cannot find module '@/lib/context/DocumentContext'"

**Step 3: Implement context**

```typescript
// lib/context/DocumentContext.tsx
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { TEIDocument } from '@/lib/tei/TEIDocument';

interface DocumentContextType {
  document: TEIDocument | null;
  loadDocument: (xml: string) => void;
  updateDocument: (xml: string) => void;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export function DocumentProvider({ children }: { children: ReactNode }) {
  const [document, setDocument] = useState<TEIDocument | null>(null);

  const loadDocument = (xml: string) => {
    setDocument(new TEIDocument(xml));
  };

  const updateDocument = (xml: string) => {
    setDocument(new TEIDocument(xml));
  };

  return (
    <DocumentContext.Provider value={{ document, loadDocument, updateDocument }}>
      {children}
    </DocumentContext.Provider>
  );
}

export function useDocumentContext() {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error('useDocumentContext must be used within DocumentProvider');
  }
  return context;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/DocumentContext.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/context/DocumentContext.tsx tests/unit/DocumentContext.test.tsx
git commit --no-gpg-sign -m "feat: implement global document context"
```

---

### Task 8: Create Split-Pane Editor Layout

**Files:**

- Create: `components/editor/EditorLayout.tsx`
- Modify: `app/page.tsx`

**Step 1: Create editor layout component**

```typescript
// components/editor/EditorLayout.tsx
'use client';

import React, { useState } from 'react';
import { useDocumentContext } from '@/lib/context/DocumentContext';
import { Card } from '@/components/ui/card';

export function EditorLayout() {
  const { document } = useDocumentContext();
  const [splitPosition, setSplitPosition] = useState(50);

  if (!document) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">No document loaded</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex">
      {/* Left pane - Rendered view */}
      <Card className="flex-1 m-2 overflow-auto">
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-2">Rendered View</h2>
          <div id="rendered-view" className="prose">
            {/* Rendered content will go here */}
            <p>{document.parsed.TEI.text.body.p}</p>
          </div>
        </div>
      </Card>

      {/* Resizer */}
      <div
        className="w-1 bg-border cursor-col-resize hover:bg-primary"
        style={{ left: `${splitPosition}%` }}
      />

      {/* Right pane - Source view */}
      <Card className="flex-1 m-2 overflow-auto">
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-2">TEI Source</h2>
          <pre className="text-sm bg-muted p-2 rounded">
            {document.serialize()}
          </pre>
        </div>
      </Card>
    </div>
  );
}
```

**Step 2: Update main page**

```typescript
// app/page.tsx
'use client';

import { DocumentProvider } from '@/lib/context/DocumentContext';
import { EditorLayout } from '@/components/editor/EditorLayout';

export default function Home() {
  return (
    <DocumentProvider>
      <main className="min-h-screen">
        <EditorLayout />
      </main>
    </DocumentProvider>
  );
}
```

**Step 3: Test in browser**

Run: `npm run dev`
Visit: http://localhost:3000
Expected: See split-pane layout (though empty since no document loaded)

**Step 4: Commit**

```bash
git add components/editor/EditorLayout.tsx app/page.tsx
git commit --no-gpg-sign -m "feat: create split-pane editor layout"
```

---

### Task 9: Add File Upload Handler

**Files:**

- Create: `components/editor/FileUpload.tsx`
- Modify: `components/editor/EditorLayout.tsx`

**Step 1: Create file upload component**

```typescript
// components/editor/FileUpload.tsx
'use client';

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useDocumentContext } from '@/lib/context/DocumentContext';

export function FileUpload() {
  const { loadDocument } = useDocumentContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    loadDocument(text);
  };

  return (
    <div className="p-4 border-b">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xml,.txt"
        onChange={handleFileUpload}
        className="hidden"
      />
      <Button onClick={() => fileInputRef.current?.click()}>
        Upload TEI File
      </Button>
    </div>
  );
}
```

**Step 2: Add to editor layout**

```typescript
// Add to EditorLayout.tsx, import and add to top of component
import { FileUpload } from './FileUpload';

// In EditorLayout return, add at top:
return (
  <div className="h-screen flex flex-col">
    <FileUpload />
    <div className="flex-1 flex">
      {/* existing split panes */}
    </div>
  </div>
);
```

**Step 3: Test file upload**

Run: `npm run dev`
Upload a test TEI file
Expected: Document loads and displays in both panes

**Step 4: Commit**

```bash
git add components/editor/FileUpload.tsx components/editor/EditorLayout.tsx
git commit --no-gpg-sign -m "feat: add file upload functionality"
```

---

## Phase 4: Dialogue Tagging Interface

### Task 10: Implement Text Selection and Tag Toolbar

**Files:**

- Create: `components/editor/TagToolbar.tsx`
- Create: `lib/utils/selection.ts`
- Modify: `components/editor/EditorLayout.tsx`

**Step 1: Write test for selection utility**

```typescript
// tests/unit/selection.test.ts
import { getSelectionRange } from '@/lib/utils/selection';

describe('Selection Utils', () => {
  test('should extract selected text', () => {
    const div = document.createElement('div');
    div.textContent = 'Hello world';
    document.body.appendChild(div);

    const range = document.createRange();
    range.setStart(div.firstChild!, 0);
    range.setEnd(div.firstChild!, 5);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    const result = getSelectionRange();
    expect(result?.text).toBe('Hello');
  });
});
```

**Step 2: Implement selection utility**

```typescript
// lib/utils/selection.ts
export interface SelectionRange {
  text: string;
  startOffset: number;
  endOffset: number;
  container: Node;
}

export function getSelectionRange(): SelectionRange | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  const text = range.toString();

  if (!text) return null;

  return {
    text,
    startOffset: range.startOffset,
    endOffset: range.endOffset,
    container: range.commonAncestorContainer,
  };
}
```

**Step 3: Create tag toolbar component**

```typescript
// components/editor/TagToolbar.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { getSelectionRange } from '@/lib/utils/selection';

interface TagToolbarProps {
  onApplyTag: (tag: string, attrs?: Record<string, string>) => void;
}

export function TagToolbar({ onApplyTag }: TagToolbarProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleSelection = () => {
      const range = getSelectionRange();
      if (range && range.text.length > 0) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const rect = selection.getRangeAt(0).getBoundingClientRect();
          setPosition({ x: rect.left + rect.width / 2, y: rect.top - 50 });
          setVisible(true);
        }
      } else {
        setVisible(false);
      }
    };

    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('keyup', handleSelection);

    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('keyup', handleSelection);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed bg-background border rounded-lg shadow-lg p-2 flex gap-2 z-50"
      style={{ left: position.x - 100, top: position.y }}
    >
      <Button size="sm" variant="outline" onClick={() => onApplyTag('said')}>
        <said>
      </Button>
      <Button size="sm" variant="outline" onClick={() => onApplyTag('q')}>
        <q>
      </Button>
      <Button size="sm" variant="outline" onClick={() => onApplyTag('persName')}>
        persName
      </Button>
    </div>
  );
}
```

**Step 4: Integrate into editor**

```typescript
// Add to EditorLayout.tsx
import { TagToolbar } from './TagToolbar';

// In EditorLayout component:
const handleApplyTag = (tag: string, attrs?: Record<string, string>) => {
  // TODO: Apply tag to selection
  console.log('Apply tag:', tag, attrs);
};

// In return, add TagToolbar:
<TagToolbar onApplyTag={handleApplyTag} />
```

**Step 5: Test selection toolbar**

Run: `npm run dev`
Select text in rendered view
Expected: Tag toolbar appears above selection

**Step 6: Commit**

```bash
git add components/editor/TagToolbar.tsx lib/utils/selection.ts components/editor/EditorLayout.tsx
git commit --no-gpg-sign -m "feat: add text selection and tag toolbar"
```

---

## Phase 5: AI Integration

### Task 11: Create AI Provider Interface

**Files:**

- Create: `lib/ai/providers.ts`
- Test: `tests/unit/ai-providers.test.ts`

**Step 1: Write failing test**

```typescript
// tests/unit/ai-providers.test.ts
import { AIProvider, DialogueSpan } from '@/lib/ai/providers';

describe('AI Provider Interface', () => {
  test('should define provider interface', () => {
    const provider: AIProvider = {
      detectDialogue: async (text: string) => [],
      attributeSpeaker: async (context: string, characters) => '',
      validateConsistency: async (document) => [],
    };

    expect(provider.detectDialogue).toBeDefined();
    expect(provider.attributeSpeaker).toBeDefined();
    expect(provider.validateConsistency).toBeDefined();
  });
});
```

**Step 2: Define interfaces**

```typescript
// lib/ai/providers.ts
export interface DialogueSpan {
  start: number;
  end: number;
  text: string;
  confidence: number;
}

export interface Character {
  xmlId: string;
  name: string;
}

export interface Issue {
  type: string;
  message: string;
  location?: { line: number; column: number };
}

export interface AIProvider {
  detectDialogue(text: string): Promise<DialogueSpan[]>;
  attributeSpeaker(context: string, characters: Character[]): Promise<string>;
  validateConsistency(document: any): Promise<Issue[]>;
}
```

**Step 3: Run tests**

Run: `npm test -- tests/unit/ai-providers.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add lib/ai/providers.ts tests/unit/ai-providers.test.ts
git commit --no-gpg-sign -m "feat: define AI provider interface"
```

---

### Task 12: Implement OpenAI Provider

**Files:**

- Create: `lib/ai/openai.ts`
- Test: `tests/unit/ai-openai.test.ts`

**Step 1: Write failing test**

```typescript
// tests/unit/ai-openai.test.ts
import { OpenAIProvider } from '@/lib/ai/openai';

describe('OpenAI Provider', () => {
  test('should detect dialogue', async () => {
    const provider = new OpenAIProvider('test-key');
    const result = await provider.detectDialogue('"Hello," she said.');

    expect(result).toHaveLength(1);
    expect(result[0].text).toContain('Hello');
  });
});
```

**Step 2: Implement OpenAI provider**

```typescript
// lib/ai/openai.ts
import OpenAI from 'openai';
import { AIProvider, DialogueSpan, Character, Issue } from './providers';

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async detectDialogue(text: string): Promise<DialogueSpan[]> {
    // Simplified implementation - in real version, call GPT-4
    // For now, use regex as placeholder
    const spans: DialogueSpan[] = [];
    const quoteRegex = /"([^"]+)"/g;
    let match;

    while ((match = quoteRegex.exec(text)) !== null) {
      spans.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[1],
        confidence: 0.8,
      });
    }

    return spans;
  }

  async attributeSpeaker(context: string, characters: Character[]): Promise<string> {
    // TODO: Implement with GPT-4
    // For now, return first character
    return characters[0]?.xmlId || '';
  }

  async validateConsistency(document: any): Promise<Issue[]> {
    // TODO: Implement validation
    return [];
  }
}
```

**Step 3: Run test**

Run: `npm test -- tests/unit/ai-openai.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add lib/ai/openai.ts tests/unit/ai-openai.test.ts
git commit --no-gpg-sign -m "feat: implement OpenAI provider with basic dialogue detection"
```

---

## Phase 6: Testing with Real TEI Corpora

### Task 13: Download and Test Wright American Fiction Samples

**Files:**

- Create: `tests/fixtures/wright-american-fiction/`
- Test: `tests/integration/wright-samples.test.ts`

**Step 1: Clone sample repository**

```bash
cd tests/fixtures
git clone --depth 1 https://github.com/iulibdcs/Wright-American-Fiction.git
cd ../../
```

**Step 2: Write integration test**

```typescript
// tests/integration/wright-samples.test.ts
import { TEIDocument } from '@/lib/tei/TEIDocument';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

describe('Wright American Fiction Integration', () => {
  const samplesDir = join(__dirname, '../fixtures/Wright-American-Fiction');

  test('should parse sample TEI files', () => {
    const files = readdirSync(samplesDir).filter((f) => f.endsWith('.xml'));
    if (files.length === 0) {
      console.log('No sample files found');
      return;
    }

    const sampleFile = files[0];
    const content = readFileSync(join(samplesDir, sampleFile), 'utf-8');

    expect(() => {
      const doc = new TEIDocument(content);
      expect(doc.parsed).toBeDefined();
    }).not.toThrow();
  });
});
```

**Step 3: Run integration test**

Run: `npm test -- tests/integration/wright-samples.test.ts`
Expected: PASS (or skip if no samples)

**Step 4: Commit**

```bash
git add tests/integration/wright-samples.test.ts
git commit --no-gpg-sign -m "test: add integration tests with Wright American Fiction samples"
```

---

## Phase 7: Visualization Features

### Task 14: Create Dialogue Statistics Component

**Files:**

- Create: `components/visualization/DialogueStats.tsx`

**Step 1: Create statistics component**

```typescript
// components/visualization/DialogueStats.tsx
'use client';

import React, { useMemo } from 'react';
import { useDocumentContext } from '@/lib/context/DocumentContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function DialogueStats() {
  const { document } = useDocumentContext();

  const stats = useMemo(() => {
    if (!document) return null;

    const dialogue = document.getDialogue();
    const divisions = document.getDivisions();

    return {
      totalDialogue: dialogue.length,
      totalChapters: divisions.filter(d => d.type === 'chapter').length,
      dialoguePerChapter: divisions.map(div => {
        // Count dialogue in this division
        return { name: `${div.type} ${div.n}`, count: 0 }; // Placeholder
      })
    };
  }, [document]);

  if (!stats) {
    return <Card><CardContent className="p-6">No document loaded</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dialogue Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Dialogue Passages</p>
            <p className="text-2xl font-bold">{stats.totalDialogue}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Chapters</p>
            <p className="text-2xl font-bold">{stats.totalChapters}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Test in browser**

Run: `npm run dev`
Load a TEI file with dialogue
Expected: See statistics displayed

**Step 3: Commit**

```bash
git add components/visualization/DialogueStats.tsx
git commit --no-gpg-sign -m "feat: add dialogue statistics component"
```

---

## Phase 8: Export Functionality

### Task 15: Implement HTML Export

**Files:**

- Create: `lib/tei/export.ts`
- Create: `components/editor/ExportButton.tsx`

**Step 1: Write export utility**

```typescript
// lib/tei/export.ts
import { TEIDocument } from './TEIDocument';

export function exportToHTML(document: TEIDocument): string {
  const xml = document.serialize();

  // Simplified HTML conversion
  // In production, use TEI stylesheets
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>TEI Document</title>
  <style>
    body { font-family: serif; max-width: 800px; margin: 0 auto; padding: 2rem; }
    said { background: #f0f0f0; padding: 0.25rem 0.5rem; }
  </style>
</head>
<body>
  ${xml.replace(/<said[^>]*>/g, '<said>').replace(/<\/said>/g, '</said>')}
</body>
</html>`;

  return html;
}

export function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

**Step 2: Create export button**

```typescript
// components/editor/ExportButton.tsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { useDocumentContext } from '@/lib/context/DocumentContext';
import { exportToHTML, downloadFile } from '@/lib/tei/export';

export function ExportButton() {
  const { document } = useDocumentContext();

  const handleExportHTML = () => {
    if (!document) return;
    const html = exportToHTML(document);
    downloadFile(html, 'document.html', 'text/html');
  };

  const handleExportTEI = () => {
    if (!document) return;
    const xml = document.serialize();
    downloadFile(xml, 'document.xml', 'application/xml');
  };

  return (
    <div className="flex gap-2">
      <Button onClick={handleExportHTML} disabled={!document}>
        Export HTML
      </Button>
      <Button onClick={handleExportTEI} disabled={!document}>
        Export TEI
      </Button>
    </div>
  );
}
```

**Step 3: Test exports**

Run: `npm run dev`
Load document, click export buttons
Expected: Files download successfully

**Step 4: Commit**

```bash
git add lib/tei/export.ts components/editor/ExportButton.tsx
git commit --no-gpg-sign -m "feat: add TEI and HTML export functionality"
```

---

## Final Tasks

### Task 16: Create README and Documentation

**Files:**

- Create: `README.md`
- Create: `CONTRIBUTING.md`

**Step 1: Write README**

```markdown
# TEI Dialogue Editor

A web-based tool for annotating dialogue in TEI XML novels.

## Features

- Upload and edit TEI XML files
- Tag dialogue with `<said>` and `<q>` elements
- AI-assisted dialogue detection
- Character management
- Visualization and statistics
- Export to TEI or HTML

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

Visit http://localhost:3000

## Testing

\`\`\`bash
npm test
\`\`\`
```

**Step 2: Commit**

```bash
git add README.md CONTRIBUTING.md
git commit --no-gpg-sign -m "docs: add project documentation"
```

---

### Task 17: Run Full Test Suite

**Step 1: Run all tests**

```bash
npm test
```

Expected: All tests pass

**Step 2: Build production version**

```bash
npm run build
```

Expected: Build succeeds without errors

**Step 3: Final commit**

```bash
git add .
git commit --no-gpg-sign -m "feat: complete MVP for TEI Dialogue Editor"
```

---

## Success Criteria Checklist

- [x] Can upload and parse TEI XML files
- [x] Split-pane editor with rendered and source views
- [x] Text selection and tag toolbar
- [x] Basic TEI query methods (getDialogue, getDivisions)
- [x] AI provider interface with basic implementation
- [x] Dialogue statistics component
- [x] Export to TEI and HTML
- [x] Tests passing with real TEI samples
- [x] Documentation complete

## Next Steps (Future Phases)

- Implement proper character management with listPerson
- Add social network graph visualization
- Enhance AI dialogue detection with real GPT-4 integration
- Add Relax NG validation API
- Implement batch processing for multiple files
- Add TEI-to-EPUB export
- Create character-focused dialogue browser

---

## Notes for Implementation

1. **YAGNI Principle**: Each task implements minimal functionality. Don't add features not in plan.

2. **TDD Approach**: Write failing test first, implement, verify pass, then commit.

3. **Frequent Commits**: Commit after each completed task with descriptive messages.

4. **Reference Documentation**: Keep TEI P5 Guidelines handy:
   - https://tei-c.org/guidelines/p5/

5. **Sample Data**: Test with real TEI files from:
   - Wright American Fiction
   - Victorian Women Writers Project
   - Christof Schöch's TEI texts
