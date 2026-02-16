#!/bin/bash
# Fixed Silent Launcher with Absolute Paths

# Export paths commonly used (nvm, node, brew, etc.)
export PATH="/Users/john/.nvm/versions/node/v20.18.3/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

PROJECT_DIR="/Users/john/Projects/test/Fortify"
cd "$PROJECT_DIR"

# 1. Kill any existing processes
pkill -f "next-dev" > /dev/null 2>&1
pkill -f "next dev" > /dev/null 2>&1
rm -rf .next/dev/lock > /dev/null 2>&1

# 2. Start the server (Absolute path to npm)
nohup /Users/john/.nvm/versions/node/v20.18.3/bin/npm run dev > ./next-server.log 2>&1 &

# 3. Wait for the server to initialize
sleep 4

# 4. Open the browser
open "http://localhost:3000/dashboard"
