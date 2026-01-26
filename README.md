# TEI Dialogue Editor

An AI-assisted tool for annotating dialogue in TEI XML documents.

## Features

- Manual dialogue annotation with TEI markup (`<said>`, `<q>`)
- AI-assisted dialogue detection (Ax framework with NLP fallback)
- Pattern learning from user corrections for improved accuracy
- Character network visualization
- Bulk operations for batch processing
- Sample gallery with annotated examples
- Quick search with regex support
- Recent documents tracking

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

For detailed setup instructions, including API key configuration and WASM compilation, see [DEPLOYMENT.md](./DEPLOYMENT.md).

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
