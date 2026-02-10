# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a Claude Code configuration repository containing custom slash commands, specialized agents, and development workflows. It serves as a personal Claude Code workspace configuration that enhances development workflows. An installer symlinks these files into `~/.claude/` where Claude Code reads them.

## Repository Structure

```
.claude/
├── agents/        # Custom sub-agent configurations (8 agents)
├── commands/      # Slash commands for specialized workflows
├── installer/     # Bun/TypeScript install tool source
│   ├── src/index.ts
│   ├── package.json
│   └── tsconfig.json
├── scripts/       # Utility scripts for workspace operations
├── .gitignore
├── CLAUDE.md
├── README.md
└── settings.json  # Permissions, hooks, env vars, statusline, plugins
```

### Key Directories

- **commands/**: Markdown files defining slash commands (e.g., `/create-commit`, `/create-pull-request`, `/research-workspace`)
- **agents/**: Sub-agent definitions with specialized capabilities (codebase-locator, codebase-analyzer, etc.)
- **installer/**: Bun/TypeScript interactive installer that symlinks config into `~/.claude/`
- **scripts/**: Bash and Node.js utilities supporting slash commands and statusline

## Installation

Build and run the installer to symlink config files into `~/.claude/`:

```bash
# Build the installer (requires Bun)
cd installer && bun install && bun build --compile src/index.ts --outfile ../install

# Interactive install (select what to install)
./install

# Install everything non-interactively
./install --all

# Remove symlinks and restore backups
./install --uninstall
```

The installer symlinks `commands/`, `agents/`, `scripts/`, and `settings.json` into `~/.claude/`. Use `settings.local.json` for machine-specific overrides.

## Architecture

### Slash Commands

Slash commands are user-defined operations that expand to full prompts when invoked. Each command is defined in a markdown file with:
- Frontmatter: `description`, `allowed-tools`, `argument-hint`
- Context section: Bash command outputs using `!`command`` syntax
- Workflow section: Detailed instructions for the command

**Key Commands:**
- `/create-commit` - Structured git commit workflow with conventional commits
- `/create-pull-request` - GitHub PR creation via `gh` CLI with structured summaries
- `/research-workspace` - Comprehensive codebase research with parallel sub-agents

### Sub-Agents

Specialized agents handle specific tasks efficiently:

| Agent | Purpose | Tools |
|-------|---------|-------|
| `codebase-locator` | Find WHERE files/components are located | Grep, Glob, LS |
| `codebase-analyzer` | Understand HOW code works | Read, Grep, Glob |
| `codebase-pattern-finder` | Find EXAMPLES of patterns | Grep, Glob, Read, LS |
| `web-search-researcher` | External research with web search | WebSearch, WebFetch |
| `code-reviewer` | Review code quality and security | Read, Write, Edit, Bash |
| `python-developer` | Python-specific development | Read, Write, Edit, Bash |
| `database-admin` | Database operations | Read, Write, Edit, Bash |
| `ui-ux-designer` | UI/UX design work | Read, Write, Edit |

Agent definitions use frontmatter (`name`, `description`, `tools`, `model`) and detailed instructions. Three agents (`web-search-researcher`, `code-reviewer`, `codebase-analyzer`) have `memory: user` for cross-session learning.

### Hooks

Hooks are configured in `settings.json` and execute automatically during tool operations:

| Hook | Trigger | Purpose |
|------|---------|---------|
| PreToolUse (Edit/Write) | Before edits | Warn when editing sensitive files (`.env`, `.key`, `.pem`, etc.) |
| PostToolUse (Edit/Write) | After edits | Auto-format TypeScript/JavaScript (prettier) |
| PostToolUse (Edit/Write) | After edits | Auto-format Python (ruff) |
| PostToolUse (Edit/Write) | After edits | Auto-format Go (gofmt) |
| PostToolUse (Edit/Write) | After edits | Auto-format Rust (rustfmt) |
| Stop | Session end | Remind about uncommitted changes |

### Scripts

**get-workspace-metadata.sh**
- Extracts workspace context (git info, timestamps, researcher name)
- Used by slash commands for consistent metadata in generated files
- Outputs environment variables: `WORKSPACE_DIR`, `DATETIME_ISO`, `DATETIME_FILENAME`, `RESEARCHER`, `GIT_COMMIT`, `GIT_BRANCH`, `REPO_NAME`, `IS_GIT`

**status-line.mjs**
- Custom HUD statusline for Claude Code sessions (no dependencies)
- Shows context %, lines changed, session duration, running agents, todos, model info
- Parses stdin JSON from Claude Code and transcript JSONL for live metrics

## Common Workflows

### Creating Commits

Use `/create-commit` to create structured commits:
- Analyzes changes and groups related files
- Generates conventional commit messages
- Safety checks for sensitive data and branch protection
- Supports atomic commits for complex changes

### Creating Pull Requests

Use `/create-pull-request [base-branch]` to create GitHub PRs:
- Analyzes ALL commits on the branch (not just staged changes)
- Generates PR title (<70 chars) and structured body (Summary, Changes, Test Plan, Notes)
- Pushes branch and creates PR via `gh pr create`
- Returns the PR URL

### Researching Codebase

Use `/research-workspace [query]` for comprehensive research:
1. Reads relevant files for context
2. Spawns parallel sub-agents for investigation
3. Iteratively explores discoveries
4. Synthesizes findings into structured markdown documents in `research/`

### Development Commands

No build/test commands - this is a configuration repository with markdown files and utility scripts.

**Common Operations:**
```bash
# Build the installer
cd installer && bun install && bun build --compile src/index.ts --outfile ../install

# Get workspace metadata
~/.claude/scripts/get-workspace-metadata.sh

# Check git status
git status

# View recent commits for conventional commit style
git log --oneline -10
```

## Conventions

### Commit Messages

Follow conventional commits format:
```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`

### File Naming

- Commands: kebab-case (e.g., `create-commit.md`)
- Agents: kebab-case (e.g., `codebase-locator.md`)
- Scripts: kebab-case with extension (e.g., `get-workspace-metadata.sh`)
- Research: `YYYY-MM-DDTHH:MM-topic.md` or `YYYY-MM-DDTHH:MM-TICKET-topic.md`

### Markdown Structure

All configuration files use:
- YAML frontmatter for metadata
- Clear section headers
- Code examples in fenced blocks
- Tables for structured data

## Important Notes

- This repository is a configuration workspace, not application code
- Most files are declarative markdown configurations
- Scripts are utilities supporting slash command functionality
- Changes here affect Claude Code behavior across all projects
- The `/research-workspace` command uses parallel sub-agents extensively for efficiency
- Permissions cover Go, Rust, Python (uv), Bun, and read-only AWS CLI in addition to Node/Docker/K8s
