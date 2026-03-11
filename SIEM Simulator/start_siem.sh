#!/bin/bash
echo "🛡️ Starting Mini-SIEM environment..."

# Ensure we're in the project directory
cd "$(dirname "$0")"

# Activate virtual environment
source venv/bin/activate

# Initialize database just in case
python database.py

echo "Starting Log Generator..."
python log_generator.py &
GEN_PID=$!

echo "Starting Log Ingestor & Parser..."
python ingestor.py &
ING_PID=$!

# Cleanup trap if script is stopped
trap "echo 'Stopping Mini-SIEM...'; kill $GEN_PID $ING_PID; exit" INT TERM EXIT

echo "==================================================="
echo "🚀 Mini-SIEM Dashboard is live!"
echo "👉 Open your browser to: http://localhost:8080"
echo "==================================================="

# Start the API server serving the frontend
uvicorn main:app --host 127.0.0.1 --port 8080
