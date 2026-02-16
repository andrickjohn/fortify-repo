#!/bin/bash
# Desktop Launcher for Project Fortify

# Point to the specific project directory
PROJECT_DIR="/Users/john/Projects/test/Fortify"
cd "$PROJECT_DIR"

echo "--------------------------------------------------"
echo "🚀 PROJECT FORTIFY: DESKTOP LAUNCH"
echo "--------------------------------------------------"

# 1. Kill any existing Next.js dev processes to prevent port/lock conflicts
echo "Stopping existing processes..."
pkill -f "next-dev" > /dev/null 2>&1
pkill -f "next dev" > /dev/null 2>&1

# 2. Clear known lock files
rm -rf .next/dev/lock > /dev/null 2>&1

# 3. Launch the server
# 3. Launch the server in a new Terminal window
echo "Launching Dev Server in Terminal..."
osascript -e "tell application \"Terminal\" to do script \"cd '$PROJECT_DIR' && echo '🚀 PROJECT FORTIFY: DEPLOYED' && npm run dev\""

# 4. Exit successfully so the wrapper app doesn't hang
exit 0
