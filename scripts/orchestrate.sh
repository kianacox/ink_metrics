#!/bin/bash
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
IMAGE_NAME="ink-metrics-agent"
MAX_TURNS="${MAX_TURNS:-75}"

# Ensure image is built
docker build -t "$IMAGE_NAME" "$REPO_ROOT/docker"

# Configure git identity for commits inside container
GIT_NAME=$(git config user.name)
GIT_EMAIL=$(git config user.email)

echo "🚀 Launching orchestrator (max $MAX_TURNS turns per agent)..."

docker run -it --rm \
  -v "$REPO_ROOT:/repo" \
  -v "$HOME/.claude:/root/.claude" \
  -e GITHUB_TOKEN="$GITHUB_TOKEN" \
  -e GIT_AUTHOR_NAME="$GIT_NAME" \
  -e GIT_AUTHOR_EMAIL="$GIT_EMAIL" \
  -e GIT_COMMITTER_NAME="$GIT_NAME" \
  -e GIT_COMMITTER_EMAIL="$GIT_EMAIL" \
  -e MAX_TURNS="$MAX_TURNS" \
  "$IMAGE_NAME" \
  --dangerously-skip-permissions \
  --max-turns "$MAX_TURNS" \
  -p "You are the orchestrator. Read CLAUDE.md and ISSUES.md and begin orchestration. Each worker Task must also be launched with --max-turns $MAX_TURNS."