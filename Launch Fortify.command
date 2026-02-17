#!/bin/bash
# Clickable Launcher for Project Fortify

# 0. Load necessary bash profile elements to ensure npm is found
if [ -f "$HOME/.bash_profile" ]; then
    source "$HOME/.bash_profile"
elif [ -f "$HOME/.zshrc" ]; then
    source "$HOME/.zshrc"
fi
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

# Set working directory to the script's location
cd "$(dirname "$0")"

# 1. Kill any existing Next.js dev processes to prevent port/lock conflicts
# We do this silently
pkill -f "next-dev" > /dev/null 2>&1
pkill -f "next dev" > /dev/null 2>&1

# 2. Clear known lock files
rm -rf .next/dev/lock > /dev/null 2>&1

# 3. Launch Default Browser after a delay (in background)
(sleep 4 && open "http://localhost:3000") &

# 4. Start the server (and redirect output to log file to keep things silent but debuggable)
echo "Starting Fortify Server..." > fortify-launch.log
/usr/local/bin/npm run dev >> fortify-launch.log 2>&1
