# SLOC Visualization Design

**Date:** 2025-02-06
**Author:** Claude + User
**Status:** Approved

## Overview

Publication-quality SVG visualization showing SLOC (Source Lines of Code) distribution over time across git history, broken down by file type and conventional commit types. Designed to complement the Gource video visualization for conference presentations.

## Requirements

- **Purpose:** Conference presentation (visually engaging, readable from distance)
- **Scope:** All source file types (comprehensive view)
- **Output:** Vector/scalable (SVG) for crisp rendering at any resolution
- **Data Granularity:** Commit-by-commit (~460 commits) to capture parallel agent work

## Visualization Design

### Layout
- **Figure Size:** 16" × 9" (1920×1080 at 120 DPI)
- **Two Panels:** Vertically stacked, sharing x-axis
  - Top panel (70%): SLOC growth by file type
  - Bottom panel (30%): Commit activity by type
- **Margins:** Generous for projection, minimal between panels

### Top Panel: SLOC Over Time
- **Type:** Multi-line chart
- **Data:** One line per file extension showing SLOC growth
- **Styling:**
  - Line width: 2.5px
  - Markers: 3px dots at each commit
  - Alpha: 0.8 for overlap handling
  - Grid: Light gray dashed lines
  - Legend: Upper left, file extensions only

### Bottom Panel: Commit Activity
- **Type:** Scatter plot (commit markers on timeline)
- **Data:** One dot per commit, colored by conventional commit type
- **Styling:**
  - Marker size: 80pt
  - Alpha: 0.7
  - No y-axis (single row)
  - Legend: Upper right, 4 columns

## Color Scheme

### File Type Colors
| Extension | Color | Hex |
|-----------|-------|-----|
| TypeScript (.ts) | Blue | #3178c6 |
| TSX (.tsx) | Light blue | #61dafb |
| XML (.xml) | Dark green | #006400 |
| Markdown (.md) | Navy | #083fa1 |
| JSON (.json) | Yellow | #f7df1e |
| Test files | Yellow-orange | #dcda32 |

### Commit Type Colors
| Type | Color | Hex |
|------|-------|-----|
| feat | Blue | #0096ff |
| fix | Orange | #ff9600 |
| docs | Green | #00c832 |
| test | Yellow | #dcdc32 |
| refactor | Gray | #969696 |
| chore | Dark gray | #646464 |
| perf | Purple | #b432c8 |

### Typography
- Font: Sans-serif (Inter, Roboto, or system default)
- Title: 24pt bold
- Axis labels: 18pt
- Tick labels: 14pt
- Legend: 16pt (commits: 12pt)

## Technical Implementation

### Script: `scripts/generate-sloc-viz.py`

**Dependencies (uv inline):**
```python
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "matplotlib>=3.9.0",
#     "gitpython>=3.1.40",
# ]
# ///
```

**External Tools:**
- `cloc` - via `nix run nixpkgs#cloc`
- `git` - via gitpython or system git

### Data Pipeline

1. **Commit Iteration:**
   ```python
   for commit in repo.iter_commits("--reverse"):
       timestamp = commit.committed_datetime
       commit_type = parse_conventional_commit(commit.message)
       sloc = run_cloc_at_commit(commit)
       store(timestamp, commit_type, sloc)
   ```

2. **Parallel Commit Handling:**
   - Sort commits with identical timestamps by hash (deterministic)
   - Preserve chronological order

3. **Data Structure:**
   ```python
   {
       "timestamps": [datetime, ...],  # ~460 commits
       "sloc": {
           ".ts": [1200, 1205, 1210, ...],
           ".tsx": [800, 805, 810, ...],
           ...
       },
       "commit_types": ["feat", "fix", "docs", ...]
   }
   ```

### Error Handling

- **Checkout Failures:** Skip with warning
- **cloc Timeouts:** 30s limit, skip on timeout
- **Empty Repos:** Exit gracefully with message
- **Binary Files:** cloc automatically skips
- **Merge Commits:** Include (shows integration points)

### Performance

- **Progress:** tqdm indicator for ~460 commits
- **Caching:** Skip duplicate tree objects
- **Estimated Time:** 2-5 minutes
- **Memory:** Load data incrementally

## Output

**Primary File:** `sloc-visualization.svg`
- Vector graphics (scalable)
- Publication quality
- Web-ready

**Console Output:**
- Progress updates
- Summary statistics (total SLOC growth, active file types)

## Usage

```bash
# Run from project root
cd /path/to/repo
uv run scripts/generate-sloc-viz.py

# Or via wrapper
./scripts/generate-sloc-viz.sh
```

## Files

- `scripts/generate-sloc-viz.py` - Main visualization script
- `scripts/generate-sloc-viz.sh` - Wrapper script
- `docs/plans/2025-02-06-sloc-visualization-design.md` - This document

## Success Criteria

- ✅ SVG renders correctly at multiple resolutions
- ✅ All ~460 commits represented
- ✅ Parallel agent work visible in data
- ✅ Readable from distance (conference projection)
- ✅ Complements Gource visualization style
- ✅ Reproducible (same git state = same visualization)
