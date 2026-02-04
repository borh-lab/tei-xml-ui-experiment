# Feature Demos

This page showcases all the documentation videos demonstrating key features of the TEI Dialogue Editor.

## Quick Highlights

Short videos showing UI elements in motion. These videos autoplay and loop for quick preview.

### AI Suggestions

<video width="800" autoplay loop muted playsinline>
  <source src="/docs/videos/highlights/ai-suggestions.webm" type="video/webm">
</video>

The AI suggestions panel analyzes dialogue passages and suggests speaker tags. Click accept or reject to speed up annotation.

### Command Palette

<video width="800" autoplay loop muted playsinline>
  <source src="/docs/videos/highlights/command-palette.webm" type="video/webm">
</video>

Press `Cmd+K` (or `Ctrl+K`) to quickly access any command. Search and navigate to features without leaving the keyboard.

### Bulk Operations

<video width="800" autoplay loop muted playsinline>
  <source src="/docs/videos/highlights/bulk-operations.webm" type="video/webm">
</video>

Press `Cmd+B` to open bulk operations. Select all untagged passages, export TEI, or validate document structure.

### Keyboard Shortcuts

<video width="800" autoplay loop muted playsinline>
  <source src="/docs/videos/highlights/keyboard-shortcuts.webm" type="video/webm">
</video>

Press `?` to view all keyboard shortcuts. Navigate passages, tag speakers, and access commands without touching the mouse.

### Character Network

<video width="800" autoplay loop muted playsinline>
  <source src="/docs/videos/highlights/character-network.webm" type="video/webm">
</video>

View character relationships and dialogue statistics in the visualizations panel. Explore network graphs and interaction patterns.

## Full Workflows

Complete step-by-step demonstrations of key features. These videos have controls for pausing and scrubbing.

### Annotation Workflow

<video width="800" controls playsinline>
  <source src="/docs/videos/workflows/annotation-workflow.webm" type="video/webm">
</video>

Complete walkthrough of manual annotation:
1. Open the editor with auto-loaded document
2. Click on a passage to select it
3. Press `1-5` to tag with a speaker
4. Use `j/k` to navigate between passages
5. Export TEI document when complete

### AI Assisted Session

<video width="800" controls playsinline>
  <source src="/docs/videos/workflows/ai-assisted-session.webm" type="video/webm">
</video>

Using AI suggestions to speed up annotation:
1. Enable "AI Suggest" mode
2. Review suggested tags with confidence scores
3. Accept or reject with one click
4. System learns from your corrections
5. Export final TEI document

### Bulk Operations Workflow

<video width="800" controls playsinline>
  <source src="/docs/videos/workflows/bulk-operations-workflow.webm" type="video/webm">
</video>

Process multiple passages at once:
1. Open bulk operations with `Cmd+B`
2. Select all untagged passages (`Shift+Cmd+U`)
3. Tag all selections with chosen speaker
4. Export or validate the complete document

## Notes

- Videos are in WebM format with VP9 codec for optimal compression and quality
- Highlight videos are typically 5-10 seconds at ~500K bitrate
- Workflow videos are 15-60 seconds at ~1M bitrate
- All videos are generated automatically using Playwright browser automation

To regenerate these videos, run:
```bash
bun run docs:videos
```

For development, use watch mode to automatically regenerate on source changes:
```bash
bun run docs:videos:watch
```
