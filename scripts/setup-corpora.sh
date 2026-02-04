#!/usr/bin/env bash
set -e

echo "Setting up TEI corpus repositories..."

CORPORA_DIR="corpora"

# Create corpora directory if it doesn't exist
mkdir -p "$CORPORA_DIR"

# Array of repositories: name|url
declare -a REPOS=(
    "wright-american-fiction|https://github.com/iulibdcs/Wright-American-Fiction.git"
    "victorian-women-writers|https://github.com/iulibdcs/Victorian-Women-Writers-Project.git"
    "indiana-magazine-history|https://github.com/iulibdcs/Indiana-Magazine-of-History.git"
    "indiana-authors-books|https://github.com/iulibdcs/Indiana-Authors-and-Their-Books.git"
    "brevier-legislative|https://github.com/iulibdcs/Brevier-Legislative-Reports.git"
    "tei-texts|https://github.com/christofs/tei-texts.git"
)

# Setup each repository
for repo in "${REPOS[@]}"; do
    name="${repo%%|*}"
    url="${repo##*|}"
    repo_path="$CORPORA_DIR/$name"

    if [ -d "$repo_path" ]; then
        # Check if we need to update (makefile-like behavior)
        cd "$repo_path"

        # Fetch to check for updates
        git fetch origin > /dev/null 2>&1

        # Check if local is behind remote
        LOCAL=$(git rev-parse HEAD)
        REMOTE=$(git rev-parse @{u} 2>/dev/null || echo "$LOCAL")

        if [ "$LOCAL" != "$REMOTE" ]; then
            echo "Updating $name (new commits available)..."
            git pull --ff-only || echo "  Warning: Could not fast-forward, skipping update"
        else
            echo "✓ $name is up-to-date"
        fi

        cd - > /dev/null
    else
        echo "Cloning $name..."
        git clone "$url" "$repo_path"
    fi
done

echo ""
echo "✓ Corpus repositories ready!"
echo "Corpora are now available in: $CORPORA_DIR/"
