#!/bin/bash

# Set environment variables for development
export DATABASE_URL="./dev.db"
export SESSION_SECRET="dev-secret-key-change-in-production"
export PORT=4000

# Start the development server
echo "Starting ArcadeManager development server..."
echo "Database: SQLite (./dev.db)"
echo "Port: $PORT"
echo "Visit: http://localhost:$PORT"
echo ""

npm run dev
