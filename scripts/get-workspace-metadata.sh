#!/bin/bash
# Get workspace metadata with fallbacks for non-git repositories

# Check if we're in a git repository
if git rev-parse --git-dir > /dev/null 2>&1; then
    IS_GIT=true
else
    IS_GIT=false
fi

# Get current workspace directory
WORKSPACE_DIR=$(pwd)

# Get current date/time (ISO format)
DATETIME_ISO=$(date +"%Y-%m-%dT%H:%M:%S%z")

# Get current date/time (filename format)
DATETIME_FILENAME=$(date +"%Y-%m-%dT%H:%M")

# Get researcher name
if [ "$IS_GIT" = true ]; then
    RESEARCHER=$(git config user.name 2>/dev/null || echo "$USER")
else
    RESEARCHER="$USER"
fi

# Get current git commit
if [ "$IS_GIT" = true ]; then
    # Check if HEAD exists (i.e., if there are any commits)
    if git rev-parse --verify HEAD >/dev/null 2>&1; then
        GIT_COMMIT=$(git rev-parse HEAD)
    else
        GIT_COMMIT="no-commits"
    fi
else
    GIT_COMMIT="not-a-git-repo"
fi

# Get current branch
if [ "$IS_GIT" = true ]; then
    GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "detached")
else
    GIT_BRANCH="not-a-git-repo"
fi

# Get repository name
if command -v gh > /dev/null 2>&1; then
    REPO_NAME=$(gh repo view --json name -q .name 2>/dev/null || basename "$PWD")
else
    REPO_NAME=$(basename "$PWD")
fi

# Output format: key=value pairs that can be sourced or parsed
cat <<EOF
WORKSPACE_DIR=$WORKSPACE_DIR
DATETIME_ISO=$DATETIME_ISO
DATETIME_FILENAME=$DATETIME_FILENAME
RESEARCHER=$RESEARCHER
GIT_COMMIT=$GIT_COMMIT
GIT_BRANCH=$GIT_BRANCH
REPO_NAME=$REPO_NAME
IS_GIT=$IS_GIT
EOF
