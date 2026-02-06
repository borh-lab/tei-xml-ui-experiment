#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "matplotlib>=3.9.0",
#     "gitpython>=3.1.40",
#     "tqdm>=4.66.0",
# ]
# ///

"""
SLOC Visualization Generator (Fast Version)
Generates publication-quality SVG showing SLOC growth and commit activity over time.
Uses fast line counting instead of cloc.
"""

import git
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from pathlib import Path
import subprocess
from tqdm import tqdm
import sys
from datetime import datetime

# Color schemes
FILE_TYPE_COLORS = {
    "TypeScript (.ts)": "#2563eb",      # Darker blue (better on dark)
    "React (.tsx)": "#0ea5e9",        # Cyan/blue (works on both)
    "Markdown": "#0891b2",           # Dark blue
    "Config JSON": "#f59e0b",        # Darker orange/amber
    "Tests": "#eab308",               # Darker yellow
}

COMMIT_TYPE_COLORS = {
    "feat": "#3b82f6",      # Blue
    "fix": "#f97316",       # Orange
    "docs": "#10b981",      # Emerald
    "test": "#eab308",      # Yellow
    "refactor": "#6b7280", # Gray
    "chore": "#4b5563",     # Dark gray
    "perf": "#8b5cf6",      # Purple
    "other": "#9ca3af",     # Light gray
}

FILE_PATTERNS = {
    "TypeScript (.ts)": ["*.ts"],
    "React (.tsx)": ["*.tsx"],
    "Markdown": ["*.md"],
    "Config JSON": ["./package.json", "./tsconfig.json", "./next.config.js", "./components.json"],
    "Tests": ["*.test.ts", "*.test.tsx", "*.spec.ts", "*.spec.tsx"],
}


def parse_conventional_commit(message: str) -> str:
    """Extract conventional commit type from message."""
    import re
    match = re.match(r'^(feat|fix|docs|test|refactor|chore|perf|build|ci|style)(\(.+\))?\!?:', message)
    return match.group(1) if match else "other"


def count_lines_fast(repo_path: Path) -> dict:
    """Count lines by file type using find + wc (much faster than cloc)."""
    counts = {key: 0 for key in FILE_PATTERNS.keys()}

    for file_type, patterns in FILE_PATTERNS.items():
        for pattern in patterns:
            try:
                # Use -not -path to exclude directories at any level
                # For config files at root, use direct path check
                if pattern.startswith("./"):
                    # Direct path check (faster and more precise)
                    if (repo_path / pattern).exists():
                        result = subprocess.run(
                            ["wc", "-l", str(repo_path / pattern)],
                            capture_output=True,
                            text=True,
                            timeout=5
                        )
                        if result.stdout:
                            total = int(result.stdout.strip().split()[0])
                            counts[file_type] += total
                else:
                    # Pattern matching for other types - use shell for complex find
                    cmd_str = f'find "{repo_path}" -name "{pattern}" -type f \
                        -not -path "*/node_modules/*" \
                        -not -path "*/.venv/*" \
                        -not -path "*/.git/*" \
                        -not -path "*/.next/*" \
                        -not -path "*/coverage/*" \
                        -not -path "*/TEI/*" \
                        -not -path "*/corpora/*" \
                        -not -path "*/datasets/*" \
                        -not -path "*/logs/*" \
                        -not -path "*/dist/*" \
                        -not -path "*/build/*" \
                        -exec wc -l {{}} +'

                    result = subprocess.run(
                        cmd_str,
                        capture_output=True,
                        text=True,
                        timeout=10,
                        shell=True
                    )
                    if result.stdout:
                        # Last line has total
                        lines = result.stdout.strip().split('\n')[-1]
                        total = int(lines.split()[0]) if lines.split() else 0
                        counts[file_type] += total
            except:
                pass

    return counts


def collect_data(repo_path: Path, sample_size: int = 100) -> dict:
    """Walk through git history and collect SLOC data."""
    print(f"Analyzing repository: {repo_path}")
    repo = git.Repo(repo_path)

    commits = list(repo.iter_commits())
    commits = sorted(commits, key=lambda c: c.committed_datetime)
    total = len(commits)
    print(f"Total commits: {total}")

    # Sample commits for faster processing
    if total > sample_size:
        import numpy as np
        indices = np.linspace(0, total - 1, sample_size, dtype=int)
        commits = [commits[i] for i in indices]
        print(f"Sampling {sample_size} commits for faster processing")
    else:
        print(f"Processing all {total} commits")

    data = {
        "timestamps": [],
        "sloc": {group: [] for group in FILE_PATTERNS.keys()},
        "commit_types": [],
        "lines_added": [],
        "lines_removed": [],
    }

    # Track initial state
    initial_commit = repo.head.commit.hexsha
    is_dirty = repo.is_dirty()
    has_untracked = repo.untracked_files

    if is_dirty or has_untracked:
        print("\nWarning: Repository has uncommitted/untracked files")
        print("Stashing changes temporarily...")
        try:
            repo.git.stash()
            print("✓ Changes stashed")
        except:
            print("Warning: Could not stash changes")

    print("\nProcessing commits...")
    for commit in tqdm(commits, desc="Analyzing commits"):
        try:
            # Checkout commit
            repo.git.checkout(commit.hexsha, force=True)

            # Parse commit type
            commit_type = parse_conventional_commit(commit.message)
            data["commit_types"].append(commit_type)

            # Get timestamp
            timestamp = commit.committed_datetime
            data["timestamps"].append(timestamp)

            # Count lines
            counts = count_lines_fast(repo_path)

            # Store SLOC for each file type
            for group in FILE_PATTERNS.keys():
                data["sloc"][group].append(counts.get(group, 0))

            # Get diff stats (lines added/removed)
            try:
                diff_result = subprocess.run(
                    ["git", "diff", "--shortstat", f"{commit.hexsha}^..{commit.hexsha}"],
                    capture_output=True,
                    text=True,
                    timeout=5,
                    cwd=str(repo_path)
                )
                if diff_result.stdout:
                    # Parse "X file changed, N insertions(+), M deletions(-)"
                    parts = diff_result.stdout.split(',')
                    added = removed = 0
                    for part in parts:
                        if 'insertion' in part:
                            added = int(part.strip().split()[0])
                        elif 'deletion' in part:
                            removed = int(part.strip().split()[0])
                    data["lines_added"].append(added)
                    data["lines_removed"].append(removed)
                else:
                    data["lines_added"].append(0)
                    data["lines_removed"].append(0)
            except:
                data["lines_added"].append(0)
                data["lines_removed"].append(0)

        except Exception as e:
            print(f"\nWarning: Failed to process commit {commit.hexsha[:8]}: {e}")
            # Continue with previous data to maintain array lengths
            if data["timestamps"]:
                data["timestamps"].append(data["timestamps"][-1])
                data["commit_types"].append("other")
                for group in FILE_PATTERNS.keys():
                    if data["sloc"][group]:
                        data["sloc"][group].append(data["sloc"][group][-1])
                data["lines_added"].append(0)
                data["lines_removed"].append(0)

    # Restore initial state
    try:
        repo.git.checkout(initial_commit, force=True)
        if is_dirty or has_untracked:
            print("\nRestoring stashed changes...")
            try:
                repo.git.stash('pop')
                print("✓ Changes restored")
            except:
                print("Warning: Could not restore stashed changes")
    except:
        pass

    print(f"\nCollected data for {len(data['timestamps'])} commits")
    return data


def create_visualization(data: dict, output_path: Path):
    """Generate SVG visualization with matplotlib."""
    print("\nGenerating visualization...")

    # Create figure with three subplots
    fig, (ax1, ax2, ax3) = plt.subplots(
        3, 1,
        figsize=(16, 12),
        sharex=True,
        gridspec_kw={'height_ratios': [5, 3, 2], 'hspace': 0.1}
    )

    # Custom styling (theme-agnostic)
    plt.rcParams.update({
        'font.size': 14,
        'font.family': 'sans-serif',
        'axes.facecolor': 'none',
        'figure.facecolor': 'none',
        'text.color': '#333333',
        'axes.labelcolor': '#333333',
        'xtick.color': '#333333',
        'ytick.color': '#333333',
        'axes.edgecolor': '#333333',
    })

    # Top panel: SLOC lines
    plot_sloc_lines(ax1, data)

    # Middle panel: Commit markers
    plot_commits(ax2, data)

    # Bottom panel: Lines added/removed
    plot_diff(ax3, data)

    # Save as SVG with transparent background
    plt.savefig(
        output_path,
        format='svg',
        dpi=120,
        bbox_inches='tight',
        facecolor='none',
        edgecolor='none',
        transparent=True
    )

    print(f"✓ Visualization saved: {output_path}")


def plot_sloc_lines(ax, data: dict):
    """Plot SLOC growth by file type."""
    has_data = False

    # Plot each file type
    for group, color in FILE_TYPE_COLORS.items():
        if group in data["sloc"]:
            sloc_values = data["sloc"][group]
            # Only plot if there's actual data
            if any(v > 0 for v in sloc_values):
                has_data = True
                ax.plot(
                    data["timestamps"],
                    sloc_values,
                    color=color,
                    linewidth=2.5,
                    alpha=0.8,
                    marker='o',
                    markersize=3,
                    label=group
                )

    if has_data:
        ax.legend(loc='upper left', fontsize=14, framealpha=0.9)

    ax.set_ylabel("Lines of Code", fontsize=18, fontweight='bold')
    ax.grid(True, alpha=0.3, linestyle='--', color='#6b7280')
    ax.set_title("SLOC Growth Over Time", fontsize=20, fontweight='bold', pad=10)


def plot_commits(ax, data: dict):
    """Plot commit type distribution as stacked area chart."""
    # Count commits by type at each time point
    import numpy as np

    # Create matrix of commit counts (time × type)
    timestamps = data["timestamps"]
    commit_types = list(COMMIT_TYPE_COLORS.keys())
    n_points = len(timestamps)

    # Build count matrix
    count_matrix = np.zeros((n_points, len(commit_types)))
    for i, ctype in enumerate(data["commit_types"]):
        if ctype in commit_types:
            j = commit_types.index(ctype)
            # Cumulative count up to this point
            count_matrix[i:, j] += 1

    # Create stacked area plot
    ax.stackplot(
        timestamps,
        count_matrix.T,
        colors=[COMMIT_TYPE_COLORS[ct] for ct in commit_types],
        labels=commit_types,
        alpha=0.7,
        edgecolor='white',
        linewidth=0.5
    )

    ax.set_ylabel("Cumulative Commits", fontsize=16, fontweight='bold')
    ax.grid(True, alpha=0.3, linestyle='--', axis='y', color='#6b7280')
    ax.legend(
        loc='upper left',
        fontsize=12,
        ncol=4
    )
    ax.set_title("Commit Activity by Type", fontsize=16, fontweight='bold', pad=10)


def plot_diff(ax, data: dict):
    """Plot lines added/removed over time with moving average smoothing."""
    import numpy as np

    # Calculate moving average (7-commit window)
    window = 7
    added = np.array(data["lines_added"], dtype=float)
    removed = np.array(data["lines_removed"], dtype=float)

    # Simple moving average
    added_ma = np.convolve(added, np.ones(window)/window, mode='valid')
    removed_ma = np.convolve(removed, np.ones(window)/window, mode='valid')

    # Adjust timestamps for valid window
    n_valid = len(added_ma)
    timestamps_ma = data["timestamps"][-n_valid:]

    # Plot smoothed lines
    ax.plot(
        timestamps_ma,
        added_ma,
        color="#10b981",
        linewidth=2.5,
        alpha=0.8,
        label="Lines added (MA)"
    )

    removed_neg = [-x for x in removed_ma]
    ax.plot(
        timestamps_ma,
        removed_neg,
        color="#ef4444",
        linewidth=2.5,
        alpha=0.8,
        label="Lines removed (MA)"
    )

    # Fill between for visual appeal
    ax.fill_between(
        timestamps_ma,
        0,
        added_ma,
        color="#10b981",
        alpha=0.3
    )
    ax.fill_between(
        timestamps_ma,
        0,
        removed_neg,
        color="#ef4444",
        alpha=0.3
    )

    ax.set_ylabel("Lines Changed (7-MA)", fontsize=16, fontweight='bold')
    ax.axhline(y=0, color='#6b7280', linewidth=0.5)
    ax.grid(True, alpha=0.3, linestyle='--')
    ax.legend(loc='upper left', fontsize=12)
    ax.set_title("Code Churn: Lines Added vs Removed (Moving Average)", fontsize=16, fontweight='bold', pad=10)

    # Format x-axis dates (only on bottom panel)
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m'))
    plt.xticks(rotation=45, ha='right')


def print_summary(data: dict):
    """Print summary statistics."""
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)

    if data["sloc"]:
        for group, values in data["sloc"].items():
            if values:
                initial = values[0]
                final = values[-1]
                growth = final - initial
                if initial > 0 or final > 0:
                    print(f"{group:20s}: {initial:6d} → {final:6d} ({growth:+6d})")

    print(f"\nTotal commits: {len(data['timestamps'])}")

    # Count commit types
    from collections import Counter
    commit_counts = Counter(data["commit_types"])
    print("\nCommit types:")
    for ctype, count in commit_counts.most_common():
        print(f"  {ctype:10s}: {count:4d}")

    print("="*60)


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Generate SLOC visualization from git history"
    )
    parser.add_argument(
        "repo_path",
        type=Path,
        nargs="?",
        default=Path("."),
        help="Path to git repository (default: current directory)"
    )
    parser.add_argument(
        "-o", "--output",
        type=Path,
        default=Path("sloc-visualization.svg"),
        help="Output SVG file (default: sloc-visualization.svg)"
    )
    parser.add_argument(
        "-n", "--sample-size",
        type=int,
        default=100,
        help="Number of commits to sample (default: 100, 0 = all commits)"
    )

    args = parser.parse_args()

    if not (args.repo_path / ".git").exists():
        print(f"Error: Not a git repository: {args.repo_path}", file=sys.stderr)
        sys.exit(1)

    # Determine sample size (0 means process all)
    sample_size = args.sample_size if args.sample_size > 0 else None

    # Collect data
    data = collect_data(args.repo_path, sample_size or 10000)

    # Print summary
    print_summary(data)

    # Generate visualization
    create_visualization(data, args.output)

    print(f"\n✓ Done! Output: {args.output}")


if __name__ == "__main__":
    main()
