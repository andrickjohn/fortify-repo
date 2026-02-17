#!/bin/bash

# Explicitly set PATH to include the user's Node.js version
# This is required because AppleScript's 'do shell script' doesn't load the user's shell profile (NVM)
export PATH="/Users/john/.nvm/versions/node/v20.18.3/bin:$PATH"

# Go to project directory
cd "$(dirname "$0")"

# Kill existing processes
pkill -f "next-dev" > /dev/null 2>&1
pkill -f "next dev" > /dev/null 2>&1

# Start new process in background with logging
# nohup allows it to keep running even if this script exits
nohup npm run dev > silent_debug.log 2>&1 &
PID=$!

# Save PID just in case
echo $PID > silent.pid

echo "Started Fortify silently (PID: $PID)"
exit 0
