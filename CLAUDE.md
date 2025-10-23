# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a Claude Code configuration repository containing custom slash commands, specialized agents, hooks, and MCP server documentation. It serves as a personal Claude Code workspace configuration that enhances development workflows.

## Repository Structure

```
.claude/
├── commands/          # Slash commands for specialized workflows
├── agents/           # Custom sub-agent configurations
├── hooks/            # Pre/post execution hooks for formatting
├── mcp/              # MCP server integration documentation
├── scripts/          # Utility scripts for workspace operations
└── eval/             # Evaluation and testing resources
```

### Key Directories

- **commands/**: Markdown files defining slash commands (e.g., `/create-commit`, `/research-workspace`)
- **agents/**: Sub-agent definitions with specialized capabilities (codebase-locator, codebase-analyzer, etc.)
- **hooks/**: Code formatting hooks that execute during tool operations
- **mcp/**: Documentation for MCP server integrations (database, search, dev tools, etc.)
- **scripts/**: Bash and Python utilities supporting slash commands

## Architecture

### Slash Commands

Slash commands are user-defined operations that expand to full prompts when invoked. Each command is defined in a markdown file with:
- Frontmatter: `description`, `allowed-tools`, `argument-hint`
- Context section: Bash command outputs using `!`command`` syntax
- Workflow section: Detailed instructions for the command

**Key Commands:**
- `/create-commit` - Structured git commit workflow with conventional commits
- `/create-pull-request` - PR creation with structured summaries
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

Agent definitions use frontmatter (`name`, `description`, `tools`, `model`) and detailed instructions.

### Hooks

Hooks execute automatically during tool operations:
- Format hooks: Execute code formatters (TypeScript, JavaScript, Python) before writes/edits
- Defined in markdown with frontmatter specifying trigger conditions

### Scripts

**get-workspace-metadata.sh**
- Extracts workspace context (git info, timestamps, researcher name)
- Used by slash commands for consistent metadata in generated files
- Outputs environment variables: `WORKSPACE_DIR`, `DATETIME_ISO`, `DATETIME_FILENAME`, `RESEARCHER`, `GIT_COMMIT`, `GIT_BRANCH`, `REPO_NAME`, `IS_GIT`

**context-monitor.py**
- Real-time context usage monitoring for Claude Code sessions
- Parses transcript files to display token usage and session metrics
- Provides visual indicators for context consumption

## Common Workflows

### Creating Commits

Use `/create-commit` to create structured commits:
- Analyzes changes and groups related files
- Generates conventional commit messages
- Safety checks for sensitive data and branch protection
- Supports atomic commits for complex changes

### Researching Codebase

Use `/research-workspace [query]` for comprehensive research:
1. Reads relevant files for context
2. Spawns parallel sub-agents for investigation
3. Iteratively explores discoveries
4. Synthesizes findings into structured markdown documents in `research/`

Research documents include:
- Frontmatter with metadata (date, researcher, git info, tags)
- Executive summary
- Detailed findings with file:line references
- Code references table
- Related research links

### Development Commands

No build/test commands - this is a configuration repository with markdown files and utility scripts.

**Common Operations:**
```bash
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
