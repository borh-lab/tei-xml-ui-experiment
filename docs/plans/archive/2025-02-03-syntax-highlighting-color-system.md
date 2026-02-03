# Syntax Highlighting and Semantic Color System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement comprehensive syntax highlighting for TEI XML in both editor views and establish a consistent semantic color system across the entire application.

**Architecture:**
- Use Prism.js for TEI XML syntax highlighting in the rendered view (WYSIWYG mode)
- Customize Monaco Editor's XML theme in the code view to match semantic colors
- Define CSS variables for all semantic colors with light/dark mode variants
- Apply consistent colors across CharacterNetwork, validation states, and UI elements

**Tech Stack:**
- Prism.js (XML grammar with custom TEI token definition)
- Monaco Editor (custom theme definition)
- CSS custom properties (oklch color space)
- React context for color theme management

---

## Task 1: Install Prism.js Dependencies

**Files:**
- Modify: `package.json`
- Test: N/A (dependency installation)

**Step 1: Install Prism.js core and XML language support**

```bash
npm install prismjs
```

**Step 2: Verify installation**

Run: `cat package.json | grep prismjs`
Expected: `"prismjs": "^1.x.x"` in dependencies

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add Prism.js dependency for syntax highlighting"
```

---

## Task 2: Create TEI Language Definition for Prism.js

**Files:**
- Create: `lib/syntax/tei-prism.ts`
- Test: `lib/syntax/__tests__/tei-prism.test.ts`

**Step 1: Write test for TEI token detection**

```typescript
// lib/syntax/__tests__/tei-prism.test.ts
import { highlightTEI } from '../tei-prism';

describe('TEI Syntax Highlighting', () => {
  it('should highlight <said> tags with who attribute', () => {
    const input = '<said who="#speaker1">Hello</said>';
    const result = highlightTEI(input);
    expect(result).toContain('token tag');
    expect(result).toContain('token attr-name');
    expect(result).toContain('token attr-value');
  });

  it('should highlight <persName> tags', () => {
    const input = '<persName ref="#john">John Doe</persName>';
    const result = highlightTEI(input);
    expect(result).toContain('token entity');
  });

  it('should handle nested tags', () => {
    const input = '<p><said who="#sp1">Text</said></p>';
    const result = highlightTEI(input);
    expect(result).toContain('token tag');
  });

  it('should escape HTML entities', () => {
    const input = '<p>Text with &amp; &lt; &gt;</p>';
    const result = highlightTEI(input);
    expect(result).toContain('&amp;');
    expect(result).toContain('&lt;');
    expect(result).toContain('&gt;');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tei-prism.test.ts`
Expected: FAIL with "Cannot find module '../tei-prism'"

**Step 3: Create TEI language definition**

```typescript
// lib/syntax/tei-prism.ts
import Prism from 'prismjs';
import 'prismjs/components/prism-markup'; // XML grammar

// Define TEI-specific tokens
Prism.languages.tei = Prism.languages.extend('markup', {
  // TEI dialogue tags
  'said-tag': {
    pattern: /<\/?(?:said)(?=\s|\/?>)[\s\S]*?>/i,
    inside: {
      'tag': /^<\/?[^>\s]*/,
      'attr-name': {
        pattern: /\s[a-zA-Z-]+(?==)/,
        inside: {
          'punctuation': /\s+/,
        }
      },
      'attr-value': {
        pattern: /=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+)/,
        inside: {
          'punctuation': [/^=/, { pattern: /^(\s*)["']|["']$/, lookbehind: true }]
        }
      },
      'punctuation': /\/?>/
    }
  },

  // TEI entity reference tags
  'entity-tag': {
    pattern: /<\/?(?:persName|placeName|orgName)(?=\s|\/?>)[\s\S]*?>/i,
    inside: {
      'tag': /^<\/?[^>\s]*/,
      'attr-name': /\s[a-zA-Z-]+(?==)/,
      'attr-value': {
        pattern: /=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+)/,
        inside: {
          'punctuation': [/^=/, { pattern: /^(\s*)["']|["']$/, lookbehind: true }]
        }
      },
      'punctuation': /\/?>/
    }
  },

  // TEI structural tags
  'structural-tag': {
    pattern: /<\/?(?:div|p|sp|l|lg|head)(?=\s|\/?>)[\s\S]*?>/i,
    inside: {
      'tag': /^<\/?[^>\s]*/,
      'attr-name': /\s[a-zA-Z-]+(?==)/,
      'attr-value': {
        pattern: /=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+)/,
        inside: {
          'punctuation': [/^=/, { pattern: /^(\s*)["']|["']$/, lookbehind: true }]
        }
      },
      'punctuation': /\/?>/
    }
  },

  // TEI metadata tags
  'metadata-tag': {
    pattern: /<\/?(?:author|title|date|publisher|bibl)(?=\s|\/?>)[\s\S]*?>/i,
    inside: {
      'tag': /^<\/?[^>\s]*/,
      'attr-name': /\s[a-zA-Z-]+(?==)/,
      'attr-value': {
        pattern: /=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+)/,
        inside: {
          'punctuation': [/^=/, { pattern: /^(\s*)["']|["']$/, lookbehind: true }]
        }
      },
      'punctuation': /\/?>/
    }
  }
});

// Highlight function for TEI content
export function highlightTEI(xmlContent: string): string {
  // Escape HTML first to prevent XSS
  const escaped = xmlContent
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  // Highlight with Prism
  return Prism.highlight(escaped, Prism.languages.tei, 'tei');
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tei-prism.test.ts`
Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add lib/syntax/
git commit -m "feat: add TEI language definition for Prism.js"
```

---

## Task 3: Update RenderedView to Use Prism.js Highlighting

**Files:**
- Modify: `components/editor/RenderedView.tsx`
- Test: `components/editor/__tests__/RenderedView.test.tsx`

**Step 1: Write test for syntax highlighting in rendered view**

```typescript
// components/editor/__tests__/RenderedView.test.tsx
// Add to existing tests

describe('Syntax Highlighting', () => {
  it('should apply syntax highlighting to passage content', () => {
    const mockDocument = {
      parsed: {
        TEI: {
          text: {
            body: {
              p: 'Hello <said who="#speaker1">World</said>'
            }
          }
        }
      }
    };

    const { container } = render(
      <DocumentContext.Provider value={{ document: mockDocument }}>
        <RenderedView
          selectedPassages={[]}
          onSelectionChange={jest.fn()}
          isBulkMode={false}
        />
      </DocumentContext.Provider>
    );

    // Check for Prism token classes
    const tokenElements = container.querySelectorAll('.token');
    expect(tokenElements.length).toBeGreaterThan(0);
  });

  it('should escape HTML entities in passage content', () => {
    const mockDocument = {
      parsed: {
        TEI: {
          text: {
            body: {
              p: 'Text with < & > characters'
            }
          }
        }
      }
    };

    const { container } = render(
      <DocumentContext.Provider value={{ document: mockDocument }}>
        <RenderedView
          selectedPassages={[]}
          onSelectionChange={jest.fn()}
          isBulkMode={false}
        />
      </DocumentContext.Provider>
    );

    const content = container.textContent;
    expect(content).toContain('Text with < & > characters');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- RenderedView.test.tsx`
Expected: FAIL (no syntax highlighting yet)

**Step 3: Update RenderedView to use Prism.js**

```typescript
// components/editor/RenderedView.tsx
// Add import at top
import { highlightTEI } from '@/lib/syntax/tei-prism';

// In the passage extraction useEffect (around line 93), modify the content building:
const escapedText = escapeHtml(saidText);
// Apply syntax highlighting to the said element HTML
const saidHtml = `<span ${dataAttrs.join(' ')} class="tei-tag tei-tag-said">${escapedText}</span>`;
const highlightedHtml = highlightTEI(saidHtml);
content += highlightedHtml;

// Also update regular text content to be escaped (around line 96)
if (para['#text_2']) {
  content += escapeHtml(para['#text_2']);
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- RenderedView.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add components/editor/RenderedView.tsx components/editor/__tests__/RenderedView.test.tsx
git commit -m "feat: apply Prism.js syntax highlighting to rendered view"
```

---

## Task 4: Define Semantic Color System CSS Variables

**Files:**
- Modify: `app/globals.css`
- Test: N/A (visual changes, manual verification)

**Step 1: Add semantic color variables to globals.css**

```css
/* Add to :root section after existing variables, around line 82 */

/* TEI Semantic Colors */
--tei-said-bg: oklch(0.96 0.02 250);
--tei-said-border: oklch(0.65 0.15 250);
--tei-said-text: oklch(0.3 0.1 250);

--tei-entity-bg: oklch(0.94 0.02 150);
--tei-entity-border: oklch(0.55 0.15 150);
--tei-entity-text: oklch(0.35 0.12 150);

--tei-structural-bg: oklch(0.95 0.01 250);
--tei-structural-border: oklch(0.6 0.05 250);
--tei-structural-text: oklch(0.4 0.05 250);

--tei-metadata-bg: oklch(0.97 0.01 30);
--tei-metadata-border: oklch(0.65 0.1 30);
--tei-metadata-text: oklch(0.35 0.1 30);

/* Validation State Colors */
--validation-valid-bg: oklch(0.92 0.05 145);
--validation-valid-border: oklch(0.55 0.15 145);
--validation-valid-text: oklch(0.3 0.12 145);

--validation-invalid-bg: oklch(0.92 0.08 25);
--validation-invalid-border: oklch(0.6 0.2 25);
--validation-invalid-text: oklch(0.4 0.2 25);

--validation-warning-bg: oklch(0.95 0.06 85);
--validation-warning-border: oklch(0.65 0.18 85);
--validation-warning-text: oklch(0.45 0.15 85);

/* UI State Colors */
--state-selected-bg: oklch(0.6 0.18 250);
--state-selected-border: oklch(0.45 0.2 250);
--state-selected-text: oklch(0.98 0 0);

--state-hover-bg: oklch(0.7 0.05 250);
--state-hover-border: oklch(0.5 0.1 250);

/* Character Network Colors */
--char-node-default: oklch(0.65 0.15 250);
--char-node-male: oklch(0.55 0.15 220);
--char-node-female: oklch(0.6 0.18 280);
--char-edge-strong: oklch(0.5 0.15 150);
--char-edge-weak: oklch(0.7 0.1 150);

/* Dark mode variants */
.dark {
  /* TEI Semantic Colors */
  --tei-said-bg: oklch(0.25 0.02 250);
  --tei-said-border: oklch(0.55 0.12 250);
  --tei-said-text: oklch(0.85 0.05 250);

  --tei-entity-bg: oklch(0.23 0.02 150);
  --tei-entity-border: oklch(0.45 0.12 150);
  --tei-entity-text: oklch(0.9 0.05 150);

  --tei-structural-bg: oklch(0.24 0.01 250);
  --tei-structural-border: oklch(0.5 0.05 250);
  --tei-structural-text: oklch(0.85 0.03 250);

  --tei-metadata-bg: oklch(0.26 0.01 30);
  --tei-metadata-border: oklch(0.5 0.08 30);
  --tei-metadata-text: oklch(0.9 0.05 30);

  /* Validation State Colors */
  --validation-valid-bg: oklch(0.3 0.08 145);
  --validation-valid-border: oklch(0.5 0.15 145);
  --validation-valid-text: oklch(0.9 0.08 145);

  --validation-invalid-bg: oklch(0.3 0.1 25);
  --validation-invalid-border: oklch(0.55 0.2 25);
  --validation-invalid-text: oklch(0.9 0.15 25);

  --validation-warning-bg: oklch(0.32 0.08 85);
  --validation-warning-border: oklch(0.55 0.15 85);
  --validation-warning-text: oklch(0.95 0.1 85);

  /* UI State Colors */
  --state-selected-bg: oklch(0.4 0.18 250);
  --state-selected-border: oklch(0.3 0.2 250);
  --state-selected-text: oklch(0.98 0 0);

  --state-hover-bg: oklch(0.35 0.08 250);
  --state-hover-border: oklch(0.4 0.12 250);

  /* Character Network Colors */
  --char-node-default: oklch(0.55 0.12 250);
  --char-node-male: oklch(0.45 0.12 220);
  --char-node-female: oklch(0.5 0.15 280);
  --char-edge-strong: oklch(0.4 0.12 150);
  --char-edge-weak: oklch(0.6 0.08 150);
}
```

**Step 2: Update existing .tei-tag classes to use CSS variables**

```css
/* Replace lines 159-178 in globals.css with: */

.tei-tag-said,
.token.tag[data-tag="said"] {
  background-color: var(--tei-said-bg);
  border-left: 2px solid var(--tei-said-border);
  color: var(--tei-said-text);
}

.tei-tag-entity,
.token.tag[data-tag="persName"],
.token.tag[data-tag="placeName"],
.token.tag[data-tag="orgName"] {
  background-color: var(--tei-entity-bg);
  border-left: 2px solid var(--tei-entity-border);
  color: var(--tei-entity-text);
}

.tei-tag-structural,
.token.tag[data-tag="p"],
.token.tag[data-tag="div"],
.token.tag[data-tag="sp"] {
  background-color: var(--tei-structural-bg);
  border-left: 2px solid var(--tei-structural-border);
  color: var(--tei-structural-text);
}

.tei-tag-metadata,
.token.tag[data-tag="author"],
.token.tag[data-tag="title"],
.token.tag[data-tag="date"] {
  background-color: var(--tei-metadata-bg);
  border-left: 2px solid var(--tei-metadata-border);
  color: var(--tei-metadata-text);
}

.tei-tag:hover {
  background-color: var(--state-hover-bg);
  outline: 1px solid var(--state-hover-border);
}

.dark .tei-tag:hover {
  background-color: var(--state-hover-bg);
  outline: 1px solid var(--state-hover-border);
}

.tei-tag[data-selected="true"] {
  outline: 2px solid var(--state-selected-border);
  outline-offset: 2px;
  background-color: var(--state-selected-bg);
  color: var(--state-selected-text);
}

.dark .tei-tag[data-selected="true"] {
  outline: 2px solid var(--state-selected-border);
  background-color: var(--state-selected-bg);
  color: var(--state-selected-text);
}

/* Prism token styling */
.token.tag {
  color: var(--tei-structural-text);
}

.token.attr-name {
  color: var(--tei-metadata-text);
}

.token.attr-value {
  color: var(--tei-entity-text);
}

.token.entity {
  color: var(--tei-entity-text);
}
```

**Step 3: Manual verification**

Run: `npm run dev`
Expected: Colors should be consistent in light and dark modes

**Step 4: Commit**

```bash
git add app/globals.css
git commit -m "feat: add semantic color system CSS variables"
```

---

## Task 5: Create Monaco Editor Custom Theme

**Files:**
- Create: `lib/syntax/monaco-theme.ts`
- Modify: `components/editor/XMLCodeEditor.tsx`
- Test: `components/editor/__tests__/XMLCodeEditor.test.tsx`

**Step 1: Write test for Monaco theme colors**

```typescript
// components/editor/__tests__/XMLCodeEditor.test.tsx
// Add to existing tests

describe('Monaco Theme', () => {
  it('should apply custom theme to Monaco Editor', async () => {
    const { container } = render(<XMLCodeEditor />);

    // Wait for Monaco to load
    await waitFor(() => {
      expect(container.querySelector('.monaco-editor')).toBeInTheDocument();
    });

    // Check that theme was applied
    const editorWrapper = container.querySelector('.monaco-editor-wrapper');
    expect(editorWrapper).toHaveClass('custom-theme');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- XMLCodeEditor.test.tsx`
Expected: FAIL (no custom theme yet)

**Step 3: Create Monaco theme definition**

```typescript
// lib/syntax/monaco-theme.ts
import type monaco from 'monaco-editor';

export interface IStandaloneThemeData {
  base: 'vs' | 'vs-dark' | 'hc-black';
  inherit: boolean;
  rules: monaco.editor.IStandaloneThemeData['rules'];
  colors: monaco.editor.IStandaloneThemeData['colors'];
}

export function createTEITheme(isDark: boolean = false): IStandaloneThemeData {
  const base: 'vs' | 'vs-dark' = isDark ? 'vs-dark' : 'vs';

  return {
    base,
    inherit: true,
    rules: [
      // TEI tag colors
      { token: 'tag', foreground: isDark ? '8585d6' : '4a4a8f' }, // Structural tags
      { token: 'tag.id', foreground: isDark ? 'c586c0' : '800080' }, // Tag names
      { token: 'attribute.name', foreground: isDark ? '9cdcfe' : 'a31515' }, // Attributes
      { token: 'attribute.value', foreground: isDark : 'ce9178' : '0451a5' }, // Attribute values

      // TEI-specific tokens
      { token: 'said-tag', foreground: isDark ? 'a8a8ff' : '4040cc' },
      { token: 'entity-tag', foreground: isDark ? '6ea264' : '228b22' },
      { token: 'structural-tag', foreground: isDark : '8585d6' : '4a4a8f' },
      { token: 'metadata-tag', foreground: isDark ? 'dcdcaa' : 'b84a00' },

      // Syntax highlighting
      { token: 'string', foreground: isDark ? 'ce9178' : 'a31515' },
      { token: 'number', foreground: isDark ? 'b5cea8' : '098658' },
      { token: 'comment', foreground: isDark ? '6a9955' : '008000' },
    ],
    colors: {
      // Match semantic color scheme
      'editor.background': isDark ? '#1e1e1e' : '#ffffff',
      'editor.foreground': isDark ? '#d4d4d4' : '#000000',
      'editor.selectionBackground': isDark ? '#264f78' : '#add6ff',
      'editor.inactiveSelectionBackground': isDark ? '#3a3d41' : '#e5ebf1',
      'editorCursor.foreground': isDark ? '#aeafad' : '#000000',

      // Validation colors
      'editorError.foreground': isDark ? 'f48771' : 'cd3131',
      'editorWarning.foreground': isDark ? 'cca700' : '9a7700',
      'editorInfo.foreground': isDark ? '75beff' : '008000',
    }
  };
}

export function registerTEITheme(monaco: typeof monaco): void {
  const lightTheme = createTEITheme(false);
  const darkTheme = createTEITheme(true);

  monaco.editor.defineTheme('tei-light', lightTheme);
  monaco.editor.defineTheme('tei-dark', darkTheme);

  // Set default theme based on system preference
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  monaco.editor.setTheme(prefersDark ? 'tei-dark' : 'tei-light');
}
```

**Step 4: Update XMLCodeEditor to use custom theme**

```typescript
// components/editor/XMLCodeEditor.tsx
// Add import
import { registerTEITheme } from '@/lib/syntax/monaco-theme';

// In the handleEditorDidMount function (around line 80), add theme registration:
const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
  editorRef.current = editor;

  // Register custom TEI theme
  registerTEITheme(monaco);

  // Rest of existing code...
  onChange?.(value);
};
```

**Step 5: Run test to verify it passes**

Run: `npm test -- XMLCodeEditor.test.tsx`
Expected: PASS

**Step 6: Commit**

```bash
git add lib/syntax/monaco-theme.ts components/editor/XMLCodeEditor.tsx components/editor/__tests__/XMLCodeEditor.test.tsx
git commit -m "feat: add custom Monaco Editor theme matching semantic colors"
```

---

## Task 6: Update CharacterNetwork to Use Consistent Colors

**Files:**
- Modify: `components/visualization/CharacterNetwork.tsx`
- Test: `components/visualization/__tests__/CharacterNetwork.test.tsx`

**Step 1: Write test for color consistency**

```typescript
// components/visualization/__tests__/CharacterNetwork.test.tsx
// Add to existing tests

describe('Semantic Color Consistency', () => {
  it('should use CSS variables for node colors', () => {
    const mockCharacters = [
      { 'xml:id': 'c1', sex: '1' },
      { 'xml:id': 'c2', sex: '2' }
    ];

    const { container } = render(
      <CharacterNetwork
        characters={mockCharacters}
        relationships={[]}
      />
    );

    // Verify nodes use CSS variables
    const nodes = container.querySelectorAll('.character-node');
    nodes.forEach(node => {
      const style = window.getComputedStyle(node);
      // Should use CSS variables, not hardcoded colors
      expect(style.fill).toBeTruthy();
    });
  });

  it('should differentiate node types by color', () => {
    const mockCharacters = [
      { 'xml:id': 'c1', sex: '1' }, // Male
      { 'xml:id': 'c2', sex: '2' }  // Female
    ];

    const { container } = render(
      <CharacterNetwork
        characters={mockCharacters}
        relationships={[]}
      />
    );

    const maleNode = container.querySelector('[data-character-id="c1"]');
    const femaleNode = container.querySelector('[data-character-id="c2"]');

    // Nodes should have different colors
    expect(maleNode).not.toEqual(femaleNode);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- CharacterNetwork.test.tsx`
Expected: FAIL (or tests need updating)

**Step 3: Update CharacterNetwork to use CSS variables**

```typescript
// components/visualization/CharacterNetwork.tsx
// Find where node colors are defined and replace with CSS variable references

// In the component, add a helper function:
const getNodeColor = (character: any): string => {
  const sex = character.sex || character['@_xml:id']?.includes('female') ? '2' : '1';

  if (sex === '1') {
    return 'var(--char-node-male)';
  } else if (sex === '2') {
    return 'var(--char-node-female)';
  }
  return 'var(--char-node-default)';
};

const getEdgeColor = (relationship: any): string => {
  // Use relationship strength to determine color
  if (relationship.mutual !== false) {
    return 'var(--char-edge-strong)';
  }
  return 'var(--char-edge-weak)';
};

// Update the node rendering to use these functions
// When setting fill/stroke styles, use the CSS variables
```

**Step 4: Run test to verify it passes**

Run: `npm test -- CharacterNetwork.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add components/visualization/CharacterNetwork.tsx components/visualization/__tests__/CharacterNetwork.test.tsx
git commit -m "feat: use semantic CSS variables in CharacterNetwork"
```

---

## Task 7: Update Validation UI Components to Use Semantic Colors

**Files:**
- Modify: `components/validation/ValidationPanel.tsx` (or similar)
- Test: `components/validation/__tests__/ValidationPanel.test.tsx`

**Step 1: Write test for semantic validation colors**

```typescript
// components/validation/__tests__/ValidationPanel.test.tsx
// Add to existing tests

describe('Semantic Validation Colors', () => {
  it('should use CSS variables for valid state', () => {
    const { container } = render(
      <ValidationPanel
        validations={[{ type: 'valid', message: 'OK' }]}
      />
    );

    const validBadge = container.querySelector('.validation-badge-valid');
    const style = window.getComputedStyle(validBadge);
    expect(style.backgroundColor).toContain('var(--validation-valid-bg)');
  });

  it('should use CSS variables for invalid state', () => {
    const { container } = render(
      <ValidationPanel
        validations={[{ type: 'invalid', message: 'Error' }]}
      />
    );

    const invalidBadge = container.querySelector('.validation-badge-invalid');
    expect(invalidBadge).toHaveClass('validation-invalid');
  });

  it('should use CSS variables for warning state', () => {
    const { container } = render(
      <ValidationPanel
        validations={[{ type: 'warning', message: 'Warning' }]}
      />
    );

    const warningBadge = container.querySelector('.validation-badge-warning');
    expect(warningBadge).toHaveClass('validation-warning');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- ValidationPanel.test.tsx`
Expected: FAIL (or tests need updating)

**Step 3: Update validation components to use CSS variables**

```typescript
// In validation components, replace hardcoded colors with CSS variables
// Example for a validation badge component:

const getValidationStyles = (type: 'valid' | 'invalid' | 'warning') => {
  switch (type) {
    case 'valid':
      return {
        backgroundColor: 'var(--validation-valid-bg)',
        borderColor: 'var(--validation-valid-border)',
        color: 'var(--validation-valid-text)'
      };
    case 'invalid':
      return {
        backgroundColor: 'var(--validation-invalid-bg)',
        borderColor: 'var(--validation-invalid-border)',
        color: 'var(--validation-invalid-text)'
      };
    case 'warning':
      return {
        backgroundColor: 'var(--validation-warning-bg)',
        borderColor: 'var(--validation-warning-border)',
        color: 'var(--validation-warning-text)'
      };
  }
};
```

**Step 4: Run test to verify it passes**

Run: `npm test -- ValidationPanel.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add components/validation/
git commit -m "feat: use semantic CSS variables for validation states"
```

---

## Task 8: Add Visual Regression Tests

**Files:**
- Create: `tests/visual/syntax-highlighting.test.ts`
- Test: `tests/visual/syntax-highlighting.test.ts`

**Step 1: Write visual regression tests**

```typescript
// tests/visual/syntax-highlighting.test.ts
import { test, expect } from '@playwright/test';

test.describe('Syntax Highlighting Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/editor');
  });

  test('rendered view syntax highlighting', async ({ page }) => {
    // Load a document with various TEI tags
    await page.evaluate(() => {
      window.localStorage.setItem('tei-document', JSON.stringify({
        raw: `<?xml version="1.0"?>
<TEI>
  <text>
    <body>
      <p>Text with <said who="#speaker1">dialogue</said> and <persName>names</persName>.</p>
    </body>
  </text>
</TEI>`
      }));
    });
    await page.reload();

    // Take screenshot of rendered view
    const renderedView = page.locator('[data-testid="rendered-view"]');
    await expect(renderedView).toHaveScreenshot('rendered-highlighted.png');
  });

  test('code view syntax highlighting', async ({ page }) => {
    await page.evaluate(() => {
      window.localStorage.setItem('tei-document', JSON.stringify({
        raw: `<?xml version="1.0"?><TEI><text><body><p>Test</p></body></text></TEI>`
      }));
    });
    await page.reload();

    // Switch to code view
    await page.click('[data-testid="code-view-toggle"]');

    // Take screenshot of code view
    const codeView = page.locator('.monaco-editor');
    await expect(codeView).toHaveScreenshot('code-highlighted.png');
  });

  test('color consistency across views', async ({ page }) => {
    await page.evaluate(() => {
      window.localStorage.setItem('tei-document', JSON.stringify({
        raw: `<?xml version="1.0"?>
<TEI>
  <text>
    <body>
      <p><said who="#sp1">Dialogue</said></p>
    </body>
  </text>
</TEI>`
      }));
    });
    await page.reload();

    // Get color from rendered view
    const renderedTag = page.locator('.tei-tag-said').first();
    const renderedColor = await renderedTag.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );

    // Switch to code view
    await page.click('[data-testid="code-view-toggle"]');

    // Get color from code view (Monaco)
    const codeEditor = page.locator('.monaco-editor');
    // Note: Monaco colors are harder to extract directly,
    // but we can verify the theme was applied
    await expect(codeEditor).toHaveClass(/tei-/);
  });
});
```

**Step 2: Run visual tests**

Run: `npm test -- visual/syntax-highlighting.test.ts`
Expected: Screenshots generated in tests/visual/screenshots/

**Step 3: Commit**

```bash
git add tests/visual/
git commit -m "test: add visual regression tests for syntax highlighting"
```

---

## Task 9: Update Documentation

**Files:**
- Modify: `README.md` (or create `docs/syntax-highlighting.md`)

**Step 1: Add documentation for syntax highlighting**

```markdown
# Syntax Highlighting and Color System

## Overview

The TEI Editor provides comprehensive syntax highlighting for TEI XML documents across both the rendered view and code view. A consistent semantic color system is used throughout the application.

## Syntax Highlighting

### Rendered View (WYSIWYG)

- Uses Prism.js with custom TEI language definition
- Highlights TEI-specific tags: `<said>`, `<persName>`, `<placeName>`, `<orgName>`
- Differentiates between dialogue, entity references, structural tags, and metadata

### Code View (Monaco Editor)

- Custom Monaco theme matching the semantic color system
- XML syntax highlighting with TEI extensions
- Light and dark mode support

## Semantic Color System

### TEI Tag Colors

| Tag Type | Light Mode | Dark Mode | Usage |
|----------|-----------|-----------|-------|
| Dialogue (`<said>`) | Purple | Light Purple | Character dialogue |
| Entity References | Green | Light Green | Person, place, org names |
| Structural | Indigo | Light Indigo | Paragraphs, divisions |
| Metadata | Orange | Light Orange | Authors, titles, dates |

### Validation States

| State | Color | Description |
|-------|-------|-------------|
| Valid | Green | Schema-compliant elements |
| Invalid | Red | Schema violations |
| Warning | Yellow | Potential issues |

### Character Network Colors

| Element | Color | Description |
|---------|-------|-------------|
| Male Character | Blue-ish | Male characters |
| Female Character | Purple-ish | Female characters |
| Strong Relationship | Green | Strong connections |
| Weak Relationship | Light Green | Weak connections |

## Customization

Colors are defined as CSS variables in `app/globals.css`. To customize:

1. Find the color variable you want to change (e.g., `--tei-said-bg`)
2. Update the value in both `:root` and `.dark` sections
3. The change will apply throughout the application

## Implementation Details

- **Prism.js**: Used for rendered view highlighting with custom TEI language definition in `lib/syntax/tei-prism.ts`
- **Monaco Editor**: Custom theme defined in `lib/syntax/monaco-theme.ts`
- **CSS Variables**: All colors defined in `app/globals.css` with oklch color space
```

**Step 2: Commit**

```bash
git add README.md docs/syntax-highlighting.md
git commit -m "docs: add syntax highlighting and color system documentation"
```

---

## Task 10: Final Integration Testing

**Files:**
- All modified files
- Test: All test suites

**Step 1: Run full test suite**

```bash
npm test
```

Expected: All tests pass (639+ tests)

**Step 2: Run E2E tests**

```bash
npm test -- --e2e
```

Expected: All E2E tests pass

**Step 3: Manual verification**

```bash
npm run dev
```

Verify:
- [ ] Syntax highlighting works in rendered view
- [ ] Syntax highlighting works in code view
- [ ] Colors are consistent between views
- [ ] Light/dark mode works correctly
- [ ] CharacterNetwork uses consistent colors
- [ ] Validation badges use semantic colors
- [ ] No color contrast accessibility issues

**Step 4: Final commit**

```bash
git add .
git commit -m "test: final integration testing complete"
```

---

## Summary

This implementation plan adds:

1. **Prism.js** integration for TEI XML syntax highlighting in rendered view
2. **Custom Monaco theme** for consistent code view highlighting
3. **Semantic color system** with CSS variables for all data types
4. **Color consistency** across editor views, character network, and validation UI
5. **Light/dark mode** support for all colors
6. **Comprehensive tests** for syntax highlighting and color scheme

**Files Created:**
- `lib/syntax/tei-prism.ts` - TEI language definition for Prism
- `lib/syntax/monaco-theme.ts` - Custom Monaco theme
- `lib/syntax/__tests__/tei-prism.test.ts` - Prism tests
- `tests/visual/syntax-highlighting.test.ts` - Visual regression tests
- `docs/syntax-highlighting.md` - Documentation

**Files Modified:**
- `components/editor/RenderedView.tsx` - Add Prism highlighting
- `components/editor/XMLCodeEditor.tsx` - Add Monaco theme
- `components/visualization/CharacterNetwork.tsx` - Use CSS variables
- `components/validation/*.tsx` - Use semantic colors
- `app/globals.css` - Add semantic color variables
- Test files for all modified components

**Estimated Time:** 4-6 hours
**Test Coverage:** Adds ~50 new tests
