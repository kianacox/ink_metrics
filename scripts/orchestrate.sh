#!/bin/bash
# orchestrate.sh — ink_metrics agent lifecycle manager
#
# MODES
#   run          (default) Build image, spawn orchestrator for all READY issues
#   qa           Interactive QA loop: checkout a PR branch, test locally, leave
#                feedback and re-spawn a fix agent if needed
#   resume       Re-attach to a running orchestrator container (stdin/stdout)
#   clean        Prune all worktrees and remove stopped agent containers
#
# USAGE
#   ./orchestrate.sh              # run all READY issues
#   ./orchestrate.sh qa           # start QA session for an open PR
#   ./orchestrate.sh resume       # re-attach to stuck/running orchestrator
#   ./orchestrate.sh clean        # tidy up worktrees and containers
#
# ENVIRONMENT
#   GITHUB_TOKEN          required for gh CLI inside container
#   MAX_TURNS             max turns per agent (default 75)
#   ORCHESTRATOR_TIMEOUT  hard timeout in seconds for the orchestrator
#                         container (default 7200 = 2 hours)

set -euo pipefail

# ── Constants ────────────────────────────────────────────────────────────────

REPO_ROOT="$(git rev-parse --show-toplevel)"
IMAGE_NAME="ink-metrics-agent"
MAX_TURNS="${MAX_TURNS:-75}"
ORCHESTRATOR_CONTAINER="ink-metrics-orchestrator"
ORCHESTRATOR_TIMEOUT="${ORCHESTRATOR_TIMEOUT:-7200}"
NODE_MODULES_VOLUME="ink-metrics-node-modules"
MODE="${1:-run}"

# ── Colours ──────────────────────────────────────────────────────────────────

BOLD='\033[1m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
RESET='\033[0m'

info()    { echo -e "${CYAN}[orchestrate]${RESET} $*"; }
success() { echo -e "${GREEN}[orchestrate]${RESET} $*"; }
warn()    { echo -e "${YELLOW}[orchestrate]${RESET} $*"; }
error()   { echo -e "${RED}[orchestrate]${RESET} $*" >&2; exit 1; }

# Send a macOS desktop notification. Silent no-op on other systems.
notify() {
  local title="$1"
  local message="$2"
  if command -v osascript >/dev/null 2>&1; then
    osascript -e "display notification \"${message}\" with title \"${title}\"" \
      >/dev/null 2>&1 || true
  fi
}

# ── Guards ───────────────────────────────────────────────────────────────────

[[ -z "${GITHUB_TOKEN:-}" ]] && error "GITHUB_TOKEN is not set."

GIT_NAME=$(git config user.name   || echo "Agent")
GIT_EMAIL=$(git config user.email || echo "agent@local")

# ── Helpers ──────────────────────────────────────────────────────────────────

build_image() {
  info "Building Docker image ${BOLD}${IMAGE_NAME}${RESET}..."
  docker build -t "$IMAGE_NAME" -f "$REPO_ROOT/docker/Dockerfile" "$REPO_ROOT"
  success "Image ready."
}

# Fetch the latest origin/main so worktrees branch from a fresh ref.
# Run this before spawning agents that create new worktrees.
sync_main() {
  info "Fetching latest origin/main..."
  git fetch origin main \
    || error "Failed to fetch origin/main. Check network and GITHUB_TOKEN."
}

# Run Claude inside the container with a fully interactive TTY so you can
# type replies when the agent asks a question.  The container is named so
# `resume` can re-attach to it if your terminal dies.
#
# The named volume mounted onto node_modules shadows the bind-mount, so the
# container gets its own Linux-native node_modules and never clobbers the
# host's macOS install.
run_claude_interactive() {
  local name="$1"; shift   # container name
  local prompt="$1"; shift # -p value

  # Remove any previous container with this name (stopped is fine to clobber)
  docker rm -f "$name" 2>/dev/null || true

  docker run -it --rm \
    --name "$name" \
    -v "$REPO_ROOT:/Users/kianacox/Code/ink_metrics" \
    -v "${NODE_MODULES_VOLUME}:/Users/kianacox/Code/ink_metrics/node_modules" \
    -v "$HOME/.claude:/home/agent/.claude" \
    -v "$HOME/.claude.json:/home/agent/.claude.json" \
    -e GITHUB_TOKEN="$GITHUB_TOKEN" \
    -e GIT_AUTHOR_NAME="$GIT_NAME" \
    -e GIT_AUTHOR_EMAIL="$GIT_EMAIL" \
    -e GIT_COMMITTER_NAME="$GIT_NAME" \
    -e GIT_COMMITTER_EMAIL="$GIT_EMAIL" \
    -e MAX_TURNS="$MAX_TURNS" \
    "$IMAGE_NAME" \
    --dangerously-skip-permissions \
    --max-turns "$MAX_TURNS" \
    -p "$prompt"
}

# ── Mode: run ────────────────────────────────────────────────────────────────
# Spawns the orchestrator for all READY issues.  The container is named so you
# can re-attach with `./orchestrate.sh resume` if it gets stuck waiting for
# input.

mode_run() {
  build_image
  sync_main

  info "Launching orchestrator (max ${MAX_TURNS} turns, ${ORCHESTRATOR_TIMEOUT}s wall clock)..."
  echo -e "${YELLOW}Tip: if the agent pauses and asks a question, type your reply directly in this terminal.${RESET}"
  echo -e "${YELLOW}Tip: if you lose the terminal, run ${BOLD}./orchestrate.sh resume${RESET}${YELLOW} to re-attach.${RESET}"
  echo -e "${YELLOW}Tip: orchestrator will be force-killed after ${ORCHESTRATOR_TIMEOUT}s — set ORCHESTRATOR_TIMEOUT to override.${RESET}"
  echo ""

  # Background watchdog: kill the container after ORCHESTRATOR_TIMEOUT seconds.
  (
    sleep "$ORCHESTRATOR_TIMEOUT"
    if docker ps --format '{{.Names}}' | grep -q "^${ORCHESTRATOR_CONTAINER}$"; then
      docker kill "$ORCHESTRATOR_CONTAINER" >/dev/null 2>&1 || true
      notify "ink_metrics" "Orchestrator timed out after ${ORCHESTRATOR_TIMEOUT}s and was killed."
    fi
  ) &
  local watchdog_pid=$!

  # Make sure the watchdog dies with us, however we exit.
  trap 'kill "$watchdog_pid" 2>/dev/null || true' EXIT

  local exit_status=0
  run_claude_interactive "$ORCHESTRATOR_CONTAINER" \
    "You are the orchestrator for the ink_metrics repo. Read CLAUDE.md and ISSUES.md before doing anything else.

## How to spawn agents
Use the Task tool only — no Bash, no Docker, no shell commands to spawn agents.
The Task tool does not support a max-turns parameter — ignore any reference to --max-turns in CLAUDE.md when using the Task tool. The turn limit only applies to shell invocations.

## Worktree setup
Before spawning each worker Task, use Bash to pre-create the worktree from the latest origin/main:
  git fetch origin main
  git worktree add ./agents/issue-{N} -b fix/issue-{N} origin/main
This guarantees each agent branches from a fresh main, even if other agents have merged in the meantime.
Then instruct the worker to operate inside ./agents/issue-{N} as their working directory.
Do NOT use isolation: worktree on the Task tool — workers must follow the ./agents/issue-{N} convention so their READY_FOR_REVIEW.md and FAILED.md files are readable after the task completes.

## Parallelism
Spawn up to 5 worker Tasks in parallel. Wait for all to complete before running reviewers.

## Everything else
Follow CLAUDE.md exactly for the review cycle, PR creation, and QA plan.
Do not ask clarifying questions — make a decision and proceed." || exit_status=$?

  # Kill the watchdog now that we're done.
  kill "$watchdog_pid" 2>/dev/null || true
  trap - EXIT

  if (( exit_status == 0 )); then
    success "Orchestrator session ended cleanly."
    notify "ink_metrics" "Orchestrator finished. Check open PRs and run ./orchestrate.sh qa."
  else
    warn "Orchestrator exited with status ${exit_status}."
    notify "ink_metrics" "Orchestrator exited with status ${exit_status}. Check the terminal."
  fi
}

# ── Mode: resume ─────────────────────────────────────────────────────────────
# Re-attach stdin/stdout to the named orchestrator container.  Useful when the
# agent asks a question and you've lost the original terminal window.

mode_resume() {
  if ! docker ps --format '{{.Names}}' | grep -q "^${ORCHESTRATOR_CONTAINER}$"; then
    warn "No running orchestrator container found (${ORCHESTRATOR_CONTAINER})."
    warn "Start a new run with: ./orchestrate.sh run"
    exit 1
  fi

  info "Re-attaching to ${ORCHESTRATOR_CONTAINER}..."
  echo -e "${YELLOW}Type your reply and press Enter to unblock the agent.${RESET}"
  echo ""
  docker attach "$ORCHESTRATOR_CONTAINER"
}

# ── Mode: qa ─────────────────────────────────────────────────────────────────
# Interactive QA loop:
#   1. Lists open PRs and lets you pick one
#   2. Checks out the branch into a clean local worktree (separate from agent
#      worktrees so nothing stomps on each other)
#   3. Opens a shell hint so you can run the app and test manually
#   4. Asks for your QA verdict
#   5a. PASS  → merges PR, removes worktree, done
#   5b. FAIL  → prompts for feedback, spawns a fix agent in the existing
#               worktree (creating it if needed), loops back to step 3

mode_qa() {
  build_image

  # ── Pick a PR ──────────────────────────────────────────────────────────────
  info "Fetching open PRs..."
  PR_LIST=$(gh pr list --json number,title,headRefName,author \
    --template '{{range .}}{{.number}}|{{.headRefName}}|{{.title}}{{"\n"}}{{end}}' \
    2>/dev/null) || error "Could not fetch PRs. Is GITHUB_TOKEN set and gh authenticated?"

  if [[ -z "$PR_LIST" ]]; then
    warn "No open PRs found."
    exit 0
  fi

  echo ""
  echo -e "${BOLD}Open PRs:${RESET}"
  echo "$PR_LIST" | nl -w3 -s') '
  echo ""
  read -rp "Enter PR number to QA (or 'q' to quit): " PR_NUMBER
  [[ "$PR_NUMBER" == "q" ]] && exit 0

  PR_DATA=$(gh pr view "$PR_NUMBER" --json number,title,headRefName,body) \
    || error "PR #${PR_NUMBER} not found."

  PR_BRANCH=$(echo "$PR_DATA" | python3 -c "import sys,json; print(json.load(sys.stdin)['headRefName'])")
  PR_TITLE=$(echo  "$PR_DATA" | python3 -c "import sys,json; print(json.load(sys.stdin)['title'])")

  info "Selected: ${BOLD}#${PR_NUMBER} — ${PR_TITLE}${RESET}"
  info "Branch:   ${BOLD}${PR_BRANCH}${RESET}"

  # Derive the issue number from the branch name (fix/issue-N)
  ISSUE_NUM=$(echo "$PR_BRANCH" | grep -oE '[0-9]+$' || echo "")
  WORKTREE_PATH="$REPO_ROOT/agents/issue-${ISSUE_NUM:-$PR_NUMBER}"
  QA_WORKTREE="$REPO_ROOT/qa/pr-${PR_NUMBER}"

  # ── QA feedback loop ───────────────────────────────────────────────────────
  ITERATION=1
  MAX_FIX_ITERATIONS=3

  while true; do
    echo ""
    echo -e "${BOLD}─── QA iteration ${ITERATION} ───────────────────────────────────────${RESET}"

    # Set up a dedicated QA worktree (separate from agent worktrees)
    if [[ -d "$QA_WORKTREE" ]]; then
      info "Updating existing QA worktree at ${QA_WORKTREE}..."
      git -C "$QA_WORKTREE" fetch origin
      git -C "$QA_WORKTREE" reset --hard "origin/${PR_BRANCH}"
    else
      info "Creating QA worktree at ${QA_WORKTREE}..."
      mkdir -p "$REPO_ROOT/qa"
      git fetch origin "$PR_BRANCH"
      git worktree add "$QA_WORKTREE" "$PR_BRANCH" 2>/dev/null \
        || git worktree add "$QA_WORKTREE" "origin/${PR_BRANCH}"
    fi

    # ── Migration check ────────────────────────────────────────────────────────
    MIGRATION_FILES=$(gh pr view "$PR_NUMBER" --json files \
      --jq '.files[].path | select(startswith("supabase/migrations/"))' 2>/dev/null || echo "")

    if [[ -n "$MIGRATION_FILES" ]]; then
      echo ""
      warn "This PR includes database migrations:"
      echo "$MIGRATION_FILES" | sed 's/^/    /'
      echo ""
      read -rp "Run 'supabase db reset' now to apply them? [Y/n]: " RUN_RESET
      if [[ "${RUN_RESET:-Y}" =~ ^[Yy]$ ]]; then
        info "Resetting local Supabase DB..."
        if npm run --prefix "$REPO_ROOT" supabase:db:reset; then
          success "DB reset complete — migrations applied."
        else
          warn "DB reset failed. Check Supabase is running: ./orchestrate.sh and then npm run supabase:start"
          read -rp "Continue to QA anyway? [y/N]: " CONTINUE_ANYWAY
          [[ "${CONTINUE_ANYWAY:-N}" =~ ^[Yy]$ ]] || break
        fi
      else
        warn "Skipping DB reset — test results may be unreliable if schema changed."
      fi
    fi

    echo ""
    echo -e "${GREEN}┌─────────────────────────────────────────────────────────────┐${RESET}"
    echo -e "${GREEN}│  QA worktree ready: ${QA_WORKTREE}${RESET}"
    echo -e "${GREEN}│                                                             │${RESET}"
    echo -e "${GREEN}│  To test locally:                                           │${RESET}"
    echo -e "${GREEN}│    cd ${QA_WORKTREE}                                        │${RESET}"
    echo -e "${GREEN}│    cp $REPO_ROOT/.env.local .env.local                      │${RESET}"
    echo -e "${GREEN}│    npm run dev:local                                        │${RESET}"
    echo -e "${GREEN}│                                                             │${RESET}"
    echo -e "${GREEN}│  Press Enter here when you're done testing.                 │${RESET}"
    echo -e "${GREEN}└─────────────────────────────────────────────────────────────┘${RESET}"
    echo ""
    read -rp "Press Enter when ready to give your verdict..."

    echo ""
    echo -e "${BOLD}Your verdict for PR #${PR_NUMBER}:${RESET}"
    echo "  1) PASS — looks good, merge it"
    echo "  2) FAIL — needs fixes"
    echo "  q) Skip / come back later"
    echo ""
    read -rp "Choice [1/2/q]: " VERDICT

    case "$VERDICT" in
      1|pass|PASS|y|yes)
        info "Merging PR #${PR_NUMBER}..."
        gh pr merge "$PR_NUMBER" --squash 2>/dev/null \
          || gh pr merge "$PR_NUMBER" --squash --admin 2>/dev/null \
          || true

        # Verify the merge actually happened rather than trusting the exit code
        MERGE_STATE=$(gh pr view "$PR_NUMBER" --json state --jq '.state' 2>/dev/null || echo "UNKNOWN")
        if [[ "$MERGE_STATE" == "MERGED" ]]; then
          success "PR #${PR_NUMBER} merged successfully."
        else
          warn "PR #${PR_NUMBER} was not merged (state: ${MERGE_STATE})."
          warn "This may be due to branch protection rules or required reviews."
          warn "Merge manually at: $(gh pr view "$PR_NUMBER" --json url --jq '.url' 2>/dev/null || echo 'GitHub')"
          warn "Skipping worktree cleanup — re-run './orchestrate.sh qa' after merging."
          break
        fi

        info "Cleaning up QA worktree..."
        git worktree remove --force "$QA_WORKTREE" 2>/dev/null || true

        # Remove the agent worktree too if it exists
        if [[ -d "$WORKTREE_PATH" ]]; then
          info "Removing agent worktree ${WORKTREE_PATH}..."
          git worktree remove --force "$WORKTREE_PATH" 2>/dev/null || true
        fi

        git worktree prune
        success "Done. All worktrees for PR #${PR_NUMBER} cleaned up."
        break
        ;;

      2|fail|FAIL|n|no)
        if (( ITERATION >= MAX_FIX_ITERATIONS )); then
          warn "Reached maximum fix iterations (${MAX_FIX_ITERATIONS}) for PR #${PR_NUMBER}."
          warn "Resolve this PR manually."
          break
        fi

        echo ""
        echo -e "${BOLD}Describe the issue(s) for the fix agent:${RESET}"
        echo "(Be specific — describe what you saw vs. what you expected.)"
        echo "Enter your feedback (Ctrl+D or empty line + Enter to finish):"
        echo ""

        QA_FEEDBACK=""
        while IFS= read -r line; do
          [[ -z "$line" ]] && break
          QA_FEEDBACK+="$line"$'\n'
        done

        if [[ -z "$QA_FEEDBACK" ]]; then
          warn "No feedback entered. Aborting fix cycle."
          break
        fi

        # Ensure agent worktree exists (create if removed after previous pass)
        if [[ ! -d "$WORKTREE_PATH" ]]; then
          info "Creating agent worktree at ${WORKTREE_PATH}..."
          git fetch origin "$PR_BRANCH"
          git worktree add "$WORKTREE_PATH" "$PR_BRANCH" 2>/dev/null \
            || git worktree add "$WORKTREE_PATH" "origin/${PR_BRANCH}"
        else
          info "Updating agent worktree..."
          git -C "$WORKTREE_PATH" fetch origin
          git -C "$WORKTREE_PATH" reset --hard "origin/${PR_BRANCH}"
        fi

        # Fetch the original agent brief from the issue comments
        AGENT_BRIEF=""
        if [[ -n "$ISSUE_NUM" ]]; then
          AGENT_BRIEF=$(gh issue view "$ISSUE_NUM" --comments 2>/dev/null || echo "")
        fi

        FIX_PROMPT="You are a worker agent fixing QA feedback on PR #${PR_NUMBER} (branch: ${PR_BRANCH}).

Your working directory is: ${WORKTREE_PATH}

Original task spec:
${AGENT_BRIEF}

QA feedback from human testing (iteration ${ITERATION}):
${QA_FEEDBACK}

Instructions:
1. Read the feedback carefully and identify what needs to change.
2. Make the minimum set of changes required to address the feedback.
3. Run: npm run lint && npm test (scoped to touched files).
4. If checks fail, write FAILED.md and stop.
5. If checks pass, commit your changes with a clear message and push the branch.
6. Do NOT open a new PR — the existing PR #${PR_NUMBER} will update automatically."

        info "Spawning fix agent for iteration ${ITERATION}..."
        echo ""

        # Run the fix agent in the agent worktree.
        # Same node_modules isolation as run_claude_interactive.
        docker run -it --rm \
          --name "ink-metrics-fix-${PR_NUMBER}-iter${ITERATION}" \
          -v "$REPO_ROOT:/Users/kianacox/Code/ink_metrics" \
          -v "${NODE_MODULES_VOLUME}:/Users/kianacox/Code/ink_metrics/node_modules" \
          -v "$HOME/.claude:/home/agent/.claude" \
          -v "$HOME/.claude.json:/home/agent/.claude.json" \
          -e GITHUB_TOKEN="$GITHUB_TOKEN" \
          -e GIT_AUTHOR_NAME="$GIT_NAME" \
          -e GIT_AUTHOR_EMAIL="$GIT_EMAIL" \
          -e GIT_COMMITTER_NAME="$GIT_NAME" \
          -e GIT_COMMITTER_EMAIL="$GIT_EMAIL" \
          "$IMAGE_NAME" \
          --dangerously-skip-permissions \
          --max-turns "$MAX_TURNS" \
          -p "$FIX_PROMPT"

        ITERATION=$((ITERATION + 1))
        info "Fix agent finished. Refreshing QA worktree for re-test..."
        ;;

      q|Q|skip)
        info "Skipping PR #${PR_NUMBER}. QA worktree preserved at ${QA_WORKTREE}."
        break
        ;;

      *)
        warn "Unknown choice. Please enter 1, 2, or q."
        ;;
    esac
  done
}

# ── Mode: clean ───────────────────────────────────────────────────────────────
# Remove all agent + qa worktrees and stopped containers.

mode_clean() {
  info "Pruning worktrees..."

  # Remove agent worktrees
  for wt in "$REPO_ROOT"/agents/issue-* "$REPO_ROOT"/qa/pr-*; do
    [[ -d "$wt" ]] || continue
    info "  Removing ${wt}..."
    git worktree remove --force "$wt" 2>/dev/null || rm -rf "$wt"
  done

  git worktree prune
  success "Worktrees pruned."

  info "Removing stopped agent containers..."
  docker ps -a --filter "name=ink-metrics" --filter "status=exited" \
    --format '{{.Names}}' | xargs -r docker rm
  success "Containers cleaned."

  echo ""
  read -rp "Also remove the node_modules Docker volume? Forces fresh install on next run. [y/N]: " NUKE_VOLUME
  if [[ "${NUKE_VOLUME:-N}" =~ ^[Yy]$ ]]; then
    docker volume rm "$NODE_MODULES_VOLUME" 2>/dev/null \
      && success "Volume ${NODE_MODULES_VOLUME} removed." \
      || warn "Volume ${NODE_MODULES_VOLUME} did not exist or was in use."
  fi
}

# ── Dispatch ──────────────────────────────────────────────────────────────────

case "$MODE" in
  run)    mode_run    ;;
  resume) mode_resume ;;
  qa)     mode_qa     ;;
  clean)  mode_clean  ;;
  *)
    echo "Usage: $0 [run|resume|qa|clean]"
    echo ""
    echo "  run     Spawn orchestrator for all READY issues (default)"
    echo "  resume  Re-attach to a running/paused orchestrator"
    echo "  qa      Interactive QA loop for an open PR"
    echo "  clean   Remove all agent worktrees and stopped containers"
    exit 1
    ;;
esac