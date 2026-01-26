# Pattern Engine (Rust WASM)

This is a Rust-based pattern matching engine compiled to WebAssembly for high-performance speaker detection in the TEI Dialogue Editor.

## Prerequisites

### Required Tools

1. **Rust toolchain** (with wasm32 target):
   ```bash
   rustc --version
   rustup target list | grep wasm32
   ```

2. **wasm-pack** - Build tool for Rust-WASM:
   ```bash
   cargo install wasm-pack
   ```

3. **Linker** - For WASM compilation:
   - On most systems: Install LLVM/Clang (provides lld)
   - NixOS/nix users: Add `llvm` or `clang` to your environment

### Installing the Linker

#### NixOS/nix:
```bash
# Add to your shell.nix or flake.nix:
buildInputs = [ rustc cargo llvm ];

# Or use nix-shell:
nix-shell -p rustc cargo llvm
```

#### Ubuntu/Debian:
```bash
sudo apt install lld
```

#### macOS:
```bash
brew install llvm
```

## Building the WASM Module

From the project root:

```bash
cd pattern-engine
wasm-pack build --target web --out-dir ../public/wasm
```

This will generate:
- `../public/wasm/pattern_engine.js` - JavaScript glue code
- `../public/wasm/pattern_engine_bg.wasm` - WebAssembly binary
- `../public/wasm/pattern_engine.d.ts` - TypeScript definitions

## Development

### Running Tests

```bash
cd pattern-engine
cargo test
```

### Code Structure

- `src/lib.rs` - Main library with WASM exports
- `Cargo.toml` - Dependencies and build configuration
- `.cargo/config.toml` - Cargo configuration for linker

## WASM Exports

The compiled WASM module exports these JavaScript functions:

### `detect_speaker(text: string, patterns: object): string`
Analyzes text and suggests a speaker ID based on pattern matching.

### `update_from_feedback(db: object, passage: string, speaker: string): void`
Updates the pattern database based on user corrections.

### `calculate_confidence(text: string, speaker: string, patterns: object): number`
Calculates a confidence score (0-1) for speaker detection.

## JavaScript Integration

Use the loader from `lib/pattern/wasm-loader.ts`:

```typescript
import { detectSpeaker, calculateConfidence } from '@/lib/pattern/wasm-loader';

// Detect speaker
const speaker = await detectSpeaker(text, patterns);

// Get confidence score
const confidence = await calculateConfidence(text, speaker, patterns);
```

## Troubleshooting

### "linker `lld` not found"
Install the lld linker (see Prerequisites above).

### "wasm32-unknown-unknown target not found"
```bash
rustup target add wasm32-unknown-unknown
```

### WASM module fails to load
1. Ensure the WASM has been built: `ls public/wasm/pattern_engine.js`
2. Check browser console for specific errors
3. The loader includes a fallback mock implementation for development
