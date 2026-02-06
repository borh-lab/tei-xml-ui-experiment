> [!NOTE]
> # Disclaimer
>
> This repo was an experiment borne out of a graduate seminar to see if useful, but technically relatively complex, tools could be made with coding agents in Feb. 2026 (GLM-4.7 with Claude Code).
> The results of this are in this repo.
> Since the goal was to show how far one can go with just text prompting (albeit at a high technical level) without even opening the browser or reading any of the code, the results are decidedly mixed.
>
> Some ideas, like parinfer-for-TEI (XML), seem genuinely interesting and merit further investigation as neat UI/UX improvements.
> The corpora uncovered during the construction and related baseline, CRF, and DistilBERT models were also interesting, but unfinished work.
> Other methodological issues with maintaining and growing a codebase of this size are also unsolved (some analysis of git commit history was conducted in the Gource video and cloc-based visualization).
> However, the goal of this was not necessarily to make a finished tool, but to explore and assess.
> With that, I am closing this repo.

# TEI Dialogue Editor

<img src="docs/screenshots/welcome-screen.png" alt="Welcome Screen" width="800">

An AI-assisted tool for annotating dialogue in TEI XML documents.

## Features Overview

### 🎯 Manual & AI-Assisted Annotation

<img src="docs/screenshots/ai-suggestions.png" alt="AI Suggestions" width="800">

- Manual dialogue annotation with TEI markup (`<said>`, `<q>`)
- AI-assisted dialogue detection with one-click acceptance
- Pattern learning from your corrections improves accuracy over time

### 📊 Character Network Visualization

<img src="docs/screenshots/character-network.png" alt="Character Network" width="800">

- Interactive visualization of character relationships
- See dialogue frequency and connections at a glance
- Click characters to filter their passages

### 👥 Entity Modeling

- **Character Management**: Add, edit, delete characters with full metadata (sex, age, occupation, traits)
- **Relationship Tracking**: Define relationships between characters (family, romantic, social, professional, antagonistic)
- **NER Integration**: Automatic detection of personal names, places, and organizations with confidence scoring
- **Entity Tooltips**: Hover over tagged dialogue to see character information

### ⚡ Productivity Features

<img src="docs/screenshots/command-palette.png" alt="Command Palette" width="800">

- **Command Palette** (`Ctrl/Cmd+K`) - Quick access to all actions
- **Keyboard Shortcuts** - Annotate without leaving the keyboard
- **Bulk Operations** - Batch-apply annotations to similar passages
- **Quick Search** - Regex search across your document

### 📚 Sample Gallery

<img src="docs/screenshots/sample-gallery.png" alt="Sample Gallery" width="800">

- Start with pre-annotated literary examples
- Learn from existing TEI markup patterns
- Upload your own TEI documents

## Key Features

- **TEI Corpus Browser**: Browse and explore 7 TEI corpora with 10,819 documents ([documentation](./docs/corpus-browsing.md))
- Manual dialogue annotation with TEI markup (`<said>`, `<q>`)
- AI-assisted dialogue detection (Ax framework with NLP fallback)
- Pattern learning from user corrections for improved accuracy
- Character network visualization
- Bulk operations for batch processing
- Sample gallery with annotated examples
- Quick search with regex support
- Recent documents tracking
- **Browser navigation** with back/forward button support

For detailed feature documentation, see [FEATURES.md](./FEATURES.md).

## Browser Navigation

The editor supports browser back/forward button navigation. Each document load creates a history entry, and URLs are shareable links that preserve document state.

**Key features:**
- Direct links to documents: `/?doc=sample-dialogism-1`
- Browser history navigation (back/forward buttons)
- Shareable URLs for any document
- Corpus context preservation when navigating to corpus browser

For complete documentation, see [Browser Navigation Documentation](./docs/features/browser-navigation.md).

## Current Status

**Version:** 0.2.0-alpha

**Ready for:** Development/testing

**Not ready for:** Production deployment

**AI Detection Accuracy:** F1 ~11.9% (improving with pattern learning)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for setup instructions and known limitations.

## Getting Started

### Quick Setup (Recommended: Bun)

[Bun](https://bun.sh) is a fast JavaScript runtime and package manager. It's the recommended way to work with this project.

```bash
# Install dependencies (with Bun - much faster)
bun install

# Set up environment variables (optional)
cp .env.local.example .env.local

# Run development server (with Bun)
bun run dev
```

### Alternative: npm

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

### Nix Setup (Reproducible Environment)

For a fully reproducible development environment with all dependencies pinned:

```bash
# Enter Nix development shell
nix develop

# Or if using direnv (recommended)
direnv allow  # Automatically loads on cd
```

The Nix shell includes:

- Node.js, Bun, npm
- Rust toolchains (for WASM builds)
- Playwright browsers

Visit [http://localhost:3000](http://localhost:3000) to use the application.

- For detailed setup instructions: [DEPLOYMENT.md](./DEPLOYMENT.md)
- For feature documentation and user guide: [FEATURES.md](./FEATURES.md)

## 🎬 Video Demos

See the TEI Dialogue Editor in action with short video demonstrations:

- **[Feature Demos](./docs/demos.md)** - Watch UI highlights and complete workflows
- Command palette, bulk operations, keyboard shortcuts
- Annotation workflows and AI-assisted sessions
- Character network visualization

All videos are WebM format (VP9 codec), optimized for web delivery. Total size: ~1.5MB.

## Git History Visualizations

This repository includes tools for visualizing development patterns and code growth over time.

### Gource Video (Git History Animation)

An animated 3D visualization of the repository's development history, showing file edits and commit activity over time.

**Generate the video:**
```bash
./scripts/generate-gource-webm.sh
```

This creates `gource-visualization.webm` (1920x1080, 30fps, ~50MB) showing:
- Real-time code editing activity
- File type organization with color coding
- Development patterns and bursts of activity
- Complete git history condensed into ~60 seconds

**Features:**
- High-quality WebM format (VP9 codec)
- File extension legend for code type identification
- Optimized for presentation/demonstration purposes

For details, see [scripts/README-gource.md](./scripts/README-gource.md)

### SLOC Visualization (Code Growth Analysis)

A publication-quality SVG visualization showing Source Lines of Code (SLOC) growth and commit activity patterns.

**Generate the visualization:**
```bash
./scripts/generate-sloc-viz.sh
```

This creates `sloc-visualization.svg` with three panels:

1. **SLOC Growth** - Multi-line chart showing code growth by file type (TypeScript, React, Markdown, Tests, Config)
2. **Commit Activity** - Stacked area chart showing cumulative commits by type (feat, fix, docs, test, refactor, chore)
3. **Code Churn** - Lines added vs removed with 7-commit moving average smoothing

**Key features:**
- Theme-agnostic (transparent background, works on light/dark themes)
- Commit-by-commit granularity (captures parallel agent development)
- Fast generation (~4.5 minutes for 100 commits)
- Scalable SVG output (conference-ready)
- Configurable sample size: `-n 200` for more commits, `-n 0` for all history

**Sample output:**
```bash
# Default (100 commits)
./scripts/generate-sloc-viz.sh

# Custom output file
./scripts/generate-sloc-viz.sh docs/images/sloc-growth.svg

# Process 200 commits
./scripts/generate-sloc-viz.sh -n 200
```

For details, see [scripts/README-sloc-viz.md](./scripts/README-sloc-viz.md)

## Testing

The project uses Jest with React Testing Library.

```bash
# Run tests (with Bun - faster)
bun test

# Or with npm
npm test
```

Test suites include:

- Unit tests for TEI document operations
- AI provider tests (with mocking)
- Integration tests using Wright American Fiction samples
- Component tests

## Corpus Analysis

This project includes tools for analyzing TEI corpora and preparing ML-ready datasets.

### Corpus Management Workflow

```bash
# Complete workflow: setup, convert, analyze, split, and export
bun run corpus:all

# Individual steps
bun run corpus:setup                 # Clone/update corpus repositories
bun run corpus:convert-novel-dialogism  # Convert novel-dialogism CSV to TEI
bun run corpus:convert-p4            # Convert P4→P5 corpora (with libxslt)
bun run corpus:analyze               # Analyze TEI documents and generate metadata
bun run corpus:split                 # Generate train/val/test splits
bun run corpus:split:ml              # Generate ML-compatible splits (optional)
bun run corpus:export                # Export to datasets/ for ML training
```

### Corpus Directory Structure

```
corpora/
├── novel-dialogism/              # Git submodule (source data: CSV/text files)
├── novel-dialogism-converted/    # Generated TEI files from novel-dialogism
├── wright-american-fiction/      # External corpus repository
├── victorian-women-writers/      # External corpus repository
├── indiana-magazine-history/     # External corpus repository
├── indiana-authors-books/        # External corpus repository
├── brevier-legislative/          # External corpus repository
└── tei-texts/                    # External corpus repository

datasets/                          # ML-ready exports (gitignored)
├── {corpus-name}/
│   ├── train/                    # Training set TEI files
│   ├── validation/               # Validation set TEI files
│   ├── test/                     # Test set TEI files
│   └── metadata.json             # Corpus metadata
├── splits.json                   # Split configuration
└── README.md                     # Dataset documentation

tests/corpora/metadata/            # Analysis metadata (gitignored)
├── {corpus-name}.json            # Individual corpus metadata
└── summary.json                  # All corpora summary
```

### Key Points

- **Submodule Management**: `novel-dialogism` is a git submodule at `corpora/novel-dialogism/`
- **On-the-Fly Conversion**: P4 corpora are converted to P5 during analysis (no separate `corpora-p5/` directory needed)
- **Generated Files**: `corpora/novel-dialogism-converted/` contains TEI files converted from the submodule's CSV data
- **Dataset Exports**: `datasets/` contains clean, ML-ready exports with train/val/test splits (see below for loading with Python)

### Recent Consolidation (2026-02-05)

The corpus directory structure was consolidated to reduce complexity:

**Removed directories** (saved 1.3GB):
- `corpora-p5/` (376M) - Deprecated; on-the-fly P4→P5 conversion is now used
- `corpora-p4-backup/` (928M) - No longer needed; originals remain in `corpora/`
- `data/` (2M) - Old splits.json format replaced by `datasets/`

**Reorganized**:
- `novel-dialogism/` submodule moved from project root to `corpora/novel-dialogism/`
- Converted TEI files now output to `corpora/novel-dialogism-converted/` (separate from source)
- All corpus analysis scripts updated to use new paths with overrides where needed

**Benefits**:
- Cleaner top-level directory structure
- All corpus data consolidated under `corpora/`
- Clear separation between source data (submodule) and generated files
- Consistent with git best practices for submodules

See [scripts/README.md](./scripts/README.md) for detailed corpus management documentation.

### ML-Ready Datasets

For machine learning applications, export the corpora with train/val/test splits:

```bash
# Run after corpus:analyze and corpus:split
bun run corpus:export
```

This creates a `datasets/` directory with:
- **Organized structure**: Files grouped by corpus and split (train/validation/test)
- **HuggingFace compatibility**: Ready for use with HF datasets library
- **Metadata included**: Each corpus has its own metadata.json
- **Split configuration**: Complete splits.json with reproducibility info

**Directory Structure**:
```
datasets/
├── wright-american-fiction/
│   ├── train/           # 2,013 TEI files
│   ├── validation/      # 431 TEI files
│   ├── test/            # 432 TEI files
│   └── metadata.json    # Corpus statistics
├── splits.json          # Split configuration
├── summary.json         # All corpora summary
└── README.md            # Dataset documentation
```

**Loading with Python** (HuggingFace datasets):
```bash
# Show dataset statistics
uv run scripts/load-datasets.py --stats

# Load specific corpus
uv run scripts/load-datasets.py --corpus wright-american-fiction

# Sample first N examples
uv run scripts/load-datasets.py --corpus tei-texts --sample 5
```

The Python script uses inline dependency specification (requires Python >=3.10). Dependencies are automatically installed by uv.

**Format** (HuggingFace compatible):
```json
{
  "version": "1.0.0",
  "config": {"train": 0.7, "validation": 0.15, "test": 0.15, "seed": 42},
  "corpora": {
    "wright-american-fiction": {
      "train": ["file1.xml", "file2.xml", ...],
      "validation": [...],
      "test": [...]
    }
  }
}
```

See [scripts/load-datasets.py](./scripts/load-datasets.py) for usage examples and [datasets/README.md](./datasets/README.md) for complete dataset documentation.

### Integrated Corpora

**7 TEI corpora** with **10,819 documents** are integrated:

- **Wright American Fiction** (2,876 docs) - 19th century American novels
- **Victorian Women Writers** (199 docs) - Victorian-era literature
- **Indiana Magazine of History** (7,289 docs) - Historical articles
- **Indiana Authors Books** (394 docs) - Works by Indiana authors
- **Brevier Legislative Reports** (19 docs) - Legislative proceedings (1858-1887)
- **TEI Texts** (14 docs) - French novels
- **Novel Dialogism** (28 docs) - Richly annotated quotations

For detailed corpus statistics, speech tag patterns, and usage recommendations, see the [Corpus Reference](./docs/corpus-reference.md) documentation.

## Project Structure

```
tei-dialogue-editor/
├── app/                    # Next.js app directory
├── components/             # React components
│   ├── character/         # Character management
│   ├── editor/            # TEI editor components
│   ├── ui/                # shadcn/ui components
│   └── visualization/     # Statistics and charts
├── lib/                   # Core libraries
│   ├── ai/               # AI providers (OpenAI)
│   ├── context/          # React contexts
│   ├── tei/              # TEI document handling
│   └── validation/       # Schema validation
├── corpora/               # TEI corpus repositories (gitignored)
│   ├── novel-dialogism/   # Git submodule (source CSV/text data)
│   └── {corpus-name}/     # External corpus repositories
├── datasets/              # ML-ready exports (gitignored)
│   ├── {corpus-name}/
│   │   ├── train/
│   │   ├── validation/
│   │   └── test/
│   └── splits.json
├── tests/                 # Test suites
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── corpora/          # Corpus analysis metadata (gitignored)
└── __tests__/            # Setup and infrastructure tests
```

## AI Configuration

To use AI-assisted dialogue detection, set up an OpenAI API key:

1. Create a `.env.local` file in the project root
2. Add your API key: `OPENAI_API_KEY=your-key-here`
3. The AI detection feature will use GPT-4 to identify dialogue passages

## TEI XML Support

This tool works with TEI-encoded novels and follows the TEI Guidelines for:

- `<said>` elements for speech attribution
- `<q>` elements for quotations
- `<sp>` (speech) and `<speaker>` elements for dramatic text
- Character identification through `who` attributes

## License

MIT
