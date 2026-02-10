#!/bin/bash
cd "$(dirname "$0")"

echo "Checking dependencies..."
pip3 install -r requirements.txt

echo "Starting Backend API Server..."
python3 server.py &
SERVER_PID=$!

echo "Starting Frontend Web Server..."
# Run frontend on port 8002 to avoid conflicts
# Verify 8002 is free or just use it.
open "http://localhost:8002/physical_sales_tool.html"
python3 -m http.server 8002

# Cleanup on exit
kill $SERVER_PID
