# Claude Code Configuration

Personal Claude Code workspace configuration with custom slash commands, specialized agents, and development workflows.

## Installation

```bash
# Build the installer (requires Bun)
cd installer && bun install && bun build --compile src/index.ts --outfile ../install

# Interactive install
./install

# Install everything
./install --all

# Uninstall (removes symlinks, restores backups)
./install --uninstall
```

The installer symlinks `commands/`, `agents/`, `scripts/`, and `settings.json` into `~/.claude/`. Use `settings.local.json` for machine-specific overrides.

## What's Inside

### Slash Commands (`commands/`)
Custom workflows invoked with `/command-name`:
- `/create-commit` - Structured git commits with conventional commit format
- `/create-pull-request` - GitHub PR creation via `gh` CLI with structured summaries
- `/research-workspace` - Comprehensive codebase research with parallel sub-agents

### Specialized Agents (`agents/`)
Sub-agents for specific tasks:
- **codebase-locator** - Find where files/components are located
- **codebase-analyzer** - Understand how code works
- **codebase-pattern-finder** - Discover usage patterns and examples
- **web-search-researcher** - External research with web search
- **code-reviewer** - Code quality and security review
- **python-developer** - Python-specific development
- **database-admin** - Database operations
- **ui-ux-designer** - UI/UX design work

### Hooks (`settings.json`)
Automatic code formatting on write/edit operations:
- TypeScript, JavaScript (prettier), Python (ruff), Go (gofmt), Rust (rustfmt)
- Sensitive file edit warnings (`.env`, `.key`, `.pem`, etc.)
- Uncommitted changes reminder on session end

### Scripts (`scripts/`)
Utility scripts supporting slash commands:
- `get-workspace-metadata.sh` - Extract git and workspace context
- `context-monitor.py` - Real-time context usage monitoring

## Usage

Slash commands automatically expand when invoked in Claude Code:
```bash
/create-commit "implemented auth flow"
/create-pull-request main
/research-workspace "how does authentication work?"
```

Sub-agents are spawned automatically by commands like `/research-workspace` for parallel investigation.

## Structure

```
.claude/
├── agents/        # Sub-agent configurations
├── commands/      # Slash command definitions
├── installer/     # Install tool source (Bun/TypeScript)
├── scripts/       # Utility scripts
├── settings.json  # Permissions, hooks, env, statusline, plugins
├── CLAUDE.md      # Architecture guide
└── README.md
```

See [CLAUDE.md](CLAUDE.md) for detailed architecture and conventions.
