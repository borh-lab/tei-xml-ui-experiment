# Contributing to TEI Dialogue Editor

Thank you for your interest in contributing! This document provides guidelines for contributing to the TEI Dialogue Editor project.

## Development Setup

### Prerequisites

**Option 1: Bun (Recommended)**

- Bun 1.0 or higher
- Git

**Option 2: npm**

- Node.js 18 or higher
- npm (comes with Node.js)
- Git

**Option 3: Nix (Reproducible Environment)**

- Nix with flakes enabled
- Git

### Getting Started

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/your-username/tei-dialogue-editor.git
   cd tei-dialogue-editor
   ```

2. **Install dependencies**

   **With Bun (Recommended - much faster):**

   ```bash
   bun install
   ```

   **With npm:**

   ```bash
   npm install
   ```

   **With Nix (automatic dependency setup):**

   ```bash
   nix develop
   # Or with direnv:
   direnv allow
   ```

3. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Start development server**

   **With Bun:**

   ```bash
   bun run dev
   ```

   **With npm:**

   ```bash
   npm run dev
   ```

   The application will be available at [http://localhost:3000](http://localhost:3000)

### Why Bun?

Bun is recommended for development because it's:

- **10-100x faster** than npm for installs
- **Native TypeScript support** - no transpilation needed
- **Compatible** with Node.js ecosystem and package.json
- **Faster runtime** - Uses JIT compilation for faster execution

All npm scripts work with `bun run` instead of `npm run`.

## Project Structure

The project follows a typical Next.js app directory structure with additional organization:

```
tei-dialogue-editor/
├── app/                    # Next.js app router pages
├── components/             # React components organized by feature
│   ├── character/         # Character management components
│   ├── editor/            # TEI editor UI
│   ├── shared/            # Shared components
│   ├── ui/                # Base UI components (shadcn/ui)
│   └── visualization/     # Statistics and charts
├── lib/                   # Core business logic
│   ├── ai/               # AI provider implementations
│   ├── context/          # React context providers
│   ├── tei/              # TEI document model and operations
│   ├── utils/            # Utility functions
│   └── validation/       # TEI schema validation
├── tests/                 # Test suites
│   ├── unit/             # Unit tests
│   └── integration/      # Integration tests
└── __tests__/            # Setup and component tests
```

## Coding Standards

### Test-Driven Development (TDD)

This project follows TDD practices:

1. **Write tests first** - Before implementing new features, write tests that define the expected behavior
2. **Run tests** - Execute `npm test` to see them fail
3. **Implement** - Write the minimum code to make tests pass
4. **Refactor** - Improve the code while keeping tests green

### TypeScript

- Use TypeScript for all new code
- Define explicit types for functions, components, and data structures
- Avoid `any` types - use proper type definitions or `unknown` when necessary
- Enable strict type checking in `tsconfig.json`

### Code Style

- Use conventional commits for commit messages (see below)
- Follow ESLint configuration - run `npm run lint` to check
- Use Prettier for code formatting (configured with ESLint)
- Keep functions small and focused
- Write descriptive variable and function names

## Testing

### Running Tests

```bash
# With Bun (recommended - faster)
bun test

# With npm
npm test

# Run tests in watch mode
bun test -- --watch  # or npm test -- --watch

# Run tests with coverage
bun test -- --coverage
```

### Writing Tests

- Place unit tests in `tests/unit/` or `__tests__/`
- Place integration tests in `tests/integration/`
- Use Jest and React Testing Library
- Mock external dependencies (API calls, file system)
- Test components, utilities, and business logic

Example test structure:

```typescript
describe('TEIDocument', () => {
  describe('tagDialogue', () => {
    it('should wrap selected text in said element', () => {
      const doc = new TEIDocument(sampleTEI);
      const result = doc.tagDialogue(0, 100, { who: '#char1' });
      expect(result).toContain('<said who="#char1">');
    });
  });
});
```

## Conventional Commits

This project uses conventional commits to automate changelog generation and semantic versioning.

### Commit Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks
- **perf**: Performance improvements

### Examples

```bash
feat(editor): add dialogue detection AI assistant
fix(tei): handle empty text nodes correctly
test(ai): add mocking for OpenAI API
docs(readme): update installation instructions
refactor(selection): extract text range utilities
```

## Pull Request Guidelines

### Before Submitting

1. **Ensure tests pass**

   ```bash
   bun test           # or npm test
   bun run build      # or npm run build
   ```

2. **Run linting** (if you have pre-commit hooks installed via Nix)
   Pre-commit hooks will automatically run when you enter the Nix dev shell:

   ```bash
   nix develop
   ```

   Or manually:

   ```bash
   bun run lint       # or npm run lint
   ```

3. **Update documentation** if you've changed functionality
   - Update README.md for user-facing changes
   - Add comments for complex logic

4. **Write descriptive commit messages**
   - Use conventional commit format
   - Reference related issues

### Submitting a Pull Request

1. **Push your branch**

   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a pull request** on GitHub
   - Use a clear title describing the change
   - Reference related issues (e.g., "Fixes #123")
   - Describe what you changed and why
   - Include screenshots for UI changes

3. **Respond to review feedback**
   - Address requested changes
   - Push additional commits to your branch
   - Keep the PR history clean

### PR Review Process

- Maintainers will review your PR
- Address any feedback or requested changes
- Once approved, your PR will be merged
- Thank you for your contribution!

## Getting Help

- **Issues**: Check [GitHub Issues](https://github.com/your-org/tei-dialogue-editor/issues) for known problems
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: See README.md for usage documentation

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [TEI Guidelines](https://tei-c.org/guidelines/)
- [React Testing Library](https://testing-library.com/react)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
