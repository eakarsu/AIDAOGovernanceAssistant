#!/bin/bash

# AI DAO Governance Assistant - Start Script
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${PURPLE}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║       AI DAO Governance Assistant                    ║"
echo "║       Starting Application...                       ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ---- Clean up used ports ----
echo -e "${YELLOW}[1/6] Cleaning up ports 3000 and 3001...${NC}"
cleanup_port() {
  local port=$1
  local pids=$(lsof -ti:$port 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo -e "${RED}  Killing processes on port $port: $pids${NC}"
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  else
    echo -e "${GREEN}  Port $port is available${NC}"
  fi
}

cleanup_port 3000
cleanup_port 3001

# ---- Check for .env file ----
echo -e "${YELLOW}[2/6] Checking environment configuration...${NC}"
if [ ! -f .env ]; then
  echo -e "${RED}  ERROR: .env file not found! Please create one with required variables.${NC}"
  exit 1
fi
echo -e "${GREEN}  .env file found${NC}"

# ---- Check PostgreSQL ----
echo -e "${YELLOW}[3/6] Checking PostgreSQL connection...${NC}"
if ! command -v psql &> /dev/null; then
  echo -e "${RED}  PostgreSQL client not found. Please install PostgreSQL.${NC}"
  exit 1
fi

# Create database if it doesn't exist
DB_NAME="aidao_governance"
if psql -U postgres -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
  echo -e "${GREEN}  Database '$DB_NAME' exists${NC}"
else
  echo -e "${CYAN}  Creating database '$DB_NAME'...${NC}"
  createdb -U postgres "$DB_NAME" 2>/dev/null || psql -U postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || true
  echo -e "${GREEN}  Database created${NC}"
fi

# ---- Install dependencies ----
echo -e "${YELLOW}[4/6] Installing dependencies...${NC}"
echo -e "${CYAN}  Installing backend dependencies...${NC}"
cd "$SCRIPT_DIR/backend"
npm install --silent 2>&1 | tail -1
echo -e "${GREEN}  Backend dependencies installed${NC}"

echo -e "${CYAN}  Installing frontend dependencies...${NC}"
cd "$SCRIPT_DIR/frontend"
npm install --silent 2>&1 | tail -1
echo -e "${GREEN}  Frontend dependencies installed${NC}"

cd "$SCRIPT_DIR"

# ---- Seed database ----
echo -e "${YELLOW}[5/6] Seeding database...${NC}"
cd "$SCRIPT_DIR/backend"
node seeds/seed.js
echo -e "${GREEN}  Database seeded successfully${NC}"

cd "$SCRIPT_DIR"

# ---- Start services with hot reload ----
echo -e "${YELLOW}[6/6] Starting services with hot reload...${NC}"

# Start backend with nodemon (auto-reload on changes)
echo -e "${CYAN}  Starting backend on port 3001...${NC}"
cd "$SCRIPT_DIR/backend"
npx nodemon server.js &
BACKEND_PID=$!

# Start frontend (React dev server with hot reload)
echo -e "${CYAN}  Starting frontend on port 3000...${NC}"
cd "$SCRIPT_DIR/frontend"
PORT=3000 BROWSER=none npm start &
FRONTEND_PID=$!

cd "$SCRIPT_DIR"

# ---- Trap cleanup ----
cleanup() {
  echo -e "\n${YELLOW}Shutting down services...${NC}"
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  cleanup_port 3000
  cleanup_port 3001
  echo -e "${GREEN}Services stopped.${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

echo -e ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Application is running!                            ║${NC}"
echo -e "${GREEN}║                                                     ║${NC}"
echo -e "${GREEN}║  Frontend:  ${CYAN}http://localhost:3000${GREEN}                  ║${NC}"
echo -e "${GREEN}║  Backend:   ${CYAN}http://localhost:3001${GREEN}                  ║${NC}"
echo -e "${GREEN}║                                                     ║${NC}"
echo -e "${GREEN}║  Login:     ${CYAN}admin@aidao.io / password123${GREEN}           ║${NC}"
echo -e "${GREEN}║                                                     ║${NC}"
echo -e "${GREEN}║  Hot reload is enabled - changes auto-refresh       ║${NC}"
echo -e "${GREEN}║  Press Ctrl+C to stop                               ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo -e ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
