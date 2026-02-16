#!/bin/bash
# Clickable Launcher for Project Fortify

# Set working directory to the script's location
cd "$(dirname "$0")"

echo "--------------------------------------------------"
echo "🚀 PROJECT FORTIFY: CLEAN LAUNCH"
echo "--------------------------------------------------"

# 1. Kill any existing Next.js dev processes to prevent port/lock conflicts
echo "Stopping existing processes..."
pkill -f "next-dev" > /dev/null 2>&1
pkill -f "next dev" > /dev/null 2>&1

# 2. Clear known lock files
rm -rf .next/dev/lock > /dev/null 2>&1

# 3. Launch the server
echo "Starting Dev Server at http://localhost:3000 ..."
npm run dev
