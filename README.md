# TEI Dialogue Editor

A web-based tool for annotating dialogue in TEI XML novels.

## Features

- **Upload and Edit TEI XML Files**: Import TEI documents and edit them in a browser-based interface
- **Tag Dialogue with TEI Elements**: Add `<said>` and `<q>` elements to mark dialogue passages
- **AI-Assisted Dialogue Detection**: Leverage OpenAI GPT models to automatically identify and tag dialogue
- **Character Management**: Define and manage character roster for consistent attribution
- **Visualization and Statistics**: View dialogue distribution and character interaction statistics
- **Export to TEI or HTML**: Generate annotated TEI XML or styled HTML output

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to use the application.

### Production Build

```bash
npm run build
npm start
```

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
