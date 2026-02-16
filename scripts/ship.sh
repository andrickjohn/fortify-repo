#!/bin/bash

# Fortify Deployment Helper Script
# Usage: ./scripts/ship.sh "Description of changes"

echo "🚢 Preparing to ship updates to Fortify..."

# 0. Verify Build Integrity
echo "🏗️  Verifying build integrity..."
# Run build relative to the script location (assuming script is in /scripts and project root is one level up)
# But wait, the script is run from project root usually. Let's assume CWD is project root as per usage.
if npm run build; then
  echo "✅ Build successful. Proceeding with deployment..."
else
  echo "❌ Build failed. Aborting deployment to prevent breaking production."
  exit 1
fi

# 1. Check if we are on the main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "⚠️  You are on branch '$CURRENT_BRANCH'. Switching to 'main'..."
  git checkout main
  git pull origin main
  git merge $CURRENT_BRANCH
fi

# 2. Stage all changes
if [[ -z $(git status -s) ]]; then
  echo "✅ No local changes to ship."
else
  echo "📦 Staging files..."
  git add .
  
  # 3. Commit
  MSG="$1"
  
  if [ -z "$MSG" ]; then
    # Generate suggestion based on changed files
    CHANGED_FILES=$(git diff --name-only --cached | tr '\n' ',' | sed 's/,$//' | sed 's/,/, /g')
    FILE_COUNT=$(echo "$CHANGED_FILES" | awk -F, '{print NF}')
    
    if [ "$FILE_COUNT" -gt 3 ]; then
       # Too many files, just show count
       SUGGESTION="Update $FILE_COUNT files"
    else
       SUGGESTION="Update: $CHANGED_FILES"
    fi
    
    echo "💡 Suggested message: \"$SUGGESTION\""
    read -p "📝 Enter commit message (Press Enter to use suggestion): " USER_INPUT
    
    if [ -z "$USER_INPUT" ]; then
      MSG="$SUGGESTION"
    else
      MSG="$USER_INPUT"
    fi
  fi
  
  if [ -z "$MSG" ]; then
      echo "❌ Commit message required. Aborting."
      exit 1
  fi
  
  git commit -m "$MSG"
  echo "✅ Committed: $MSG"
fi

# 4. Push to GitHub (Triggers Vercel)
echo "🚀 Pushing to GitHub..."
if git push origin main; then
  echo "---------------------------------------------------"
  echo "✅ Code pushed successfully!"
  echo "🎉 Deployment logic verified: Local build passed & Code synced to GitHub."
  echo "☁️  Vercel is now building the production version."
  echo "---------------------------------------------------"
else
  echo "❌ Push failed."
  exit 1
fi
