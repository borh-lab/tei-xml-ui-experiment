# TEI Dialogue Editor - Enhanced Features Design Document

**Date:** 2026-01-26
**Status:** Design Phase
**Author:** Generated via Claude Code brainstorming session

## 1. Overview

This document describes comprehensive enhancements to the TEI Dialogue Editor, focusing on annotation efficiency, AI-assisted tagging, intelligent learning, and advanced visualizations. The enhancements build on the completed MVP to create a production-ready tool for digital humanities scholars.

### 1.1 Enhancement Goals

- **Annotation Efficiency**: AI-assisted auto-tagging, comprehensive keyboard shortcuts, bulk operations
- **Smart Learning**: Pattern-based speaker recognition with Ax-structured generation
- **Ready Samples**: Hybrid gallery (prepared examples + live corpus access)
- **Rich Visualizations**: Character networks, timelines, statistics dashboards, comparative analysis
- **Developer Experience**: Nix flakes with Playwright, comprehensive testing, type-safe AI integration

### 1.2 Key Features

**Annotation Enhancements:**

- Configurable AI modes (Manual/Suggest/Auto)
- Comprehensive keyboard shortcuts (Vim/Emacs modes)
- Bulk tagging operations with multi-select
- Quick speaker assignment (1-9 keys)
- Navigation commands (jump, filter, outline)

**AI Integration:**

- Ax framework for structured generation
- Multi-provider support (OpenAI, Anthropic, Google, etc.)
- Pattern-based speaker recognition (Rust WASM)
- Adaptive learning from user corrections
- Confidence scoring and validation

**Sample Gallery:**

- 5 prepared examples with pre-tagged dialogue
- Live corpus integration (Wright American Fiction)
- Tutorial mode with inline guidance
- Export/import custom samples

**Visualizations:**

- Interactive character dialogue network
- Timeline visualization with filtering
- Statistics dashboard with export
- Comparative analysis across novels

## 2. Overall Architecture

### 2.1 Design Philosophy

**"Progressive automation with user always in control"**

Users can start with manual annotation, enable AI suggestions, or request full auto-annotation - and switch between modes at any time. The system learns from corrections using lightweight pattern-based heuristics, enhanced with Ax structured generation for complex cases.

### 2.2 Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    UI Layer                                 │
│  Split-pane editor | Command palette | Bulk operations     │
│  Keyboard shortcuts | Sample gallery | Visualizations      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Annotation Orchestration Layer                 │
│  Mode switcher | Selection manager | Learning controller   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   AI & Learning Layer                       │
│  Ax providers | Pattern engine (WASM) | Learning DB        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Core TEI Processing                        │
│  TEIDocument | Query methods | Serialization              │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Technical Stack

**New Dependencies:**

```json
{
  "dependencies": {
    "@ax-llm/ax": "^1.x",
    "@ax-llm/ax-ai-sdk-provider": "^1.x",
    "react-hotkeys-hook": "^4.x",
    "react-flow-renderer": "^11.x",
    "d3": "^7.x",
    "recharts": "^2.x",
    "dexie": "^4.x",
    "cmdk": "^1.x"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.x",
    "wasm-pack": "^0.x"
  }
}
```

**Nix Integration:**

- Playwright browsers via `playwright-web-flake`
- Node.js 22 development environment
- All dependencies reproducible

## 3. Annotation Interface Enhancements

### 3.1 Keyboard-First Design

**Global Shortcuts:**

- `Cmd/Ctrl+K`: Open command palette
- `Cmd/Ctrl+S`: Save document
- `Cmd/Ctrl+Z`: Undo
- `Cmd/Ctrl+Shift+Z`: Redo
- `?`: Show keyboard shortcuts help
- `Esc`: Close modal/palette, exit bulk mode

**Navigation Shortcuts:**

- `J`: Next dialogue passage
- `K`: Previous dialogue passage
- `Shift+J/K`: Extend selection (bulk mode)
- `G+G`: Jump to chapter (with chapter selector)
- `Cmd/Ctrl+G`: Go to passage number
- `Cmd/Ctrl+Shift+A`: Select all in current chapter
- `Cmd/Ctrl+Shift+N`: Select all by character

**Tagging Shortcuts:**

- `1-9`: Quick-assign to speakers 1-9
- `T`: Tag current selection (opens tag menu)
- `R`: Remove tag from selection
- `A`: Accept AI suggestion
- `X`: Reject AI suggestion
- `Shift+A`: Accept all visible AI suggestions
- `Shift+X`: Reject all visible AI suggestions

**Customization:**

- Settings panel to remap all shortcuts
- Preset modes: Emacs, Vim, VS Code, Custom
- Export/import shortcut configuration

### 3.2 AI Mode Switcher

Three-position toggle in toolbar:

**Manual Mode:**

- AI completely disabled
- Traditional annotation workflow
- Full manual control

**Suggest Mode:**

- AI highlights passages with dialogue
- Inline suggestions shown with confidence scores
- User accepts/rejects individually
- Pattern engine provides instant suggestions
- Ax provides suggestions for low-confidence cases

**Auto Mode:**

- AI tags entire document
- Color-coded by confidence (green >90%, yellow 70-90%, red <70%)
- User reviews and edits
- Progress indicator shows completion

**Real-Time Mode:**

- As user types/edits, AI updates nearby passages
- Configurable proximity (1-5 paragraphs)
- Background processing, non-blocking
- Toggle on/off per session

### 3.3 Bulk Operations Panel

**Sidebar Panel Features:**

- Toggle button in toolbar or `Cmd/Ctrl+B`
- Multi-selection mode indicator
- Selection counter badge
- Filter options:
  - "Select all untagged dialogue"
  - "Select all low-confidence (<70%)"
  - "Select all by [character]"
  - "Select in current chapter"

**Bulk Actions:**

- "Tag all as [speaker]" (with speaker dropdown)
- "Accept all AI suggestions" (with confidence threshold)
- "Reject all AI suggestions"
- "Export selection to TEI"
- "Export selection statistics"

**Visual Feedback:**

- Selected passages highlighted with accent color
- Border indicator shows selection mode active
- Last action: Undo/redo support
- Selection persists across page navigation

### 3.4 Navigation Enhancements

**Dialogue Outline Panel:**

- Tree view: Volume → Chapter → Dialogue Passages
- Icons indicate status:
  - ✓ Fully tagged
  - ? Partially tagged
  - ⚠ AI suggested (awaiting review)
  - ⦿ Untagged
- Filter buttons:
  - "Show untagged only"
  - "Show by character"
  - "Show low confidence"
- Click passage → scroll editor to location
- Breadcrumb navigation: Chapter → Passage # → Nearest dialogue

**Quick Search:**

- `Cmd/Ctrl+F`: Find passages by text
- `Cmd/Ctrl+Shift+F`: Find by speaker
- Search across entire document or current chapter
- Results in outline panel, jump with Enter/Arrows

## 4. AI Learning and Structured Generation

### 4.1 Pattern-Based Speaker Recognition

**Local Pattern Engine (Rust → WASM):**

High-performance pattern matching compiled to WebAssembly for instant suggestions.

**Pattern Types:**

1. **Recency Pattern:**

   ```
   If current passage within 3 paragraphs of <said who="#X">
   → Suggest X with confidence 0.8
   ```

2. **Chapter Frequency Pattern:**

   ```
   If chapter has 80%+ dialogue from character X
   → Suggest X with confidence proportional to frequency
   ```

3. **Turn-Taking Pattern:**

   ```
   If pattern: A → B → A detected
   → Suggest B after A with confidence 0.7
   ```

4. **Attribution Context Pattern:**
   ```
   If narrative context contains character name mentions
   → Boost confidence for mentioned character
   ```

**WASM Module Interface:**

```rust
// Compiled to pattern-engine.wasm
pub fn detect_speaker_patterns(
    passages: Vec<Passage>,
    current_position: usize,
    pattern_db: &PatternDatabase
) -> Vec<SpeakerSuggestion>

pub fn update_from_feedback(
    pattern_db: &mut PatternDatabase,
    passage: &Passage,
    accepted_speaker: String,
    rejected_speakers: Vec<String>
)

pub fn calculate_confidence(
    pattern_match: &PatternMatch,
    context: &Context
) -> f64
```

**Performance:**

- Pattern matching: <1ms per passage
- Database update: <5ms
- Zero latency for instant suggestions
- No API calls required

### 4.2 Ax Integration for Structured Generation

**Replace OpenAI provider with Ax-powered system:**

```typescript
import { ax, ai } from '@ax-llm/ax';
import { createOpenAI } from '@ax-llm/ax-ai-sdk-provider';

// Configure AI provider (supports all LLMs)
const llm = ai({
  name: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
});

// Alternative providers supported:
// const llm = ai({ name: "anthropic", apiKey: process.env.ANTHROPIC_API_KEY });
// const llm = ai({ name: "google", apiKey: process.env.GOOGLE_API_KEY });
// const llm = ai({ name: "ollama" });  // Local models

// Dialogue detection signature
const dialogueDetector = ax(`
  text:string ->
  passages:array({
    start:number,
    end:number,
    text:string,
    isDialogue:boolean,
    confidence:number,
    reasoning:string
  })
`);

// Speaker attribution signature
const speakerAttributor = ax(`
  passage:string,
  context:string,
  knownSpeakers:array({id:string, name:string, description:string}) ->
  speakerId:string,
  confidence:number,
  reasoning:string
`);

// Usage
const result = await speakerAttributor.forward(llm, {
  passage: '"Hello," she said.',
  context: 'Jane looked at Mr. Rochester...',
  knownSpeakers: [
    { id: 'jane', name: 'Jane Eyre', description: 'Protagonist, governess' },
    { id: 'rochester', name: 'Mr. Rochester', description: 'Byronic hero' },
  ],
});

console.log(result.speakerId); // "jane"
console.log(result.confidence); // 0.92
console.log(result.reasoning); // AI explanation
```

**Prompt Optimization with Ax:**

```typescript
// Few-shot learning with examples
const examples = [
  {
    passage: '"I am," she said.',
    context: 'Jane answered boldly...',
    speakerId: 'jane',
    confidence: 0.95,
    reasoning: 'Direct speech with said verb',
  },
  // ... 3-5 more examples
];

const optimizedAttributor = ax(signature, { examples });
await optimizedAttributor.compile(llm); // MiPRO optimizer
```

**Provider Switching:**

- Settings UI: Select provider (OpenAI, Anthropic, Google, Ollama)
- Cost tracking: Show estimated cost per 1k passages
- Rate limiting: Configurable budget caps
- Fallback: Primary → Secondary → Pattern engine

### 4.3 Pattern Database Structure

**IndexedDB Storage (via Dexie):**

```typescript
interface PatternDatabase {
  speakers: {
    [xmlId: string]: {
      name: string;
      patterns: {
        lastUsed: number; // Timestamp
        positionFrequency: Map<string, number>; // Position patterns
        commonFollowers: string[]; // Who typically speaks after
        commonPreceders: string[]; // Who typically speaks before
        chapterAffinity: Map<string, number>; // Which chapters
      };
    };
  };
  chapters: {
    [chapterId: string]: {
      dominantSpeaker: string;
      dialogueCount: number;
      speakerDistribution: Map<string, number>;
      turnTakingPatterns: string[][];
    };
  };
  corrections: {
    timestamp: number;
    passage: string;
    accepted: string;
    rejected: string[];
    confidence: number;
  }[];
}
```

**Persistence:**

- Survives browser sessions (IndexedDB)
- Export as JSON for backup/sharing
- Import to restore or transfer
- Privacy: All local, no cloud sync

**Confidence Scoring:**

```typescript
function calculateConfidence(patternMatch: PatternMatch, context: Context): number {
  let score = 0.0;

  // Recency boost
  if (patternMatch.recent) score += 0.3;

  // Chapter frequency
  score += context.chapterFrequency * 0.25;

  // Turn-taking pattern
  if (patternMatch.turnTaking) score += 0.2;

  // Context clues
  if (patternMatch.nameMention) score += 0.1;

  // Cap at 1.0
  return Math.min(score, 1.0);
}
```

### 4.4 Adaptive Feedback Loop

**Learning Pipeline:**

1. **User Action:**
   - Accepts AI suggestion → Positive feedback
   - Rejects AI suggestion → Negative feedback
   - Manual tag → Ground truth data

2. **Database Update:**
   - Pattern engine updates immediately
   - Corrections logged with timestamp
   - Confidence scores recalibrated

3. **Ax Optimization:**
   - Accumulate corrections (batch size: 50)
   - Retrain Ax prompt signatures
   - Test on held-out set
   - Deploy if accuracy improves

4. **Quality Metrics:**
   - Track user acceptance rate
   - Monitor confidence calibration
   - Measure pattern accuracy
   - Per-provider cost tracking

**Privacy Controls:**

- "Learning disabled" toggle
- Clear learning database button
- Export/delete data options
- No data leaves browser

## 5. Sample Gallery and Corpus Integration

### 5.1 Prepared Sample Gallery

**Welcome Screen Components:**

**1. Quick Start Section:**

- 3 recommended samples for first-time users
- Cards with: Title, Author, Description, "Load" button
- Difficulty indicator: Beginner → Intermediate → Advanced

**2. Full Sample Gallery:**

**Sample 1: "Pride and Prejudice" (Chapter 1)**

- Title: "Pride and Prejudice - Chapter 1"
- Author: Jane Austen
- Dialogue passages: 12
- Characters: 2 (Mr. Bennet, Mrs. Bennet)
- Features: Classic dialogue, two-character conversation
- Pre-tagged: All dialogue with `<said who="#mr-bennet">` and `<said who="#mrs-bennet">`
- Teaches: Basic speaker attribution

**Sample 2: "Dracula" (Chapter 3)**

- Title: "Dracula - Jonathan Harker's Journal"
- Author: Bram Stoker
- Dialogue passages: 18
- Characters: 3 (Jonathan, Dracula, Peasant woman)
- Features: Letters within narrative, diary entries
- Pre-tagged: Complex with `<floatingText>` for letters
- Teaches: Advanced structures, embedded texts

**Sample 3: "Jane Eyre" (Chapter 1)**

- Title: "Jane Eyre - Chapter I"
- Author: Charlotte Brontë
- Dialogue passages: 8
- Characters: 2 (Jane, Mrs. Reed, John)
- Features: First-person narration with dialogue
- Pre-tagged: Mix of direct and indirect speech
- Teaches: Narrative vs dialogue distinction

**Sample 4: "The Yellow Wallpaper" (Full Story)**

- Title: "The Yellow Wallpaper"
- Author: Charlotte Perkins Gilman
- Dialogue passages: 15
- Characters: 3 (Narrator, John, Jennie)
- Two versions:
  - Untagged: For practice annotation
  - Tagged: Reference solution
- Compare button: Side-by-side comparison
- Teaches: Complete annotation workflow

**Sample 5: Tutorial Example**

- Minimal snippet (5 passages)
- Inline guidance tooltips
- Step-by-step: "Try tagging this dialogue"
- Interactive prompts
- Teaches: Tool features step-by-step

**Sample Card UI:**

- Book cover (auto-generated placeholder)
- Metadata: Title, author, year
- Statistics: Dialogue count, character count
- Tags: [Beginner] [Two Characters] [Letters]
- Action buttons: "Load Tagged", "Load Untagged" (if available)
- Difficulty badge: color-coded (green/yellow/red)

**3. Tutorial Mode:**

- First-time users: Guided tour
- Feature highlights with tooltips
- Interactive tasks: "Tag this passage"
- Progress tracking: Tutorial completion
- Skip tutorial option

### 5.2 Live Corpus Integration

**Corpus Browser Interface:**

**Search/Filter Panel:**

- Text search: Title, author, full-text
- Filters: Year range, dialogue count, character count
- Sort: Relevance, Title, Date, Dialogue Count

**Corpus Sources:**

**1. Wright American Fiction (1851-1875)**

- GitHub API integration
- ~3,000 novels available
- Metadata: Title, author, year, genre
- Preview: First 500 characters
- One-click load into editor
- Caching: Frequently accessed in IndexedDB

**API Integration:**

```typescript
async function fetchWrightFiction(): Promise<Novel[]> {
  const response = await fetch(
    'https://api.github.com/repos/iulibdcs/Wright-American-Fiction/contents/'
  );
  const files = await response.json();
  return files
    .filter((f) => f.name.endsWith('.xml'))
    .map((f) => ({
      title: extractTitle(f.name),
      path: f.download_url,
      metadata: extractMetadata(f),
    }));
}
```

**2. Future Sources:**

- Victorian Women Writers Project
- Christof Schöch's TEI texts
- Oxford Text Archive (if API available)
- User-contributed samples

**Corpus Card UI:**

- Title and author
- Year and source
- Estimated dialogue count (AI-calculated from preview)
- Tags: [Public Domain] [Novel] [Short Story]
- Preview modal: First 500 words
- "Load" button
- "Add to Favorites" (localStorage)

### 5.3 Recent Documents

**Quick Access:**

- Recently opened documents (localStorage)
- Last edited: Timestamp
- Progress indicator: Tagging completion %
- Quick actions: "Continue", "Duplicate", "Delete"

**Persistence:**

- localStorage for recent documents list
- IndexedDB for document content
- Export/import for backup

### 5.4 Import/Export for Samples

**Custom Samples:**

- Users can save work as sample template
- "Save as Sample" button in toolbar
- Prompts for: Title, author, description, tags
- Stored in IndexedDB, exportable as JSON

**Export Formats:**

- TEI XML (standard)
- JSON (sample data)
- URL-encoded (shareable link)
- PDF (for documentation)

**Import:**

- Drag-and-drop .xml file
- "Import from URL" feature
- "Load from backup" (IndexedDB restore)

## 6. Visualization Enhancements

### 6.1 Character Dialogue Network (React Flow)

**Force-Directed Graph:**

**Visual Elements:**

- Nodes: Characters
  - Size ∝ dialogue volume
  - Color: Role-based (Protagonist=blue, Antagonist=red, Other=gray)
  - Label: Character name
- Edges: Interactions
  - Thickness ∝ interaction frequency
  - Direction: Speaker → Listener (if available)
  - Color: Dialogue density (gradient)

**Interactivity:**

- Hover node:
  - Tooltip: Stats (dialogue count, % of total)
  - Highlight connected edges
  - Dim other nodes
- Click node:
  - Filter visualizations to this character
  - Show all their speeches in timeline
  - Highlight in editor (if document loaded)
- Drag nodes:
  - Customize layout
  - Save layout preference

**Layout Options:**

- Force (default): Physics-based simulation
- Circular: Characters in circle
- Hierarchical: Chapter-based clustering
- Manual: User-positioned

**Export:**

- PNG (image)
- SVG (vector graphics)
- JSON (data for external analysis)

### 6.2 Dialogue Timeline (D3.js)

**Gantt-Style Timeline:**

**Axes:**

- X-axis: Position in novel (chapter/paragraph)
- Y-axis: Characters (sorted by dialogue count)
- Bars: Individual dialogue passages

**Features:**

- Zoom: Scroll to zoom into time range
- Filter: Show/hide characters
- Click event: Jump to passage in editor
- Color: Confidence or character

**Dual View:**

- Timeline (top)
- Statistics (bottom)
- Synchronized scrolling
- Linked interactions

**Pattern Detection:**

- Highlight dialogues between character pairs
- Show conversation clusters
- Identify long monologues

**Performance:**

- Virtualization for long novels (>100k words)
- Canvas rendering for >1000 passages
- Web Worker for layout calculations

### 6.3 Statistics Dashboard (Recharts)

**Four-Panel Dashboard:**

**Panel 1: Dialogue Volume (Bar Chart)**

- X-axis: Chapters
- Y-axis: Dialogue passage count
- Stacked by character
- Color-coded
- Hover: Exact counts

**Panel 2: Speaker Distribution (Pie Chart)**

- Segments: Characters
- Size: % of total dialogue
- Labels: Name + percentage
- Click: Filter to character

**Panel 3: Dialogue Length (Histogram)**

- Buckets: Short (<50 words), Medium (50-100), Long (>100)
- Count per bucket
- Color by speaker (stacked)
- Analysis: Average length

**Panel 4: Tagging Progress (Donut Chart)**

- Segments: Tagged, Untagged, AI-suggested
- Progress toward completion
- Color: Green (done), Yellow (in progress), Red (todo)

**Export:**

- "Export Dashboard as PDF"
- Single report with all charts
- Include summary statistics
- Timestamp and document info

### 6.4 Comparative Analysis

**Multi-Document View:**

**Load Panel:**

- "Add Document to Comparison"
- Select from samples or upload
- Max 5 documents (UI constraint)

**Comparison Metrics:**

- Total dialogue passages
- Character count
- Average dialogue length
- Dialogue per chapter
- Vocabulary richness

**Visualizations:**

- Side-by-side bar charts
- Radar chart: Multi-dimensional comparison
- Table: Sortable metrics
- Scatter plot: Dialogue vs narration ratio

**Use Cases:**

- Author style analysis
- Genre comparison
- Chronological analysis (author's evolution)
- Teaching: Show different encoding approaches

**Export:**

- CSV (for statistical analysis)
- Excel format
- PDF report

### 6.5 Performance Optimization

**Lazy Loading:**

- Code split visualization components
- Load on-demand when tab opened
- Reduce initial bundle size

**Web Workers:**

- Graph layout calculations (React Flow)
- Timeline rendering (D3)
- Statistics aggregation
- Prevent UI blocking

**Caching:**

- Visualization results in IndexedDB
- Cache key: Document hash + visualization type
- Invalidate on document change

**Progressive Enhancement:**

- Render placeholder immediately
- Show loading skeleton
- Stream results as calculated

## 7. Implementation Phases

### Phase 1: Foundation + Dataset Creation (Weeks 1-2)

**Tasks:**

**1.1 Dataset Creation (Parallel with development)**

- Select 5 public domain works
- Manually annotate all dialogue with `<said>` tags
- Create listPerson entries
- Document tagging guidelines
- Target: 200-500 tagged passages
- Sources:
  - "The Yellow Wallpaper" (~6k words)
  - "The Gift of the Magi" (~3k words)
  - "The Tell-Tale Heart" (~2k words)
  - "An Occurrence at Owl Creek Bridge" (~3k words)
  - "Pride and Prejudice" Chapter 1 (~5k words)

**1.2 Ax Provider Integration**

- Install `@ax-llm/ax` and `@ax-llm/ax-ai-sdk-provider`
- Create `lib/ai/ax-provider.ts`
- Implement signatures: detectDialogue, attributeSpeaker
- Add provider configuration UI
- Support OpenAI initially (extensible)

**1.3 Command Palette**

- Install cmdk package
- Create `components/keyboard/CommandPalette.tsx`
- Implement global keyboard handler
- Add commands: Save, Load, Export, Help
- Keyboard shortcut: `Cmd/Ctrl+K`

**1.4 Basic Keyboard Shortcuts**

- Install react-hotkeys-hook
- Implement navigation: J/K
- Implement tagging: T, A, X, R
- Create help overlay (`?` key)
- Add settings panel for customization

**1.5 Pattern Database Structure**

- Install dexie (IndexedDB wrapper)
- Create database schema
- Implement basic CRUD operations
- Add export/import functionality
- Write unit tests

**Deliverables:**

- Working annotation UI with keyboard shortcuts
- Ax provider integrated and tested
- Pattern database schema and tests
- Initial dataset with 5 annotated works
- Command palette functional

### Phase 2: Intelligence Layer (Weeks 3-4)

**Tasks:**

**2.1 Pattern Engine (WASM)**

- Set up Rust environment with wasm-pack
- Implement pattern matching algorithms
- Compile to WASM
- Create JavaScript wrapper
- Performance test (<1ms per passage)

**2.2 Learning System**

- Implement feedback loop
- Update pattern database from corrections
- Confidence scoring algorithm
- Add learning toggle UI

**2.3 AI Mode Switcher**

- Implement mode toggle (Manual/Suggest/Auto)
- Manual: Disable AI
- Suggest: Show inline suggestions
- Auto: Tag entire document
- Add mode-specific UI elements

**2.4 Ax Optimization**

- Implement few-shot learning
- Add example passages (from dataset)
- Use MiPRO optimizer (Ax feature)
- Test on held-out set

**2.5 Speaker Attribution**

- Implement Ax signature for speaker attribution
- Add context awareness
- Multi-character support
- Confidence calibration

**Deliverables:**

- Pattern engine WASM module
- Learning system with feedback
- AI mode switcher functional
- Speaker attribution working
- Baseline accuracy: >80% on test set

### Phase 3: Sample Gallery & Bulk Operations (Weeks 5-6)

**Tasks:**

**3.1 Sample Gallery**

- Create welcome screen
- Design sample cards
- Implement sample loader
- Add tutorial mode
- Create "First Run" experience

**3.2 Corpus Browser**

- Implement Wright American Fiction API
- Search and filter UI
- Preview modal
- One-click load
- Caching layer

**3.3 Bulk Operations Panel**

- Sidebar component
- Multi-select logic
- Filter options
- Bulk tag dialog
- Visual feedback

**3.4 Navigation Enhancements**

- Dialogue outline panel
- Tree view component
- Filter by character/status
- Breadcrumb navigation
- Quick search (Cmd/Ctrl+F)

**Deliverables:**

- Sample gallery with 5 samples
- Corpus browser functional
- Bulk operations working
- Navigation complete

### Phase 4: Visualizations (Weeks 7-8)

**Tasks:**

**4.1 Character Network**

- Install react-flow-renderer
- Implement force-directed layout
- Add character nodes
- Add interaction edges
- Export PNG/SVG

**4.2 Dialogue Timeline**

- Install d3 package
- Implement Gantt chart
- Add zoom/pan
- Click-to-jump
- Dual view with stats

**4.3 Statistics Dashboard**

- Install recharts
- Create 4-panel layout
- Implement all charts
- Export to PDF
- Real-time updates

**4.4 Comparative Analysis**

- Multi-document loader
- Comparison metrics
- Radar chart
- CSV export

**Deliverables:**

- All visualizations working
- Performance optimized
- Export functional

### Phase 5: Polish & Testing (Weeks 9-10)

**Tasks:**

**5.1 E2E Testing with Playwright**

- Write comprehensive tests
- Cover all keyboard shortcuts
- Test AI mode switching
- Test visualizations
- Screenshot testing

**5.2 Performance Optimization**

- Web Workers for heavy computations
- Virtualization for large datasets
- Bundle size optimization
- Load time profiling

**5.3 Documentation**

- Update README
- Write keyboard shortcuts guide
- Create "AI Settings" guide
- Document dataset creation
- Add screenshots

**5.4 Beta Testing**

- Recruit testers (target: 5-10 users)
- Gather feedback
- Fix critical bugs
- Polish UI/UX

**5.5 Release Preparation**

- Version bump
- Changelog
- Tag release
- Deploy documentation

**Deliverables:**

- Production-ready release
- Comprehensive test suite
- Complete documentation
- Beta feedback addressed

## 8. Testing Strategy with Playwright

### 8.1 Nix Flake Integration

**Updated flake.nix:**

```nix
{
  description = "TEI Dialogue Editor - Enhanced with Playwright";
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    playwright.url = "github:pietdevries94/playwright-web-flake";
  };

  outputs = { self, nixpkgs, flake-utils, playwright }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        playwrightPackages = playwright.packages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_22
            nodePackages.npm
            playwrightPackages.playwright-test
            playwrightPackages.playwright-driver
            git
          ];

          shellHook = ''
            export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
            export PLAYWRIGHT_BROWSERS_PATH="${playwrightPackages.playwright-driver.browsers}"
            echo "🎭 TEI Dialogue Editor Development Environment"
            echo "📦 Node.js: $(node --version)"
            echo "🎭 Playwright browsers: chromium, firefox, webkit"
            echo ""
            echo "Available commands:"
            echo "  npm install    - Install dependencies"
            echo "  npm run dev    - Start development server"
            echo "  npm test       - Run unit/integration tests"
            echo "  npx playwright test - Run E2E tests"
            echo "  npm run build  - Build for production"
            echo ""
          '';
        };
      }
    );
}
```

### 8.2 E2E Test Structure

```
tests/e2e/
├── annotation/
│   ├── keyboard-shortcuts.spec.ts
│   ├── bulk-operations.spec.ts
│   ├── ai-suggestions.spec.ts
│   └── learning-system.spec.ts
├── samples/
│   ├── sample-gallery.spec.ts
│   └── corpus-browser.spec.ts
├── visualization/
│   ├── character-network.spec.ts
│   ├── timeline.spec.ts
│   └── statistics.spec.ts
└── workflows/
    ├── full-annotation.spec.ts
    └── multi-file.spec.ts
```

### 8.3 Key Test Scenarios

**Keyboard Shortcuts Suite:**

```typescript
test('command palette opens with Cmd+K', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Meta+k');
  await expect(page.locator('[data-testid="command-palette"]')).toBeVisible();
});

test('J/K navigate between passages', async ({ page }) => {
  await page.goto('/');
  await loadSample('pride-prejudice-ch1.xml');
  const initial = getSelectedPassage(page);

  await page.keyboard.press('j'); // Next
  await expect(getSelectedPassage(page)).not.toBe(initial);

  await page.keyboard.press('k'); // Previous
  await expect(getSelectedPassage(page)).toBe(initial);
});

test('quick speaker assignment 1-9', async ({ page }) => {
  // Test all 9 quick assignment keys
  for (let i = 1; i <= 9; i++) {
    await page.keyboard.press(String(i));
    await expect(page.locator(`[data-speaker="speaker${i}"]`)).toHaveCount(i);
  }
});
```

**AI Integration Suite:**

```typescript
test('mode switching preserves state', async ({ page }) => {
  await page.goto('/');
  await loadDocument('test.xml');

  // Manual mode
  await page.click('[data-testid="mode-manual"]');
  await expect(page.locator('.ai-suggestion')).toHaveCount(0);

  // Switch to suggest
  await page.click('[data-testid="mode-suggest"]');
  await expect(page.locator('.ai-suggestion')).toHaveCountGreaterThan(0);

  // Verify suggestions preserved
  await page.click('[data-testid="mode-auto"]');
  await expect(page.locator('.ai-suggestion')).toHaveCountGreaterThan(0);
});

test('Ax provider switching', async ({ page }) => {
  await page.goto('/settings');
  await page.selectOption('[name="ai-provider"]', 'anthropic');
  await page.fill('[name="anthropic-api-key"]', process.env.ANTHROPIC_API_KEY);

  await loadDocument('test.xml');
  await page.click('[data-testid="detect-dialogue"]');

  // Verify Anthropic used (check logs/mocked calls)
});
```

**Learning System Suite:**

```typescript
test('pattern learning from corrections', async ({ page }) => {
  await page.goto('/');
  await loadSample('untagged-story.xml');

  // Tag first passage manually
  await selectPassage(page, 1);
  await page.keyboard.press('1'); // Tag as speaker1

  // Tag second passage manually
  await selectPassage(page, 2);
  await page.keyboard.press('1'); // Also speaker1

  // Third passage should suggest speaker1 (pattern learning)
  await selectPassage(page, 3);
  await expect(page.locator('[data-testid="suggestion"]')).toContainText('speaker1');
});
```

### 8.4 Screenshot Testing

**Regression Tests for Visualizations:**

```typescript
test('character network snapshot', async ({ page }) => {
  await page.goto('/');
  await loadSample('pride-prejudice-ch1.xml');
  await page.click('[data-testid="visualization-network"]');

  // Wait for rendering
  await page.waitForSelector('.react-flow');

  // Screenshot comparison
  await expect(page).toHaveScreenshot('network-pride-prejudice.png');
});
```

**Documentation Screenshots:**

All screenshots for documentation will be captured during Phase 5:

- Use Playwright to capture UI states
- Automated screenshot generation
- Organized in `docs/screenshots/` directory
- Version controlled for updates

### 8.5 Test Coverage Goals

**Unit Tests (Jest):**

- Pattern matching algorithms: 100%
- Confidence scoring: 100%
- Keyboard shortcuts handlers: 90%+
- Ax signature definitions: 100%
- State management: 90%+

**Integration Tests (Jest):**

- Ax provider integration: 100%
- Pattern database operations: 100%
- TEI document operations: 100%

**E2E Tests (Playwright):**

- Critical user flows: 100%
- Keyboard shortcuts: 80%+
- Visualizations: 60%+ (expensive)
- Edge cases: 70%+

## 9. Tagged Speech Dataset

### 9.1 Dataset Requirements

**Why We Need a Dataset:**

- Train and test pattern recognition engine
- Validate Ax prompt optimization
- Benchmark AI provider accuracy
- Provide ground truth for evaluation

**Current State:**

- 1 minimal sample (4 passages)
- Public TEI corpora lack comprehensive speech tagging
- No existing open dataset for dialogue annotation

**Solution:** Create dataset during Phase 1

### 9.2 Dataset Structure

```
tests/dataset/
├── README.md                           # Dataset documentation
├── manually-annotated/
│   ├── yellow-wallpaper.xml           # Human-annotated
│   ├── gift-of-the-magi.xml
│   ├── tell-tale-heart.xml
│   ├── owl-creek-bridge.xml
│   └── pride-prejudice-ch1.xml
├── metadata.json                       # Tagging guidelines
├── statistics.json                      # Dataset stats
└── test-fixtures/
    ├── edge-cases.xml                  # Difficult patterns
    └── multi-character.xml             # 3+ characters
```

### 9.3 Annotation Guidelines

**Tagging Principles:**

1. **Speaker Attribution:**
   - Every `<said>` must have `@who` attribute
   - References `xml:id` in `listPerson`
   - Use consistent IDs (e.g., "#speaker1", "#jane")

2. **Direct vs Indirect Speech:**
   - Direct: `aloud="true"`
   - Indirect: `aloud="false"` or `direct="false"`
   - Free indirect: Tag with speaker, `direct="false"`

3. **Nested Structures:**
   - Letters in `<floatingText>`
   - Stories within stories
   - Maintain TEI hierarchy

4. **Ambiguous Cases:**
   - Document in metadata
   - Use `@certainty` attribute
   - Add `<note>` with explanation

**Example Annotation:**

```xml
<TEI xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>The Yellow Wallpaper</title>
        <author>Charlotte Perkins Gilman</author>
      </titleStmt>
    </fileDesc>
    <encodingDesc>
      <editorialDecl>
        <p>Dialogue tagged with <said> elements. Speaker attribution based on narrative context.</p>
      </editorialDecl>
    </encodingDesc>
  </teiHeader>
  <text>
    <body>
      <front>
        <div type="dedication">
          <p>To <persName>John</persName>...</p>
        </div>
      </front>
      <body>
        <div type="section">
          <head>
            <said who="#narrator">"The Yellow Wallpaper"</said>
          </head>
          <p>
            <said who="#john">"Really, dear, you are better,</said>
            <persName>John</persName> said.
          </p>
          <p>
            <said who="#narrator" direct="false">But I said</said>
            I would not be feeling better for a while.
          </p>
        </div>
      </body>
    </body>
  </text>

  <standOff>
    <listPerson>
      <person xml:id="narrator">
        <persName>The narrator</persName>
        <sex value="F"/>
      </person>
      <person xml:id="john">
        <persName>John</persName>
        <sex value="M"/>
        <role>physician, husband</role>
      </person>
    </listPerson>
  </standOff>
</TEI>
```

### 9.4 Dataset Sources

**Selection Criteria:**

- Public domain (no copyright issues)
- Manageable length (2-10k words each)
- Diverse dialogue patterns
- Available in plain text (for annotation)

**Selected Works:**

1. **"The Yellow Wallpaper"** (1892)
   - Author: Charlotte Perkins Gilman
   - Length: ~6,000 words
   - Dialogue: ~15 passages
   - Characters: 3 (Narrator, John, Jennie)
   - Patterns: First-person narration, indirect speech

2. **"The Gift of the Magi"** (1905)
   - Author: O. Henry
   - Length: ~3,000 words
   - Dialogue: ~12 passages
   - Characters: 2 (Della, Jim)
   - Patterns: Two-character dialogue, twist ending

3. **"The Tell-Tale Heart"** (1843)
   - Author: Edgar Allan Poe
   - Length: ~2,000 words
   - Dialogue: ~8 passages
   - Characters: 2 (Narrator, old man)
   - Patterns: Internal monologue, unreliable narrator

4. **"An Occurrence at Owl Creek Bridge"** (1890)
   - Author: Ambrose Bierce
   - Length: ~3,000 words
   - Dialogue: ~10 passages
   - Characters: 3 (Farquhar, soldier, wife)
   - Patterns: Flashback, dream sequence

5. **"Pride and Prejudice" Chapter 1** (1813)
   - Author: Jane Austen
   - Length: ~5,000 words (chapter only)
   - Dialogue: ~20 passages
   - Characters: 3 (Mr. Bennet, Mrs. Bennet, narrator)
   - Patterns: Witty dialogue, irony, social commentary

**Total Dataset:**

- Documents: 5
- Total words: ~19,000
- Tagged passages: ~65
- Unique characters: ~13
- Pattern diversity: High

### 9.5 Quality Assurance

**Inter-Annotator Agreement:**

- Target: >90% agreement on manual set
- Process: Two annotators per document
- Resolution: Third party adjudicates disputes
- Document disagreements in notes

**Annotation Checklist:**

- [ ] All dialogue tagged with `<said>`
- [ ] All `<said>` have `@who` attribute
- [ ] All `@who` reference valid `xml:id`
- [ ] Direct vs indirect speech distinguished
- [ ] Ambiguous cases documented
- [ ] `listPerson` complete
- [ ] TEI validation passes

## 10. Documentation and Screenshots

### 10.1 User Documentation

**README.md Updates:**

```markdown
# TEI Dialogue Editor

## Features

- **Smart Annotation**: AI-assisted dialogue tagging with pattern learning
- **Keyboard Shortcuts**: Comprehensive shortcuts for power users
- **Bulk Operations**: Tag multiple passages at once
- **Sample Gallery**: Learn with 5 prepared examples
- **Visualizations**: Character networks, timelines, statistics
- **Multi-Provider AI**: OpenAI, Anthropic, Google, and more

## Quick Start

### Installation

**With Nix (recommended):**
\`\`\`bash
nix develop
npm install
\`\`\`

**Without Nix:**
\`\`\`bash
npm install
\`\`\`

### Usage

\`\`\`bash
npm run dev
\`\`\`

Visit http://localhost:3000

## Keyboard Shortcuts

See [KEYBOARD_SHORTCUTS.md](KEYBOARD_SHORTCUTS.md)

## AI Configuration

See [AI_SETUP.md](AI_SETUP.md)
```

**KEYBOARD_SHORTCUTS.md:**

Complete reference for all shortcuts:

- Global shortcuts table
- Annotation shortcuts table
- Navigation shortcuts table
- Bulk mode shortcuts table
- Customization guide

**AI_SETUP.md:**

- Ax provider setup
- API key configuration
- Provider switching
- Cost estimation
- Prompt optimization guide

### 10.2 Developer Documentation

**CONTRIBUTING.md Updates:**

Add sections:

- Ax integration patterns
- Dataset contribution guidelines
- Visualization customization
- Performance profiling

### 10.3 Screenshots Documentation

**Screenshot Organization:**

```
docs/screenshots/
├── welcome/
│   ├── 01-sample-gallery.png           # Sample gallery overview
│   ├── 02-quick-start.png              # Quick start section
│   └── 03-tutorial-mode.png            # Tutorial overlay
├── annotation/
│   ├── 01-split-editor.png             # Split-pane editor
│   ├── 02-command-palette.png          # Cmd+K palette
│   ├── 03-keyboard-shortcuts.png       # Help overlay
│   ├── 04-ai-suggestions.png           # Inline AI suggestions
│   ├── 05-bulk-mode.png                # Bulk selection
│   ├── 06-learning-indicator.png       # Confidence/pattern source
│   └── 07-navigation-panel.png         # Dialogue outline
├── ai-settings/
│   ├── 01-provider-selection.png       # AI provider settings
│   ├── 02-mode-switcher.png            # Manual/Suggest/Auto toggle
│   ├── 03-learning-toggle.png          # Enable/disable learning
│   └── 04-cost-tracking.png            # API cost dashboard
├── samples/
│   ├── 01-pride-prejudice.png          # Sample 1 loaded
│   ├── 02-dracula.png                  # Sample 2 complex structure
│   ├── 03-jane-eyre.png                # Sample 3 narrative/dialogue
│   └── 04-yellow-wallpaper.png         # Sample 4 practice mode
├── visualizations/
│   ├── 01-character-network.png        # Network graph
│   ├── 02-timeline.png                 # Dialogue timeline
│   ├── 03-statistics-dashboard.png     # Four-panel charts
│   └── 04-comparative-analysis.png     # Multi-document comparison
└── workflows/
    ├── 01-full-annotation.png          # Complete workflow
    ├── 02-ai-assisted.png              # AI-assisted workflow
    └── 03-batch-processing.png         # Multiple files
```

**Screenshot Generation Process:**

1. **During Development (Phase 5):**
   - Use Playwright to capture UI states
   - Automated screenshot tests
   - Manual screenshots for complex workflows

2. **Screenshot Guidelines:**
   - Resolution: 1920x1080 (standard desktop)
   - Theme: Light mode (add dark mode if time)
   - Content: Real data from samples
   - Annotations: Callouts and arrows (post-processing)

3. **Tools:**
   - Playwright: `await page.screenshot({ path: 'screenshot.png' })`
   - Manual: macOS screenshot tool (Cmd+Shift+4)
   - Editing: macOS Preview or ImageMagick

4. **Naming Convention:**
   - `section-number-description.png`
   - Example: `annotation-02-command-palette.png`
   - Version: `v2` suffix if updated

5. **Integration in Documentation:**

   ```markdown
   ## Command Palette

   Press `Cmd+K` to open the command palette:

   ![Command Palette](../../screenshots/annotation/02-command-palette.png)

   Available commands:

   - Save document
   - Load sample
   - Export TEI
   - Toggle AI mode
   ```

### 10.4 Tutorial Documentation

**Interactive Tutorial:**

Create step-by-step tutorial with screenshots:

1. **Getting Started:**
   - Welcome screen → Select sample
   - Overview of interface
   - First annotation task

2. **Basic Annotation:**
   - Loading a document
   - Selecting text
   - Applying tags
   - Saving work

3. **Using AI Assistance:**
   - Enabling suggest mode
   - Reviewing suggestions
   - Accepting/rejecting
   - Pattern learning

4. **Advanced Features:**
   - Bulk operations
   - Keyboard shortcuts
   - Visualizations
   - Export options

**Tutorial Format:**

- Markdown with embedded screenshots
- Step-by-step instructions
- Click targets highlighted (in screenshots)
- Estimated time for each section
- "Next" / "Previous" navigation

### 10.5 Video Walkthroughs (Optional)

If time permits in Phase 5:

**Short Videos (2-3 minutes each):**

- "Getting Started in 3 Minutes"
- "Keyboard Shortcuts Power Tips"
- "AI-Assisted Annotation Workflow"
- "Creating Custom Visualizations"

**Tools:**

- OBS Studio for recording
- macOS built-in screen recorder
- Editing: DaVinci Resolve or Final Cut Pro

**Hosting:**

- Embed in documentation
- Upload to YouTube (unlisted)
- Link from README

## 11. Success Criteria

**Phase 1:**

- [x] Dataset created with 5 annotated works (200-500 passages)
- [ ] Ax provider integrated and tested
- [ ] Command palette functional
- [ ] Basic keyboard shortcuts working
- [ ] Pattern database schema implemented

**Phase 2:**

- [ ] Pattern engine WASM module operational
- [ ] Learning system with feedback loop
- [ ] AI mode switcher (Manual/Suggest/Auto)
- [ ] Speaker attribution >80% accuracy
- [ ] Confidence scoring calibrated

**Phase 3:**

- [ ] Sample gallery with 5 examples
- [ ] Corpus browser (Wright American Fiction)
- [ ] Bulk operations panel
- [ ] Navigation enhancements complete
- [ ] Recent documents feature

**Phase 4:**

- [ ] Character network graph functional
- [ ] Dialogue timeline with zoom/pan
- [ ] Statistics dashboard with 4 panels
- [ ] Comparative analysis working
- [ ] Export to PNG/SVG/PDF

**Phase 5:**

- [ ] 100+ E2E tests passing
- [ ] Performance budget met (no test >10s)
- [ ] Complete documentation with screenshots
- [ ] Beta feedback addressed
- [ ] Production deployment ready

**Overall Metrics:**

- Annotation speed: 5x improvement over manual
- AI accuracy: >85% on test set
- Pattern learning: User corrections reduce AI errors by 40%
- User satisfaction: >4/5 in beta testing
- Code coverage: >80% (unit), >70% (integration), >60% (E2E)

## 12. Open Questions and Considerations

1. **Dataset Expansion:**
   - Should we add community contribution features?
   - How to validate community tags?

2. **AI Costs:**
   - What are acceptable cost limits per user?
   - Should we offer local-only mode (no API)?

3. **Performance:**
   - Maximum novel size for smooth performance?
   - Optimization priorities for large texts?

4. **Accessibility:**
   - Keyboard-only operation support?
   - Screen reader compatibility?

5. **Internationalization:**
   - Multi-language TEI documents support?
   - UI localization plans?

## 13. Future Enhancements (Out of Scope)

- Real-time collaboration (multi-user editing)
- Version control for annotations
- Advanced TEI ODD support
- Batch processing for entire corpora
- TEI-to-EPUB export
- Mobile/tablet support
- Offline mode (PWA)
- Plugin system for custom analyzers

## 14. References

- Ax Framework: https://github.com/ax-llm/ax
- Playwright Web Flake: https://github.com/pietdevries94/playwright-web-flake
- TEI P5 Guidelines: https://tei-c.org/guidelines/p5/
- Wright American Fiction: https://github.com/iulibdcs/Wright-American-Fiction
- Victorian Women Writers Project: https://github.com/iulibdcs/Victorian-Women-Writers-Project
- React Flow: https://reactflow.dev/
- D3.js: https://d3js.org/
- Recharts: https://recharts.org/

---

**End of Design Document**

Next steps:

1. Create implementation plan with detailed tasks
2. Set up git worktree for feature development
3. Begin Phase 1: Dataset creation and Ax integration
