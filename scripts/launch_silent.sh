#!/bin/bash

# Log file for debugging
LOG_FILE="$HOME/Library/Logs/Fortify.log"
exec > "$LOG_FILE" 2>&1

echo "Starting Fortify at $(date)"

# Add common Node paths
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

# Source user profile to be safe
if [ -f "$HOME/.zshrc" ]; then
    source "$HOME/.zshrc"
elif [ -f "$HOME/.bash_profile" ]; then
    source "$HOME/.bash_profile"
fi

PROJECT_DIR="/Users/andrickjohn/Projects/Test/fortify"

if [ ! -d "$PROJECT_DIR" ]; then
    echo "Error: Directory $PROJECT_DIR not found"
    exit 1
fi

cd "$PROJECT_DIR"

# Install if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Check if port 3000 is already in use, if so, just open browser
if lsof -i :3000 > /dev/null; then
    echo "Port 3000 busy, assuming Fortify is running."
    open "http://localhost:3000"
    exit 0
fi

# Start Server using nohup so it survives script exit
echo "Starting Next.js with nohup..."
nohup npm run dev > "$LOG_FILE" 2>&1 &
SERVER_PID=$!

echo "Server started with PID: $SERVER_PID"

# Wait a moment to ensure it starts (optional, but good for first open)
sleep 2
open "http://localhost:3000"

exit 0
