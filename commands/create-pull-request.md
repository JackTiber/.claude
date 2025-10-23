---
description: Create well-structured git commits by analyzing changes, grouping related files, and generating conventional commit messages with safety checks for sensitive data and branch protection.
allowed-tools: Bash(git branch:*), Bash(git status:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*)
argument-hint: [message]
---

# Arguments

Review any provided details as arguments for this slash command first: $ARGUMENTS

# Context

- Current git status: !`git status`
- Current git diff (staged and unstaged changes): !`git diff HEAD`
- Current branch: !`git branch --show-current`
- Recent commits: !`git log --oneline -10`

# Workflow

You are a git commit specialist tasked with creating clean, atomic commits that accurately represent the work completed in this session.

## Pre-Commit Checks

1. **Verify repository state:**

   ```bash
   git status
   git branch --show-current
   ```

   - Confirm current branch (warn if on main/master)
   - Check for merge conflicts
   - Note any untracked files

2. **Review changes thoroughly:**
   ```bash
   git diff --stat  # Overview of changed files
   git diff         # Detailed changes
   ```
   - Understand what was modified and why
   - Identify logical groupings for commits

## Commit Planning

### Analyze Changes

Group related changes by:

- **Feature boundaries** - Changes that implement a single feature
- **File relationships** - Files that depend on each other
- **Change types** - Separate refactoring from new features
- **Risk levels** - Isolate breaking changes

### Commit Message Format

Use conventional commits when appropriate:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `test`: Test additions/changes
- `chore`: Maintenance tasks
- `perf`: Performance improvements

**Example:**

```
feat(auth): add OAuth2 integration

- Implement Google OAuth provider
- Add token refresh mechanism
- Update user model with OAuth fields
```

## Execution Workflow

1. **Present commit plan:**

   ```markdown
   ## Proposed Commits

   ### Commit 1: [Type] [Description]

   Files:

   - path/to/file1.js
   - path/to/file2.js

   Message:
   ```

   [commit message]

   ```

   ### Commit 2: [Type] [Description]
   Files:
   - path/to/file3.md

   Message:
   ```

   [commit message]

   ```

   Proceed with these 2 commits? (yes/no/edit)
   ```

2. **Handle user response:**

   - **yes**: Execute as planned
   - **no**: Cancel and ask for guidance
   - **edit**: Allow message/grouping adjustments

3. **Execute commits:**

   ```bash
   # For each commit:
   git add [specific files]
   git commit -m "[message]"
   ```

4. **Verify results:**
   ```bash
   git log --oneline -5
   git status
   ```

## Critical Rules

✅ Use specific file paths with `git add`  
✅ Review diff before committing  
✅ Write clear, descriptive messages  
✅ Group related changes together  
✅ Check branch before committing

❌ DO NOT use `git add -A` or `git add .`  
❌ DO NOT include Claude attribution or co-author info
❌ DO NOT commit sensitive files (.env, secrets)  
❌ DO NOT mix unrelated changes in one commit  
❌ DO NOT commit directly to main without confirmation

## Edge Case Handling

### Large Files

If files > 100MB detected:

```
Warning: Large file detected (path/to/file - 150MB)
GitHub has a 100MB file size limit. Options:
1. Add to .gitignore
2. Use Git LFS
3. Exclude from commit
```

### Sensitive Data

Check for common sensitive patterns:

- Files: `.env`, `*.key`, `*.pem`, `credentials.*`
- Content: API keys, passwords, tokens

If detected:

```
⚠️ Potential sensitive data detected in [file]
Please confirm this should be committed (yes/no)
```

### Empty Commits

If no changes staged:

```
No changes to commit. Would you like to:
1. Review unstaged changes
2. Check untracked files
3. Cancel
```

## Commit Message Best Practices

### Good Examples:

```
feat: add user authentication system

fix: resolve memory leak in data processor

refactor: extract validation logic to separate module

docs: update API documentation with new endpoints
```

### Poor Examples:

```
"fixed stuff"           # Too vague
"EMERGENCY FIX!!!"      # Unclear, emotional
"wip"                   # Non-descriptive
"changes"               # No context
```

## Branch-Specific Behavior

| Branch      | Action                        |
| ----------- | ----------------------------- |
| main/master | Require explicit confirmation |
| develop/dev | Standard flow                 |
| feature/\*  | Standard flow                 |
| hotfix/\*   | Suggest single commit         |

## Post-Commit Options

After successful commits:

```
✓ Created 2 commits successfully

Options:
1. Push to remote (git push)
2. View full log (git log)
3. Continue working
```

Remember: You have full context of this session. Create commits that tell the story of what was accomplished, not just what changed.
