#!/bin/bash
# Clickable Launcher for Project Fortify

# Set working directory to the script's location
cd "$(dirname "$0")"

echo "--------------------------------------------------"
echo "🚀 PROJECT FORTIFY: CLEAN LAUNCH"
echo "--------------------------------------------------"

# 0. Check for node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 Dependencies missing. Installing..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ unexpected error during npm install. Please check your internet connection or package.json."
        read -n 1 -s -r -p "Press any key to exit..."
        exit 1
    fi
fi

# 1. Kill any existing Next.js dev processes to prevent port/lock conflicts
echo "🛑 Stopping existing processes..."
pkill -f "next-dev" > /dev/null 2>&1
pkill -f "next dev" > /dev/null 2>&1

# 2. Clear known lock files
rm -rf .next/dev/lock > /dev/null 2>&1

# 3. Launch the server
echo "✅ Starting Dev Server..."

# Start the server in the background and capture its PID
npm run dev &
SERVER_PID=$!

# Function to handle cleanup on exit
cleanup() {
    echo "Shutting down..."
    kill $SERVER_PID
}
trap cleanup EXIT

# 4. Wait for the server to be ready and open the browser
echo "⏳ Waiting for server to be ready at http://localhost:3000..."
max_attempts=30
attempt=0
while ! curl --output /dev/null --silent --head --fail http://localhost:3000; do
    if [ $attempt -ge $max_attempts ]; then
        echo "❌ Server failed to start within time limit."
        echo "Check the output above for errors."
        read -n 1 -s -r -p "Press any key to exit..."
        exit 1
    fi
    printf "."
    sleep 2
    attempt=$((attempt+1))
done

echo ""
echo "🎉 Server is ready! Opening browser..."
open "http://localhost:3000"

# Keep the script running to keep the server alive
wait $SERVER_PID

echo "Server process ended. Press any key to close..."
read -n 1 -s -r
