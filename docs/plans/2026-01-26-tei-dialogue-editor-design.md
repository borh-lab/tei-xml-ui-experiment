# TEI Dialogue Editor - Design Document

**Date:** 2026-01-26
**Status:** Design Phase
**Author:** Generated via Claude Code brainstorming session

## 1. Overview

A web-based tool for annotating novel dialogue in TEI XML, with support for both converting plaintext to TEI and editing existing TEI files. The tool focuses on extracting, tagging, and analyzing conversational passages in literary texts, with emphasis on dialogue attribution to characters using TEI's `<said>` and `<persName>` elements.

### 1.1 Primary Goals

- **Hybrid Workflow**: Equally support plaintext-to-TEI conversion and existing TEI enhancement
- **Flexible AI Integration**: Multiple AI approaches (suggestions, full auto-detection, manual-first, rule-based)
- **Standards Compliant**: Full TEI P5 support with optional Relax NG validation
- **Multi-User Audience**: Serve DH scholars, students, and archivists with appropriate complexity levels
- **Local-First Architecture**: Run entirely in browser with optional server-side features

### 1.2 Key Features

- Split-pane editor with rendered view and live TEI source preview
- AI-assisted dialogue detection and speaker attribution
- Character management with progressive complexity (basic → full prosopography)
- Visualization dashboard: dialogue statistics, social network graphs, character-focused views
- Support for full TEI XML input/output with HTML export
- Client-first architecture with optional API validation

## 2. Architecture

### 2.1 Overall Structure

The application is a **single-page React application** using TypeScript, organized around a central document state. The architecture follows a **unidirectional data flow** pattern using React Context and hooks.

**Core Document Model:**
- `TEIDocument` class maintains both raw XML and parsed object representation
- All edits flow through this central state
- Automatic serialization back to valid TEI XML

**Three Processing Layers:**
1. **Parsing Layer**: TEI XML ↔ JavaScript objects using fast-xml-parser
2. **Annotation Layer**: Editing interface, user interactions, AI integration
3. **Visualization Layer**: Statistics, network graphs, character views

**Validation Strategy:**
- Client-side: Well-formedness checks, basic TEI validation
- Optional server-side: Full Relax NG validation via API
- Progressive enhancement approach

### 2.2 Deployment

- **Primary**: Web app (can run locally via `npm run dev` or static hosting)
- **Optional**: Electron wrapper for desktop packaging
- **Server**: Optional validation/AI API (not required for core functionality)

## 3. Core Components and UI Structure

### 3.1 Editor View (Primary Interface)

Split-pane layout:
- **Left Pane**: Rendered text view with dialogue highlights
  - Click text to select passages
  - Floating toolbar for TEI tag application
  - Visual distinction for dialogue passages
- **Right Pane**: Live TEI source preview
  - Syntax highlighting via Monaco Editor
  - Bidirectional sync with rendered view
- **Bottom Panel**: Context-sensitive element inspector

### 3.2 Character Management View

Progressive interface:
- **Basic Mode**: Simple character name list
- **Advanced Mode**: Full TEI `listPerson` editor
  - `persName`, dates, biographical notes
  - XML ID management for speaker attribution
- Auto-suggestions based on existing dialogue tags

### 3.3 Analysis Dashboard

Four visualization panels:
1. **Dialogue Statistics**: Distribution per chapter, character speech counts (D3.js, Recharts)
2. **Social Network Graph**: Character interaction network (React Flow)
3. **Character Dialogue Browser**: Filter by character, view speeches with context
4. **Timeline View**: Dialogue occurrence throughout novel

### 3.4 Project Management

For handling multiple files:
- File upload (.txt or .xml)
- Batch processing queue
- Export options (TEI XML, HTML)

### 3.5 AI Assistant Panel

Floating panel available in all views:
- Dialogue detection suggestions
- Speaker attribution predictions
- Consistency validation

## 4. Data Flow and Processing Pipeline

### 4.1 Input Stage

**Plaintext Mode:**
1. Upload .txt file
2. Optional AI pre-processing suggests paragraphs and dialogue
3. Load into editor as unparsed text

**TEI Mode:**
1. Parse uploaded .xml using fast-xml-parser
2. Validate basic TEI structure
3. Create TEIDocument object model

### 4.2 Core Data Model

```typescript
class TEIDocument {
  rawXML: string;              // Source representation
  parsed: object;              // Queryable object model
  metadata: object;            // Header information
  changes: ChangeHistory[];    // Undo/redo stack

  // Query methods
  getDivisions(): Division[];
  getDialogue(): SaidElement[];
  getCharacters(): Person[];

  // Manipulation
  applyTag(selection, tag, attrs): void;
  serialize(): string;
}
```

### 4.3 Annotation Flow

1. User selects text in rendered view
2. Floating toolbar offers relevant tags (`<said>`, `<q>`, `<persName>`)
3. User selects tag and sets attributes (`@who`, `@direct`, `@aloud`)
4. Change applies to parsed model → rawXML regenerates
5. Both views update immediately

### 4.4 AI Integration

Pluggable provider interface:

```typescript
interface AIProvider {
  detectDialogue(text: string): Promise<DialogueSpan[]>;
  attributeSpeaker(context: string, characters: Character[]): Promise<string>;
  validateConsistency(document: TEIDocument): Promise<Issue[]>;
}
```

Supported providers:
- OpenAI (GPT-4)
- Anthropic (Claude)
- Local models via Ollama
- Rule-based/regex detection

### 4.5 Output Generation

- **TEI XML**: Direct serialization from document model
- **HTML**: Apply TEI-to-XSLT stylesheets (built-in or TEI P5)
- **Statistics**: JSON/CSV export for external analysis

## 5. Error Handling and Validation

### 5.1 Multi-Level Validation

**Level 1: Real-time Well-Formedness (Client)**
- Balanced tags, proper attributes, valid UTF-8
- Browser's DOMParser for basic XML validation
- Inline error markers in source pane
- Non-blocking warnings vs. blocking errors

**Level 2: TEI Structural Validation (Client)**
- `<div>` hierarchy integrity
- Required attributes (`@who` on `<said>`)
- ID references valid (`@who` → `xml:id`)
- Namespace correctness

**Level 3: Schema Validation (Optional API)**
- Full TEI Relax NG validation
- Against TEI All, TEI Simple, or custom ODD
- Detailed validation reports
- User-selectable schema

### 5.2 Error UX

- **Severity Levels**: Critical → Warning → Info
- **Error Panel**: Scrollable list with jump-to-location
- **Auto-fix Suggestions**: One-click fixes for common errors
- **Graceful Degradation**: Works with reduced validation if API unavailable

### 5.3 Recovery Mechanisms

- **Auto-save**: Every 30 seconds to localStorage + downloadable backup
- **Undo/Redo**: Full history stack, persists across sessions
- **Conflict Resolution**: Diff view for version conflicts
- **Safe Mode**: Recovery attempts for corrupted XML

### 5.4 AI-Assisted Error Correction

AI suggestions for common issues:
- Missing `@who` attributes
- Duplicate character entries
- Inconsistent encoding patterns

## 6. Testing Strategy

### 6.1 Unit Testing (Jest + React Testing Library)

- Core `TEIDocument` class (parse/serialize cycles, query methods)
- XML manipulation utilities
- Component logic (character management, tag selection)
- Individual UI components

### 6.2 Integration Testing

- End-to-end workflows (upload → annotate → export)
- AI integration with mock responses
- File I/O round-trips
- Cross-component communication

### 6.3 Validation Testing with Real Corpora

Test against actual TEI examples:
- Wright American Fiction (TEI P4→P5 patterns)
- Victorian Women Writers Project (different encoding approaches)
- Christof Schöch's French novels (clean, simple structures)

### 6.4 Visual Regression Testing (Playwright)

- Screenshot comparison of rendered TEI output
- Dialogue highlighting consistency
- Visualization rendering

### 6.5 TEI Compliance Testing

- Generate test files covering all novel-specific elements
- Validate against TEI P5 schemas
- Test edge cases (nested `<floatingText>`, complex `<said>` attributes)

### 6.6 AI Testing

- Unit tests for AI provider interface
- Integration tests with actual APIs (test tokens)
- Accuracy measurement against manually tagged corpus

### 6.7 Continuous Testing

- GitHub Actions/GitLab CI for automated testing
- Run on every PR
- Deploy preview builds for manual testing

## 7. Technical Stack

### 7.1 Frontend

- **Framework**: Next.js 14+ (App Router) with TypeScript
- **State Management**: React Context + hooks (global), Zustand (local)
- **Styling**: TailwindCSS + shadcn/ui components
- **Editors**: Monaco Editor (source view), CodeMirror 6 (annotations)

### 7.2 TEI/XML Processing

- **fast-xml-parser**: Browser-compatible XML parsing
- **xmldom**: DOM manipulation
- **Saxon-JS** or **xslt-js**: XSLT transforms for HTML export
- **Custom TEI utilities**: Wrapper functions for TEI-specific operations

### 7.3 Visualizations

- **D3.js**: Custom charts (dialogue statistics, timelines)
- **React Flow**: Social network graphs
- **Recharts**: Simple bar/line charts

### 7.4 AI Integration

- **Vercel AI SDK**: Unified provider interface
- Support: OpenAI, Anthropic, Ollama (local)
- Pluggable architecture

### 7.5 File Processing

- **JSZip**: Multi-file projects
- **File System Access API**: Direct file system access (modern browsers)
- **Download.js**: Fallback for older browsers

### 7.6 Optional Backend

- **Framework**: FastAPI (Python) or Express (Node.js)
- **Validation**: lxml (Python) or libxmljs (Node.js)
- **Deployment**: Containerized (Docker)

### 7.7 Build Tooling

- **Turbopack**: Fast builds (via Next.js)
- **Playwright**: E2E testing
- **Vitest**: Unit testing

## 8. Project Structure

```
tei-dialogue-editor/
├── app/                    # Next.js app router
│   ├── editor/            # Editor page
│   ├── characters/        # Character management
│   ├── analysis/          # Visualization dashboard
│   └── projects/          # Project management
├── components/
│   ├── editor/           # Editor components
│   │   ├── RenderedView.tsx
│   │   ├── SourceView.tsx
│   │   ├── TagToolbar.tsx
│   │   └── ElementInspector.tsx
│   ├── visualization/    # Charts and graphs
│   │   ├── DialogueStats.tsx
│   │   ├── NetworkGraph.tsx
│   │   ├── CharacterBrowser.tsx
│   │   └── TimelineView.tsx
│   ├── character/        # Character management
│   │   ├── CharacterList.tsx
│   │   ├── PersonEditor.tsx
│   │   └── ProsopographyView.tsx
│   └── shared/           # Shared UI components
├── lib/
│   ├── tei/              # TEI processing
│   │   ├── parser.ts
│   │   ├── serializer.ts
│   │   ├── TEIDocument.ts
│   │   └── queries.ts
│   ├── ai/               # AI integration
│   │   ├── providers.ts
│   │   ├── openai.ts
│   │   ├── claude.ts
│   │   └── ollama.ts
│   ├── validation/       # Client-side validation
│   │   ├── wellformed.ts
│   │   ├── tei-structure.ts
│   │   └── schematron.ts
│   └── utils/            # General utilities
├── public/
│   ├── schemas/          # TEI Relax NG schemas
│   └── xslt/             # TEI Stylesheets for export
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

## 9. Implementation Phases

### Phase 1: Core Editor (MVP)
- Basic TEI parsing and serialization
- Split-pane editor (rendered + source)
- Manual dialogue tagging with `<said>` and `<q>`
- File upload/download

### Phase 2: Character Management
- Basic character list
- Speaker attribution with `@who`
- Auto-generate `listPerson` from dialogue

### Phase 3: AI Integration
- AI provider interface
- Dialogue detection
- Speaker attribution suggestions

### Phase 4: Visualizations
- Dialogue statistics
- Character dialogue browser
- Network graph (Phase 4.5)

### Phase 5: Advanced Features
- Full prosopography editor
- Batch processing
- HTML export
- Social network graph
- Optional validation API

## 10. Success Criteria

- Successfully load and parse real TEI novel files from reference corpora
- Accurately detect dialogue with AI assistance (target: >90% precision)
- Export valid TEI XML that passes Relax NG validation
- Intuitive enough for students to use with minimal training
- Powerful enough for DH scholars to do real work
- Can run entirely offline (except AI features)
- Performance: Handle novels up to ~500k words smoothly in browser

## 11. Open Questions

1. **AI Model Selection**: Which model works best for dialogue detection in historical novels?
2. **Validation API**: Host our own or use existing TEI validation services?
3. **TEI Customization**: Ship with TEI All, TEI Simple, or create a custom "novels" ODD?
4. **Offline AI**: Explore local models (Ollama) for fully offline workflow?
5. **Corpus Testing**: Which specific texts from the reference repos should we prioritize for testing?

## 12. References

- TEI P5 Guidelines: https://tei-c.org/guidelines/p5/
- TEI Simple: https://www.tei-c.org/Activities/Simple/
- Wright American Fiction: https://github.com/iulibdcs/Wright-American-Fiction
- Victorian Women Writers Project: https://github.com/iulibdcs/Victorian-Women-Writers-Project
- Christof Schöch's TEI texts: https://github.com/christofs/tei-texts
