# Git History Visualization with Gource

This directory contains scripts to generate beautiful animated visualizations of the TEI XML Editor's git history using [Gource](https://gource.io/).

## Scripts

### `preview-gource.sh` - Interactive Preview
Run Gource interactively to test settings and see the animation in real-time.

```bash
./scripts/preview-gource.sh
```

**Controls:**
- `ESC` or `q` - Exit
- `Space` - Pause/Resume
- `+` / `-` - Zoom in/out
- `←` / `→` - Seek backward/forward

### `generate-gource-video.sh` - Generate MP4 Video
Render the full git history as a high-quality MP4 video suitable for presentations.

```bash
./scripts/generate-gource-video.sh
```

**Output:** `gource-visualization.mp4` in the project root.

## Features

### Conventional Commit Coloring
The visualization highlights different commit types:
- **Blue** - `feat:` (features)
- **Orange** - `fix:` (bug fixes)
- **Green** - `docs:` (documentation)
- **Yellow** - `test:` (tests)
- **Purple** - `perf:` (performance)
- **Gray** - `refactor:`, `chore:` (maintenance)

### Video Settings
- **Resolution:** 1920x1080 (Full HD)
- **Frame Rate:** 30 FPS
- **Codec:** H.264 (libx264)
- **Quality:** CRF 23 (balanced quality/file size)
- **Format:** MP4 with fast-start flag for web playback

## Customization

### Adjust Duration
Edit `generate-gource-video.sh` and modify:
```bash
--seconds-per-day 1.0  # Increase for slower animation
```

### Change Resolution
Modify the `RESOLUTION` variable:
```bash
RESOLUTION="3840x2160"  # 4K
```

### Include Usernames
Remove `--hide users` to show contributor names.

### Show Filenames
Remove `--hide filenames` to display file names being edited.

## Requirements

All requirements are managed via Nix:
- `gource` - Animation engine
- `ffmpeg` - Video encoding (already in your environment)

## Playing the Video

```bash
# Using mpv
mpv gource-visualization.mp4

# Using VLC
vlc gource-visualization.mp4

# Default system player
xdg-open gource-visualization.mp4
```

## Tips

1. **Preview first** - Run `preview-gource.sh` to see the animation before generating the full video
2. **Adjust timing** - If the video is too fast/slow, modify `--seconds-per-day`
3. **Project-specific** - The visualization shows the TEI XML Editor's actual development history
4. **Presentation ready** - Output is optimized for presentations and demos

## Resources

- [Gource Documentation](https://github.com/acaudwell/Gource)
- [Gource Gallery](https://www.youtube.com/results?search_query=gource+demo)
