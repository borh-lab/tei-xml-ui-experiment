# Documentation Videos - Implementation Plan

**Date:** 2025-02-04
**Status:** Ready for Implementation
**Design:** [2025-02-04-doc-videos-design.md](./2025-02-04-doc-videos-design.md)

## Overview

Implement the documentation video generation system designed in the companion design document. This plan breaks down the work into independent, testable components using Bun for package management.

## Prerequisites

- [x] Design approved and committed
- [ ] ffmpeg installed (check with `ffmpeg -version`)
- [ ] bun installed as package manager

## Phase 1: Foundation Setup

### 1.1 Install Dependencies

**Tasks:**
- [ ] Install `chokidar` for file watching
- [ ] Add type definitions
- [ ] Verify ffmpeg is available

**Commands:**
```bash
bun add chokidar
bun add -d @types/chokidar
ffmpeg -version  # Verify system dependency
```

**Acceptance:**
- `package.json` includes chokidar
- `ffmpeg -version` outputs version info

---

## Phase 2: Core Modules (Independent)

### 2.1 Configuration Module

**File:** `scripts/demo-config.ts`

**Tasks:**
- [ ] Create `demos` object with all video definitions
- [ ] Define `layout` object for file paths
- [ ] Implement `pathFor()` function
- [ ] Add TypeScript types

**Demo Definitions to Create:**

**Highlights (replace screenshots):**
- [ ] `ai-suggestions` - Show AI suggestions panel
- [ ] `command-palette` - Show Cmd+K palette
- [ ] `bulk-operations` - Show bulk operations panel
- [ ] `keyboard-shortcuts` - Show shortcuts help

**Workflows (full demos):**
- [ ] `annotation-workflow` - Load doc, select passage, tag, navigate
- [ ] `ai-assisted-session` - Enable AI, review suggestions, accept/reject

**Acceptance:**
- Module exports `demos`, `layout`, `pathFor`
- `pathFor()` returns correct paths for both types
- TypeScript compiles without errors

**Testing:**
```bash
bun run scripts/demo-config.ts  # Should export without errors
```

---

### 2.2 Recording Helpers Module

**File:** `scripts/recording-helpers.ts`

**Tasks:**
- [ ] Implement `waitForStable(page)` - network idle + no animations
- [ ] Implement `clickWithDelay(page, selector, delay)` - click with pause
- [ ] Implement `pause(page, ms)` - explicit timeout
- [ ] Implement `smoothTransition(page, action)` - wrapper
- [ ] Add TypeScript types for Page, Step, etc.

**Acceptance:**
- All helpers use explicit timing (no "smart" adaptation)
- `waitForStable()` waits for both network and animations
- Functions are composable (can be called independently)

**Testing:**
```bash
# Create test file: scripts/__tests__/recording-helpers.test.ts
bun test scripts/__tests__/recording-helpers.test.ts
```

---

### 2.3 Video Optimizer Module

**File:** `scripts/video-optimizer.ts`

**Tasks:**
- [ ] Define `presets` object (highlight, workflow)
- [ ] Implement `optimizeVideo(input, output, type)` function
- [ ] Add error handling for ffmpeg failures
- [ ] (Optional) Implement `measureMotion(path)` for future use

**Acceptance:**
- Generates valid WebM files
- Highlight videos are ~500K bitrate, 15 fps
- Workflow videos are ~1M bitrate, 24 fps
- Throws descriptive errors on ffmpeg failure

**FFmpeg Commands to Implement:**

```bash
# Highlight preset
ffmpeg -i input.webm -c:v libvpx-vp9 -b:v 500K -r 15 -crf 32 -cpu-used 4 -y output.webm

# Workflow preset
ffmpeg -i input.webm -c:v libvpx-vp9 -b:v 1M -r 24 -crf 28 -cpu-used 2 -y output.webm
```

**Testing:**
```bash
# Manually test with a sample WebM
bun run scripts/test-optimizer.ts
```

---

### 2.4 Recording Module

**File:** `scripts/record-demo.ts`

**Tasks:**
- [ ] Implement `executeSteps(page, steps)` - interpret step arrays
- [ ] Implement `recordDemo(name, config)` - main recording function
- [ ] Implement `recordAll()` - batch recording
- [ ] Implement `recordMatching(filter)` - filtered recording
- [ ] Add cleanup for temp directories

**Step Primitives to Implement:**
```typescript
const primitives = {
  goto: (page, url) => page.goto(url),
  click: (page, selector) => clickWithDelay(page, selector),
  press: (page, key) => page.keyboard.press(key),
  waitForSelector: (page, selector) => page.waitForSelector(selector),
  waitForStable: (page) => waitForStable(page),
  pause: (page, ms) => pause(page, ms)
};
```

**Acceptance:**
- Records videos to temp directory, then optimizes to final location
- Creates output directories if missing
- Returns array of generated file paths
- Throws descriptive errors on recording failure

**Testing:**
```bash
# Record single demo
bun run docs:videos ai-suggestions

# Should create: docs/videos/highlights/ai-suggestions.webm
```

---

## Phase 3: CLI & Watch Mode

### 3.1 CLI Entry Point

**File:** `scripts/generate-doc-videos.ts`

**Tasks:**
- [ ] Implement argument parsing (filter, --watch)
- [ ] Delegate to `record-demo.ts` for recording
- [ ] Delegate to `watch-docs.ts` for watch mode
- [ ] Print summary of generated videos

**Acceptance:**
```bash
bun run docs:videos              # Generate all
bun run docs:videos ai-suggestions  # Generate one
bun run docs:videos --watch      # Watch mode
```

---

### 3.2 Watch Orchestrator

**File:** `scripts/watch-docs.ts`

**Tasks:**
- [ ] Implement `watchDocs()` using chokidar
- [ ] Add debouncing (1s delay)
- [ ] Execute `bun run docs:videos` on changes
- [ ] Implement `stopWatching()` for cleanup
- [ ] Handle process signals (SIGINT, SIGTERM)

**Watch Pattern:**
```typescript
watch('src/**/*.tsx')
  .on('change', debounce(() => {
    exec('bun run docs:videos');
  }, 1000));
```

**Acceptance:**
- Watch mode runs until interrupted
- Regenerates videos on source file changes
- Debounce prevents excessive regenerations
- Clean shutdown on Ctrl+C

**Testing:**
```bash
bun run docs:videos --watch
# Make a change to src/**/*.tsx
# Should regenerate videos after 1s
```

---

## Phase 4: Markdown Integration

### 4.1 Markdown Helper Module

**File:** `scripts/generate-markdown.ts`

**Tasks:**
- [ ] Implement `videoTag(name, type, options)` function
- [ ] Add default options per type (autoplay for highlights)
- [ ] Test HTML output validity

**Acceptance:**
- Generates valid HTML `<video>` tags
- Highlights have autoplay, loop, muted, no controls
- Workflows have controls, no autoplay

**Testing:**
```bash
bun run -e "import('./scripts/generate-markdown.ts').then(m => console.log(m.videoTag('test', 'highlight')))"
```

---

### 4.2 Create Demos Page

**File:** `docs/demos.md`

**Tasks:**
- [ ] Create markdown with video embeds
- [ ] Add descriptions for each demo
- [ ] Organize by type (highlights vs workflows)
- [ ] Test video playback in markdown renderer

**Content Structure:**
```markdown
# Feature Demos

## Quick Highlights

### AI Suggestions
<video>...</video>
The AI suggestions panel analyzes dialogue passages...

## Full Workflows

### Annotation Workflow
<video>...</video>
Complete walkthrough:...
```

**Acceptance:**
- All videos embed correctly
- Videos play in browser
- Page renders in markdown viewer

---

### 4.3 Update Existing Documentation

**Files to Update:**
- `README.md` (if relevant)
- Feature documentation pages
- Any docs referencing screenshots

**Tasks:**
- [ ] Identify screenshots to replace with videos
- [ ] Replace `![]()` with `<video>` tags
- [ ] Update image references to video paths
- [ ] Test rendering

**Acceptance:**
- Old screenshot references removed
- New video tags work correctly
- Documentation renders properly

---

## Phase 5: package.json Scripts

### 5.1 Add npm Scripts

**File:** `package.json`

**Tasks:**
- [ ] Add `docs:videos` script
- [ ] Add `docs:videos:watch` script

**Scripts to Add:**
```json
{
  "scripts": {
    "docs:videos": "tsx scripts/generate-doc-videos.ts",
    "docs:videos:watch": "tsx scripts/generate-doc-videos.ts --watch"
  }
}
```

**Acceptance:**
```bash
bun run docs:videos              # Works
bun run docs:videos:watch        # Works
```

---

## Phase 6: Testing & Validation

### 6.1 Manual Testing

**Tasks:**
- [ ] Generate all videos (`bun run docs:videos`)
- [ ] Watch all generated videos for quality
- [ ] Test video playback in browser
- [ ] Test watch mode with file changes
- [ ] Verify file sizes are reasonable

**Expected Results:**
- Highlights: < 1MB each
- Workflows: < 5MB each
- All videos play smoothly
- No artifacts or glitches

---

### 6.2 Documentation Testing

**Tasks:**
- [ ] View `docs/demos.md` in browser/markdown viewer
- [ ] Test inline video embeds
- [ ] Test on different browsers (Chrome, Firefox, Safari)
- [ ] Verify autoplay works (where expected)

**Acceptance:**
- All videos play in target browsers
- Autoplay works on Chrome/Firefox
- Fallback to screenshots if needed

---

## Phase 7: Refinement & Polish

### 7.1 Performance Optimization

**Tasks:**
- [ ] Profile video generation time
- [ ] Optimize if > 30s per video
- [ ] Consider parallel generation for batch mode

**Acceptance:**
- Single video generates in < 30s
- Batch generation completes in reasonable time

---

### 7.2 Error Handling

**Tasks:**
- [ ] Add helpful error messages
- [ ] Handle missing ffmpeg gracefully
- [ ] Handle missing dev server gracefully
- [ ] Add retry logic for transient failures

**Acceptance:**
- Clear error messages for common failures
- Suggest fixes (e.g., "Install ffmpeg: apt-get install ffmpeg")

---

### 7.3 Developer Experience

**Tasks:**
- [ ] Add progress indicators
- [ ] Print estimated time remaining
- [ ] Show which demo is being recorded
- [ ] Add `--verbose` flag for debugging

**Acceptance:**
- User sees clear progress during generation
- Knows which demo is currently recording
- Can troubleshoot issues with `--verbose`

---

## Implementation Order

**Recommended sequence (each phase is independent):**

1. **Phase 1** - Foundation (dependencies)
2. **Phase 2.1** - Config module (pure data, no dependencies)
3. **Phase 2.2** - Recording helpers (standalone, testable)
4. **Phase 2.3** - Video optimizer (standalone, ffmpeg only)
5. **Phase 2.4** - Recording module (depends on 2.1, 2.2, 2.3)
6. **Phase 3.1** - CLI entry (depends on 2.4)
7. **Phase 3.2** - Watch mode (depends on 3.1)
8. **Phase 4** - Markdown integration (can be done in parallel)
9. **Phase 5** - package.json scripts (quick, can be done anytime)
10. **Phase 6** - Testing (after implementation)
11. **Phase 7** - Polish (after testing)

**Parallelization opportunities:**
- **Phase 2.1, 2.2, 2.3** can be done in parallel (independent modules)
- **Phase 4** can be done alongside Phases 2-3
- **Phase 5** can be done anytime

---

## Success Criteria

- [ ] All demo videos generate successfully
- [ ] Videos play in modern browsers (Chrome, Firefox, Safari)
- [ ] File sizes are reasonable (< 1MB highlights, < 5MB workflows)
- [ ] Watch mode works and regenerates on changes
- [ ] Documentation includes video embeds
- [ ] CLI commands work as expected
- [ ] Code follows design principles (pure functions, explicit timing)

---

## Notes

### AI Suggestions

Current implementation uses heuristic-based AI (not LLMs). Demo steps should account for actual response times. When LLM integration is complete, update `ai-suggestions` and `ai-assisted-session` demo steps with appropriate waits.

### Dev Server Requirement

Video recording requires the dev server to be running:
```bash
bun run dev  # In one terminal
bun run docs:videos  # In another
```

The `playwright.config.ts` already has `reuseExistingServer: true`, so this should work seamlessly.

### FFmpeg on Different Platforms

- **Linux:** `sudo apt-get install ffmpeg`
- **macOS:** `brew install ffmpeg`
- **Nix:** Already available in development environment
- **Windows:** Download from https://ffmpeg.org/download.html

---

## References

- [Design Document](./2025-02-04-doc-videos-design.md)
- [Playwright Video Docs](https://playwright.dev/docs/video)
- [WebM Project](https://www.webmproject.org/)
