# Claude AI Agent Tool Configuration

This workspace contains configuration files for managing AI agent tools, slash commands, formatting hooks, and MCP (Model Context Protocol) integrations for Claude Code and related AI development environments.

## Agents (`agents/`)

Agent configuration files define specialized sub-agents that can be invoked for specific tasks.

- **`codebase-analyzer.md`** - Analyzes codebase implementation details with precise file:line references. Specializes in understanding HOW code works, tracing data flow, and identifying architectural patterns. Uses Read, Grep, Glob, and LS tools.

- **`codebase-locator.md`** - Locates files, directories, and components relevant to features or tasks. Acts as a "Super Grep/Glob/LS tool" for finding WHERE code lives by topic/feature. Uses Grep, Glob, and LS tools.

- **`codebase-pattern-matcher.md`** - Finds similar implementations, usage examples, and existing patterns. Provides concrete code examples and reusable patterns for new development work. Uses Grep, Glob, Read, and LS tools.

- **`codebase-researcher.md`** - Not Implemented

- **`web-search-researcher.md`** - Conducts comprehensive web research using strategic search patterns and source evaluation. Focuses on finding accurate, current information from authoritative sources. Uses WebSearch, WebFetch, TodoWrite, Read, Grep, Glob, LS, and Bash tools.

## Commands (`commands/`)

Command configurations define slash commands that can be invoked to perform specific workflows.

- **`create-commit.md`** - Creates well-structured git commits by analyzing changes, grouping related files, and generating conventional commit messages with safety checks. Includes pre-commit validation and sensitive data detection.

- **`create-pull-request.md`** - Creates or updates pull requests with comprehensive descriptions using repository templates. Requires the `gh` CLI tool. Analyzes changes and generates structured PR descriptions.

- **`research-github-issue.md`** - Not Implemented

- **`research-jira-ticket.md`** - Not Implemented

- **`research-workspace.md`** - Conducts comprehensive workspace research by spawning parallel sub-agents to investigate queries iteratively. Synthesizes findings into detailed research documents with metadata tracking.

## Hooks (`hooks/`)

Hook configuration files define code formatting and validation hooks for different languages.

- **`format-javascript.md`** - Not Implemented

- **`format-python.md`** - Not Implemented

- **`format-typescript.md`** - Not Implemented

## MCP Integrations (`mcp/`)

MCP (Model Context Protocol) configuration files for external service integrations.

- **`airtable.md`** - Not Implemented

- **`aws-docs.md`** - Not Implemented

- **`aws-postgres.md`** - Not Implemented

- **`chroma.md`** - Not Implemented

- **`chrome-dev-tools.md`** - Not Implemented

- **`context7.md`** - Not Implemented

- **`database-toolbox.md`** - Not Implemented

- **`grafana.md`** - Not Implemented

- **`jira.md`** - Not Implemented

- **`kagi-search.md`** - Not Implemented

- **`mariadb.md`** - Not Implemented

- **`neo4j.md`** - Not Implemented

- **`neon.md`** - Not Implemented

- **`playwright.md`** - Not Implemented

- **`qdrant.md`** - Not Implemented

- **`supabase.md`** - Not Implemented

- **`tavily.md`** - Not Implemented

## Scripts (`scripts/`)

Directory for utility scripts. Currently empty.

---

# Usage

These configuration files are designed to be referenced by Claude Code and similar AI development environments to provide specialized functionality, workflow automation, and external integrations. Files marked as "Not Implemented" are placeholders for future development.
