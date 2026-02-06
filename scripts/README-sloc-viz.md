# SLOC Visualization Generator

Publication-quality, theme-agnostic SVG visualization showing SLOC (Source Lines of Code) growth and commit activity over git history.

## Features

- **Commit-by-commit granularity** - Captures parallel development work
- **Three-panel design:**
  - Top: SLOC growth by file type (multi-line chart)
  - Middle: Commit activity by type (stacked area chart)
  - Bottom: Code churn - lines added/removed (moving average smoothed)
- **Theme-agnostic:** Transparent background with neutral colors - works on both light AND dark themes!
- **Publication quality:** Vector SVG output, crisp at any resolution
- **Conference ready:** Large fonts, high contrast colors
- **Fast:** ~4.5 minutes for 100 commits using `uv` for dependencies

## Quick Start

```bash
# Generate visualization
./scripts/generate-sloc-viz.sh

# Or specify output file
./scripts/generate-sloc-viz.sh my-viz.svg

# Or specify sample size (default: 100 commits)
uv run scripts/generate-sloc-viz.py -n 200

# Process ALL commits (slow!)
uv run scripts/generate-sloc-viz.py -n 0
```

## Requirements

- `uv` - Python package manager (install from https://github.com/astral-sh/uv)
- Git repository with conventional commits
- `find`, `wc` - Standard Unix tools (for fast line counting)

## Output

**Primary:** `sloc-visualization.svg`
- Scalable vector graphics
- Publication quality
- Theme-agnostic (transparent background)
- Web-ready

**Console:**
- Progress indicator (tqdm)
- Summary statistics:
  - Initial/final SLOC by file type
  - Growth per file type
  - Commit type distribution

## What's Included in SLOC Count

**Source code files:**
- TypeScript (.ts)
- React/TSX (.tsx)
- Markdown (.md)
- Tests (*.test.ts, *.test.tsx, *.spec.ts, *.spec.tsx)
- Config JSON (package.json, tsconfig.json, next.config.js, components.json)

**Excluded:**
- All XML files
- TEI, corpora, datasets
- node_modules, .venv (dependencies)
- Build artifacts (.next, dist, build)
- Coverage reports, logs
- Git submodules
- Lock files

## Color Scheme

### File Types (Theme-Agnostic)
| Type | Color | Hex |
|------|-------|-----|
| TypeScript (.ts) | Dark Blue | #2563eb |
| React (.tsx) | Cyan | #0ea5e9 |
| Markdown | Dark Blue | #0891b2 |
| Config JSON | Amber | #f59e0b |
| Tests | Dark Yellow | #eab308 |

### Commit Types
| Type | Color | Hex |
|------|-------|-----|
| feat | Blue | #3b82f6 |
| fix | Orange | #f97316 |
| docs | Emerald | #10b981 |
| test | Yellow | #eab308 |
| refactor | Gray | #6b7280 |
| chore | Dark Gray | #4b5563 |
| perf | Purple | #8b5cf6 |
| other | Light Gray | #9ca3af |

### Theme Compatibility

- **Background:** Transparent (works on any theme)
- **Text:** Neutral gray (#333333)
- **Grid:** Subtle gray (#6b7280)
- **Colors:** High saturation, visible on both light and dark backgrounds

## Usage Examples

```bash
# Default (current directory, sloc-visualization.svg)
./scripts/generate-sloc-viz.sh

# Custom output file
./scripts/generate-sloc-viz.sh docs/images/sloc-growth.svg

# Process 200 commits instead of 100
./scripts/generate-sloc-viz.sh -n 200

# Different repository
uv run scripts/generate-sloc-viz.py /path/to/other/repo -o other-viz.svg
```

## Performance

- **Time:** ~4.5 minutes for 100 commits (sampled from ~480 total)
- **Speed:** ~2.7 seconds per commit
- **Progress:** Real-time tqdm indicator
- **Sampling:** Default 100 commits, adjustable with `-n` flag

## Design

### Three-Panel Layout

1. **SLOC Growth (Top)**
   - Multi-line chart showing code growth by file type
   - Captures actual source code only (no dependencies or test data)

2. **Commit Activity (Middle)**
   - Stacked area chart showing cumulative commit counts by type
   - Visualizes development patterns over time
   - Shows proportions of different commit types

3. **Code Churn (Bottom)**
   - Lines added (green) vs removed (red)
   - 7-commit moving average smooths spikes
   - Shows code evolution patterns

Complementary to Gource visualization:
- **Gource:** Animated 3D view of file edits
- **SLOC Viz:** Statistical growth patterns and commit activity

See: `docs/plans/2025-02-06-sloc-visualization-design.md`

## Technical Details

### Pipeline

1. **Git History Walk**
   - Sample commits chronologically (default: 100)
   - Parse conventional commit type
   - Extract timestamp

2. **SLOC Counting**
   - Checkout each commit (uses git stash for dirty working tree)
   - Fast line counting with `find + wc` (not cloc)
   - Count by file extension

3. **Data Collection**
   - Lines added/removed per commit (git diff --shortstat)
   - Organize by file type

4. **Visualization**
   - Matplotlib for rendering
   - SVG output (scalable)
   - Three-panel layout

### Data Structure

```python
{
  "timestamps": [datetime, ...],
  "sloc": {
    "TypeScript (.ts)": [440, 450, 460, ...],
    "React (.tsx)": [394, 400, 410, ...],
    "Markdown": [6149, 6200, 6250, ...],
    "Config JSON": [0, 50, 100, ...],
    "Tests": [394, 400, 410, ...],
  },
  "commit_types": ["feat", "fix", "docs", ...],
  "lines_added": [1200, 1500, 800, ...],
  "lines_removed": [200, 100, 0, ...],
}
```

## Troubleshooting

**Missing file types:**
- Edit `FILE_PATTERNS` in script
- Add your extensions

**Different sample size:**
```bash
./scripts/generate-sloc-viz.sh -n 50   # Fewer commits, faster
./scripts/generate-sloc-viz.sh -n 0    # All commits, very slow
```

**Dirty working tree:**
- Script automatically stashes/restores changes
- No manual cleanup needed

**No data showing:**
- Check if files exist in early commits
- Verify paths in `FILE_PATTERNS`

## License

Same as parent project.
