#!/bin/bash

# Simple HTTP server for Circuit Schematic Builder
# This is needed because browsers block loading local files via fetch()

PORT=8000

echo "Starting Circuit Schematic Builder..."
echo "Server will run at: http://localhost:${PORT}"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Try python3 first, then python2, then node
if command -v python3 &> /dev/null; then
    echo "Using Python 3"
    cd "$(dirname "$0")"
    python3 -m http.server $PORT
elif command -v python &> /dev/null; then
    echo "Using Python 2"
    cd "$(dirname "$0")"
    python -m SimpleHTTPServer $PORT
elif command -v node &> /dev/null && command -v npx &> /dev/null; then
    echo "Using Node.js http-server"
    cd "$(dirname "$0")"
    npx http-server -p $PORT
else
    echo "ERROR: No suitable HTTP server found!"
    echo "Please install Python 3 or Node.js to run this application."
    exit 1
fi
