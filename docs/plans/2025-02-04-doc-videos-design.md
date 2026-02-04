# Documentation Videos Design

**Date:** 2025-02-04
**Status:** Design Approved
**Author:** Claude Code

## Overview

Create a flexible video generation system that produces WebM demos for documentation, replacing static screenshots with motion highlights and adding workflow demos to a central page.

### Goals

1. **Motion highlights** (5-10s, autoplay, no controls) - Replace inline screenshots
2. **Workflow demos** (15-60s, with controls) - Full feature demonstrations
3. **WebM format** - Better compression than GIF, modern browser support
4. **Automated generation** - Script-based, reproducible recordings
5. **Watch mode** - Regenerate on source changes during development

### Non-Goals

- Live streaming or real-time video
- Video editing capabilities
- Multiple format exports (WebM only)
- Automatic committing of generated videos

## Architecture

### Core Principles

1. **Values over places** - Configuration is pure data, not mutable state
2. **Explicit over "smart"** - No hidden heuristics, visible behavior
3. **Pure functions** - Recording is inputs → outputs, no mutation
4. **Separate concerns** - Recording, optimization, and watching are independent

### System Diagram

```
┌─────────────────┐
│  CLI Entry      │
│  (generate-     │
│   doc-videos.ts)│
└────────┬────────┘
         │
    ┌────┴────┐
    │ Filter? │
    └────┬────┘
         │
    ┌────┴─────────────────┐
    │                      │
┌───▼────┐          ┌─────▼─────┐
│ Record │          │  Watch    │
│  Demo  │          │ Orchestr. │
└───┬────┘          └─────┬─────┘
    │                     │
┌───▼────────┐            │
│ Optimize   │            │
│   Video    │            │
└───┬────────┘            │
    │                     │
┌───▼─────────────────────▼─────┐
│      docs/videos/              │
│  ├── highlights/ (autoplay)    │
│  └── workflows/ (controls)     │
└────────────────────────────────┘
```

## File Structure

```
scripts/
  demo-config.ts           # Demo definitions + layout config
  recording-helpers.ts     # Explicit timing primitives
  record-demo.ts           # Pure recording functions
  video-optimizer.ts       # Type-based presets
  generate-doc-videos.ts   # Main CLI entry point
  watch-docs.ts            # Separate watch orchestrator
  generate-markdown.ts     # Video tag helper

docs/
  videos/
    highlights/            # Short autoplay videos (5-10s)
      ai-suggestions.webm
      command-palette.webm
      bulk-operations.webm
    workflows/             # Longer controlled videos (15-60s)
      annotation-workflow.webm
      ai-assisted-session.webm
      character-network.webm
  demos.md                 # Central video gallery
  plans/
    2025-02-04-doc-videos-design.md  # This document
```

## Component Design

### 1. Configuration (demo-config.ts)

**Purpose:** Define what to record, separate from where things go.

```typescript
export const demos = {
  'ai-suggestions': {
    type: 'highlight' as const,
    steps: [
      ['goto', '/'],
      ['waitForSelector', '[data-testid="ai-ai-suggest"]'],
      ['click', '[data-testid="ai-ai-suggest"]'],
      ['waitForStable'],
      ['pause', 2000]
    ]
  },
  'annotation-workflow': {
    type: 'workflow' as const,
    steps: [
      ['goto', '/'],
      ['waitForSelector', '.passage'],
      ['click', '.passage:first-child'],
      ['pause', 500],
      ['press', '1'],
      ['waitForStable'],
      ['pause', 1000]
    ]
  }
} as const;

// Single source of truth for file layout
export const layout = {
  highlightDir: 'docs/videos/highlights',
  workflowDir: 'docs/videos/workflows',
  docsDir: 'docs'
};

// Path computation (derived, not stored)
export function pathFor(name: string, config: DemoConfig): string {
  const base = config.type === 'highlight'
    ? layout.highlightDir
    : layout.workflowDir;
  return `${base}/${name}.webm`;
}
```

**Why this design:**
- Demo configs are values (can be serialized, validated)
- Layout is single source of truth (change once, affects all)
- Paths are computed, not stored (separation of concerns)

### 2. Recording Helpers (recording-helpers.ts)

**Purpose:** Explicit timing primitives, no hidden "smartness."

```typescript
export async function waitForStable(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => {
    return document.getAnimations().length === 0;
  });
}

export async function clickWithDelay(
  page: Page,
  selector: string,
  delay = 100
): Promise<void> {
  await page.waitForSelector(selector);
  await page.locator(selector).click();
  await page.waitForTimeout(delay);
}

export async function pause(page: Page, ms: number): Promise<void> {
  await page.waitForTimeout(ms);
}

export async function smoothTransition(
  page: Page,
  action: () => Promise<void>
): Promise<void> {
  await action();
  await waitForStable(page);
  await pause(page, 500);
}
```

**Why this design:**
- Each function does one thing clearly
- No hidden "intelligence" or adaptation
- Easy to debug (step through and see exact timing)
- Composable (combine primitives in new ways)

### 3. Recording Function (record-demo.ts)

**Purpose:** Pure function - inputs in, value out. No mutation.

```typescript
export async function recordDemo(
  name: string,
  config: DemoConfig
): Promise<string> {
  const outputDir = join(tmpdir(), `demo-${Date.now()}`);
  await mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    recordVideo: {
      dir: outputDir,
      size: { width: 1280, height: 720 }
    }
  });

  const page = await context.newPage();
  await executeSteps(page, config.steps);

  const video = await page.video();
  if (!video) {
    await browser.close();
    throw new Error(`No video recorded for: ${name}`);
  }

  const rawPath = video.path();
  const finalPath = pathFor(name, config);

  await mkdir(layout[config.type + 'Dir'], { recursive: true });
  await optimizeVideo(rawPath, finalPath, config.type);

  await browser.close();
  return finalPath;
}
```

**Why this design:**
- No global state or mutable variables
- Each call is independent (can parallelize safely)
- Return values make data flow explicit
- Easy to test (input → output, no hidden dependencies)

### 4. Video Optimizer (video-optimizer.ts)

**Purpose:** Type-based presets, no hidden motion detection.

```typescript
const presets = {
  highlight: {
    codec: 'libvpx-vp9',
    bitrate: '500K',
    fps: 15,
    crf: 32,
    'cpu-used': 4
  },
  workflow: {
    codec: 'libvpx-vp9',
    bitrate: '1M',
    fps: 24,
    crf: 28,
    'cpu-used': 2
  }
} as const;

export async function optimizeVideo(
  input: string,
  output: string,
  type: 'highlight' | 'workflow'
): Promise<void> {
  const preset = presets[type];
  const args = [
    '-i', input,
    '-c:v', preset.codec,
    '-b:v', preset.bitrate,
    '-r', String(preset.fps),
    '-crf', String(preset.crf),
    '-cpu-used', String(preset['cpu-used']),
    '-y',
    output
  ];

  await execAsync(`ffmpeg ${args.join(' ')}`);
}
```

**Optional: Explicit motion detection** (if needed):
```typescript
export async function measureMotion(videoPath: string): Promise<number> {
  const { stdout } = await execAsync(
    `ffmpeg -i ${videoPath} -filter:v "select='gt(scene,0.1)'" -f null -`
  );
  return (stdout.match(/n:/g) || []).length;
}
```

**Why this design:**
- Standard presets are predictable
- Motion detection is explicit and optional
- Easy to test (same input → same output)
- Can debug why a video got a certain bitrate

### 5. CLI Entry (generate-doc-videos.ts)

**Purpose:** Main CLI interface, delegates to watch orchestrator.

```typescript
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--watch')) {
    const { watchDocs } = await import('./watch-docs');
    return watchDocs();
  }

  const filter = args.find(arg => !arg.startsWith('--'));
  const recordings = filter
    ? await recordMatching(filter)
    : await recordAll();

  console.log(`Generated ${recordings.length} videos:`);
  recordings.forEach(path => console.log(`  ${path}`));
}
```

### 6. Watch Orchestrator (watch-docs.ts)

**Purpose:** Separate orchestration - no recording logic.

```typescript
export async function watchDocs(): Promise<void> {
  if (watcher) {
    console.log('Already watching');
    return;
  }

  console.log('Watching for changes...');

  watcher = watch(join(process.cwd(), 'src/**/*.tsx'))
    .on('change', (path) => {
      console.log(`Changed: ${path}`);

      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        console.log('Regenerating videos...');
        exec('bun run docs:videos', (error, stdout, stderr) => {
          if (error) console.error(stderr);
          else console.log(stdout);
        });
      }, 1000);
    });

  await new Promise(() => {});
}
```

**Why this design:**
- Recording script stays simple (CLI → record → return)
- Watch logic is separate and can evolve independently
- Can change file patterns without touching recording code
- Debounce logic is explicit and visible

### 7. Markdown Helper (generate-markdown.ts)

**Purpose:** Generate consistent HTML `<video>` tags.

```typescript
export function videoTag(
  name: string,
  type: 'highlight' | 'workflow',
  options: { autoplay?: boolean; loop?: boolean; controls?: boolean } = {}
): string {
  const defaults = type === 'highlight'
    ? { autoplay: true, loop: true, controls: false }
    : { autoplay: false, loop: false, controls: true };

  const opts = { ...defaults, ...options };
  const path = pathFor(name, { type });

  return `<video width="800" ${opts.autoplay ? 'autoplay' : ''} ${opts.loop ? 'loop' : ''} ${opts.controls ? 'controls' : ''} muted playsinline>
  <source src="/${path}" type="video/webm">
</video>`;
}
```

## CLI Usage

```bash
# Generate all videos
bun run docs:videos

# Generate specific video
bun run docs:videos ai-suggestions

# Watch mode (regenerate on changes)
bun run docs:videos --watch
```

## Video Types

### Short Highlights (5-10s)

**Purpose:** Replace inline screenshots, show UI in motion.

**Features:**
- Autoplay, loop, no controls
- Lower bitrate (500K), 15 fps
- Embed in feature documentation

**Examples:**
- AI suggestions panel appearing
- Command palette opening
- Bulk operations panel
- Keyboard shortcuts help

### Workflow Demos (15-60s)

**Purpose:** Complete feature demonstrations.

**Features:**
- Controls enabled, no autoplay
- Higher bitrate (1M), 24 fps
- Centralized in `docs/demos.md`

**Examples:**
- Full annotation workflow
- AI-assisted tagging session
- Character network exploration
- Multi-step bulk operations

## Markdown Embedding

### Inline (replacing screenshots)

```markdown
<!-- Before -->
![AI Suggestions](docs/screenshots/ai-suggestions.png)

<!-- After -->
<video width="800" autoplay loop muted playsinline>
  <source src="/docs/videos/highlights/ai-suggestions.webm" type="video/webm">
</video>
```

### Central demos page

```markdown
# Feature Demos

## Quick Highlights

### AI Suggestions
<video width="800" autoplay loop muted playsinline>
  <source src="/docs/videos/highlights/ai-suggestions.webm" type="video/webm">
</video>

The AI suggestions panel analyzes dialogue passages and suggests speaker tags.

## Full Workflows

### Annotation Workflow
<video width="800" controls>
  <source src="/docs/videos/workflows/annotation-workflow.webm" type="video/webm">
</video>

Complete walkthrough: load document → select passage → tag speaker → navigate.
```

## Dependencies

### Runtime

- `playwright` - Browser automation
- `ffmpeg` - Video optimization (system dependency)
- `chokidar` - File watching
- `tsx` or `bun` - TypeScript execution

### Dev

- TypeScript types
- tsx/bun for running scripts

## Implementation Considerations

### FFmpeg Installation

**Linux (Debian/Ubuntu):**
```bash
sudo apt-get install ffmpeg
```

**Nix:**
Already available in the development environment.

**macOS:**
```bash
brew install ffmpeg
```

### AI Suggestions Note

Current AI suggestions use heuristic-based fallback (not LLMs). Videos will demonstrate the heuristic behavior. When LLM integration is complete, demo steps may need adjustment for actual response times.

### Browser Compatibility

WebM with VP9 codec:
- Chrome/Firefox/Edge: Full support
- Safari: Partial (VP9 supported in Safari 14+)
- Fallback: Static screenshots remain in documentation

## Testing Strategy

### Unit Tests

- `recording-helpers.ts` - Test timing primitives with mock Page
- `video-optimizer.ts` - Test ffmpeg command generation
- `generate-markdown.ts` - Test video tag output

### Integration Tests

- `record-demo.ts` - Test recording with real browser (slow tests)
- Verify video files are created
- Check optimization produces valid WebM

### Manual Testing

- Watch all generated videos for quality
- Test embed in actual markdown renderer
- Verify file sizes are reasonable (< 1MB for highlights, < 5MB for workflows)

## Future Enhancements

### Potential Improvements

1. **Adaptive bitrate** - Use motion detection for variable bitrate
2. **Multi-format export** - Also generate MP4 for broader compatibility
3. **Thumbnail generation** - Create poster images for videos
4. **CI integration** - Automatically regenerate videos on PR to docs
5. **Video diffing** - Detect significant changes and flag for review

### Out of Scope

- Video editing capabilities (trimming, splicing)
- Audio recording or narration
- Screen annotation or overlays
- Real-time streaming

## Design Principles Applied

### Simplicity Over Ease

- **Recording helpers** are explicit, not "smart"
- Each function does one thing clearly
- No hidden heuristics or adaptation

### Values Over Places

- **Configuration** is pure data (can be serialized)
- **Paths** are computed, not stored
- **Recording** returns values, no mutation

### Design for Composition

- **Helpers** can combine in new ways
- **Watch mode** is separate from recording
- **Optimizer** can be swapped without changing recording

### Explicit Time Modeling

- **Steps** are declarative arrays
- **Timing** is visible in config
- No hidden state transitions

## References

- [Playwright Video Recording](https://playwright.dev/docs/video)
- [WebM Project](https://www.webmproject.org/)
- [VP9 Codec](https://www.webmproject.org/docs/encoder-parameters/)
- Hickey-style design review (see skill: rich-hickey-review)
