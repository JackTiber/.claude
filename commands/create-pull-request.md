---
description: Create a well-structured GitHub pull request by analyzing all branch commits, generating a descriptive title and body, and opening the PR with gh CLI.
allowed-tools: Bash(git branch:*), Bash(git status:*), Bash(git log:*), Bash(git diff:*), Bash(git rev-parse:*), Bash(git remote:*), Bash(git push:*), Bash(gh pr create:*), Bash(gh pr view:*), Bash(gh pr list:*)
argument-hint: [base-branch]
---

# Arguments

Review any provided details as arguments for this slash command first: $ARGUMENTS

# Context

- Current branch: !`git branch --show-current`
- Current git status: !`git status --short`
- Remote tracking: !`git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo "no upstream"`
- Default branch: !`git remote show origin 2>/dev/null | grep 'HEAD branch' | awk '{print $NF}' || echo "main"`

# Create Pull Request

You are a pull request specialist. Your job is to create well-structured GitHub pull requests that clearly communicate the purpose and scope of changes.

## Pre-Flight Checks

1. **Verify branch state:**
   - Confirm NOT on main/master. If so, STOP and warn the user.
   - Check for uncommitted changes. If any, warn the user and suggest committing first.
   - Determine the base branch (argument > default branch from remote).

2. **Gather branch context:**
   ```bash
   # All commits on this branch vs base
   git log --oneline <base-branch>..HEAD

   # Full diff against base
   git diff <base-branch>...HEAD --stat
   ```

## Analysis

### Review ALL Commits

Analyze **every** commit on the branch, not just the latest:

```bash
git log <base-branch>..HEAD --format="%h %s"
git diff <base-branch>...HEAD
```

Understand:
- **What changed** - Files modified, added, removed
- **Why it changed** - Feature, fix, refactor, etc.
- **Scope** - How many areas of the codebase are touched

### Determine PR Metadata

- **Type**: Feature, Bug Fix, Refactor, Docs, Chore, etc.
- **Breaking changes**: Any backward-incompatible changes?
- **Dependencies**: New packages or version changes?

## PR Content Generation

### Title

- Under 70 characters
- Use imperative mood: "Add...", "Fix...", "Update..."
- Include scope if helpful: "feat(auth): add OAuth2 support"
- Do NOT include PR number or branch name

### Body

Use this structure:

```markdown
## Summary
- Bullet point overview of what this PR does (1-3 bullets)

## Changes
- Specific changes grouped logically
- Reference file paths where helpful

## Test Plan
- [ ] How to verify these changes work
- [ ] Edge cases considered

## Notes
- Any additional context, trade-offs, or follow-up items
```

## Execution Workflow

1. **Present PR plan:**
   ```
   ## Proposed Pull Request

   Base: main <- Branch: feature/xyz
   Commits: 5

   Title: Add OAuth2 authentication support

   Body:
   [generated body]

   Proceed? (yes/no/edit)
   ```

2. **Handle user response:**
   - **yes**: Execute as planned
   - **no**: Cancel and ask for guidance
   - **edit**: Allow title/body adjustments

3. **Push and create PR:**
   ```bash
   # Push branch if needed
   git push -u origin <current-branch>

   # Create PR
   gh pr create --title "..." --body "..."
   ```

4. **Return result:**
   ```
   ✓ Pull request created successfully

   Title: Add OAuth2 authentication support
   URL: https://github.com/owner/repo/pull/42
   Base: main <- Branch: feature/xyz
   ```

## Critical Rules

- Analyze ALL commits on the branch, not just staged changes
- Keep title under 70 characters
- Use the body for details, not the title
- Always confirm the base branch with the user if ambiguous
- Push the branch before creating the PR
- Return the PR URL when done

## Edge Cases

### No Commits on Branch

```
No commits found between <base> and HEAD.
Nothing to create a PR for.
```

### Branch Already Has a PR

```bash
gh pr list --head <current-branch>
```

If a PR exists, show it and ask if the user wants to update it or create a new one.

### No Remote Tracking

If the branch hasn't been pushed:
```
Branch has no upstream. Will push to origin/<branch-name> before creating PR.
```
