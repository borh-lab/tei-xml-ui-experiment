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

For detailed feature documentation, see [FEATURES.md](./FEATURES.md).

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

This project includes tools for analyzing TEI corpora:

```bash
# Setup, analyze, and generate train/val/test splits
bun run corpus:all

# Individual steps
bun run corpus:setup    # Clone/update corpus repositories
bun run corpus:analyze  # Analyze TEI documents
bun run corpus:split    # Generate train/val/test splits
```

See [scripts/README.md](./scripts/README.md) for details.

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
├── tests/                 # Test suites
│   ├── unit/             # Unit tests
│   └── integration/      # Integration tests
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
