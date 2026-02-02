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

Quick setup:

```bash
# Install dependencies
npm install

# Set up environment variables (optional)
cp .env.local.example .env.local

# Run development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to use the application.

- For detailed setup instructions: [DEPLOYMENT.md](./DEPLOYMENT.md)
- For feature documentation and user guide: [FEATURES.md](./FEATURES.md)

## Testing

The project uses Jest with React Testing Library.

```bash
npm test
```

Test suites include:
- Unit tests for TEI document operations
- AI provider tests (with mocking)
- Integration tests using Wright American Fiction samples
- Component tests

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
