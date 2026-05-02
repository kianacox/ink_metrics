FROM node:20-slim

# Install system deps (git for worktree ops, curl for gh CLI install)
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Claude Code and GitHub CLI
RUN npm install -g @anthropic-ai/claude-code

RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
    | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
    | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update && apt-get install -y gh \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -s /bin/bash agent

# ── Pre-install node_modules at the mount path so the named volume
#    gets seeded with Linux-native binaries on first mount.
#
#    --ignore-scripts skips the Playwright postinstall (browser download).
#    Workers don't run e2e tests, so we don't need Chromium or its
#    ~300MB of system libraries (libnss3, libatk, libcups, etc).
WORKDIR /Users/kianacox/Code/ink_metrics
COPY package*.json ./
RUN npm ci --ignore-scripts && chown -R agent:agent /Users/kianacox/Code/ink_metrics

USER agent

ENTRYPOINT ["claude"]