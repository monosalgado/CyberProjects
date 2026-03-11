#!/bin/bash
echo "🛡️ Starting Security Awareness Training Platform..."

# Ensure we're in the project directory
cd "$(dirname "$0")"

# Activate virtual environment
source venv/bin/activate

# Start the API server serving the frontend
echo "==================================================="
echo "🚀 Training Platform is live!"
echo "👉 Open your browser to: http://localhost:8081"
echo "==================================================="

uvicorn main:app --host 127.0.0.1 --port 8081
