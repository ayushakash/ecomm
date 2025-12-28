#!/bin/bash

# EC2 Initial Setup Script
# Run this script on your EC2 instance after first login
# Usage: bash deploy-setup.sh

set -e  # Exit on error

echo "======================================"
echo "EC2 Initial Setup for E-Commerce App"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Update system
echo -e "${GREEN}[1/8] Updating system...${NC}"
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
echo -e "${GREEN}[2/8] Installing Node.js 18...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Install Nginx
echo -e "${GREEN}[3/8] Installing Nginx...${NC}"
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Install PM2
echo -e "${GREEN}[4/8] Installing PM2...${NC}"
sudo npm install -g pm2

# Install Git
echo -e "${GREEN}[5/8] Installing Git...${NC}"
sudo apt install -y git

# Install Certbot for SSL
echo -e "${GREEN}[6/8] Installing Certbot...${NC}"
sudo apt install -y certbot python3-certbot-nginx

# Create application directory
echo -e "${GREEN}[7/8] Creating application directory...${NC}"
mkdir -p /home/ubuntu/apps
cd /home/ubuntu/apps

# Install MongoDB (optional)
read -p "Do you want to install MongoDB locally? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo -e "${GREEN}[8/8] Installing MongoDB...${NC}"
    wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
    sudo apt update
    sudo apt install -y mongodb-org
    sudo systemctl start mongod
    sudo systemctl enable mongod
    echo -e "${GREEN}MongoDB installed and started${NC}"
else
    echo -e "${YELLOW}Skipping MongoDB installation. Make sure to use MongoDB Atlas.${NC}"
fi

echo ""
echo -e "${GREEN}======================================"
echo "Setup Complete!"
echo "======================================"
echo ""
echo "Next Steps:"
echo "1. Clone your repository to /home/ubuntu/apps/"
echo "2. Run: cd /home/ubuntu/apps/ecomm"
echo "3. Run: bash deploy-app.sh"
echo ""
