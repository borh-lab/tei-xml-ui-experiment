# Feature Demos

This page showcases all the documentation videos demonstrating key features of the TEI Dialogue Editor.

## Quick Highlights

Short videos showing UI elements in motion. These videos autoplay and loop for quick preview.

### Command Palette

<video width="800" autoplay loop muted playsinline poster="/docs/videos/highlights/command-palette.png">
  <source src="/docs/videos/highlights/command-palette.webm" type="video/webm">
</video>

Press `Cmd+K` (or `Ctrl+K`) to quickly access any command. Search and navigate to features without leaving the keyboard.

### Bulk Operations

<video width="800" autoplay loop muted playsinline poster="/docs/videos/highlights/bulk-operations.png">
  <source src="/docs/videos/highlights/bulk-operations.webm" type="video/webm">
</video>

Press `Cmd+B` to open bulk operations. Select all untagged passages, export TEI, or validate document structure.

### Keyboard Shortcuts

<video width="800" autoplay loop muted playsinline poster="/docs/videos/highlights/keyboard-shortcuts.png">
  <source src="/docs/videos/highlights/keyboard-shortcuts.webm" type="video/webm">
</video>

Press `?` to view all keyboard shortcuts. Navigate passages, tag speakers, and access commands without touching the mouse.

### Character Network

<video width="800" autoplay loop muted playsinline poster="/docs/videos/highlights/character-network.png">
  <source src="/docs/videos/highlights/character-network.webm" type="video/webm">
</video>

View character relationships and dialogue statistics in the visualizations panel. Explore network graphs and interaction patterns.

### Navigation Demo

<video width="800" autoplay loop muted playsinline poster="/docs/videos/highlights/test-basic.png">
  <source src="/docs/videos/highlights/test-basic.webm" type="video/webm">
</video>

Navigate through passages using keyboard shortcuts. Use `j` (next) and `k` (previous) to move between dialogue segments.

## Full Workflows

Complete step-by-step demonstrations of key features. These videos have controls for pausing and scrubbing.

### Annotation Workflow

<video width="800" controls playsinline poster="/docs/videos/workflows/annotation-workflow.png">
  <source src="/docs/videos/workflows/annotation-workflow.webm" type="video/webm">
</video>

Complete walkthrough of manual annotation:
1. Open the editor with auto-loaded document
2. Click on a passage to select it
3. Press `1-5` to tag with a speaker
4. Use `j/k` to navigate between passages
5. Export TEI document when complete

### AI Assisted Session

<video width="800" controls playsinline poster="/docs/videos/workflows/ai-assisted-session.png">
  <source src="/docs/videos/workflows/ai-assisted-session.webm" type="video/webm">
</video>

Using AI suggestions to speed up annotation:
1. Enable "AI Suggest" mode
2. Review suggested tags with confidence scores
3. Accept or reject with one click
4. System learns from your corrections
5. Export final TEI document

## Notes

- Videos are in WebM format with VP9 codec for optimal compression and quality
- Highlight videos are typically 5-10 seconds with poster images
- Workflow videos are 15-60 seconds with controls
- All videos are generated automatically using Playwright browser automation

### Regenerating Videos

Generate all videos:
```bash
bun run docs:videos
```

Optimize and generate thumbnails after tests:
```bash
bun run docs:videos && bun run docs:videos:optimize
```

Watch mode (regenerate on source changes):
```bash
bun run docs:videos:watch
```

### Video Stats

| Video | Duration | Size | Type |
|-------|----------|------|------|
| command-palette | ~4s | 104KB | Highlight |
| bulk-operations | ~4s | 116KB | Highlight |
| keyboard-shortcuts | ~4s | 173KB | Highlight |
| character-network | ~4s | 301KB | Highlight |
| navigation-demo | ~4s | 204KB | Highlight |
| annotation-workflow | ~7s | 306KB | Workflow |
| ai-assisted-session | ~7s | 301KB | Workflow |

**Total: 1.5MB of documentation videos**
