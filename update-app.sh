#!/bin/bash

# Application Update Script
# Run this when you want to deploy new changes
# Usage: bash update-app.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

APP_DIR="/home/ubuntu/apps/ecomm"

echo "======================================"
echo "Updating E-Commerce Application"
echo "======================================"

cd "$APP_DIR"

# Pull latest code
echo -e "${GREEN}[1/5] Pulling latest code...${NC}"
git pull origin main || git pull origin master

# Update backend dependencies
echo -e "${GREEN}[2/5] Updating backend dependencies...${NC}"
npm install --production

# Update and rebuild frontend
echo -e "${GREEN}[3/5] Rebuilding frontend...${NC}"
cd client
npm install
npm run build

# Restart backend
echo -e "${GREEN}[4/5] Restarting backend...${NC}"
cd "$APP_DIR"
pm2 restart ecomm-backend

# Reload Nginx
echo -e "${GREEN}[5/5] Reloading Nginx...${NC}"
sudo systemctl reload nginx

echo ""
echo -e "${GREEN}======================================"
echo "Update Complete!"
echo "======================================"
echo ""
pm2 status
echo ""
echo "Application updated successfully!"
echo ""
