#!/bin/bash
set -e

echo "Setting up TEI corpus submodules..."

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

# Remove existing submodules if any (for clean setup)
for repo in "${REPOS[@]}"; do
    name="${repo%%|*}"
    if [ -d "$CORPORA_DIR/$name" ]; then
        echo "Removing existing $name..."
        rm -rf "$CORPORA_DIR/$name"
    fi
done

# Add each repository as a submodule
for repo in "${REPOS[@]}"; do
    name="${repo%%|*}"
    url="${repo##*|}"

    echo "Adding submodule: $name from $url"
    git submodule add "$url" "$CORPORA_DIR/$name"
done

echo "Initializing submodules..."
git submodule init

echo "Updating submodules (this may take a while for large repos)..."
git submodule update --recursive

echo "✓ Corpus submodules setup complete!"
echo "Corpora are now available in: $CORPORA_DIR/"