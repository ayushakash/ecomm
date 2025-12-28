#!/bin/bash

# Application Deployment Script
# Run this from /home/ubuntu/apps/ecomm directory
# Usage: bash deploy-app.sh

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

APP_DIR="/home/ubuntu/apps/ecomm"
DOMAIN=""

echo "======================================"
echo "E-Commerce App Deployment"
echo "======================================"

# Check if .env exists
if [ ! -f "$APP_DIR/.env" ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Please create .env file with your environment variables"
    echo "Example:"
    echo "  NODE_ENV=production"
    echo "  PORT=5000"
    echo "  MONGODB_URI=mongodb://localhost:27017/ecomm"
    echo "  JWT_SECRET=your-secret-here"
    exit 1
fi

# Get domain name
read -p "Enter your subdomain (e.g., uat.yourdomain.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
    echo -e "${RED}Domain is required!${NC}"
    exit 1
fi

# Install backend dependencies
echo -e "${GREEN}[1/6] Installing backend dependencies...${NC}"
cd "$APP_DIR"
npm install --production

# Install frontend dependencies and build
echo -e "${GREEN}[2/6] Building frontend...${NC}"
cd "$APP_DIR/client"
npm install
npm run build

# Create logs directory
echo -e "${GREEN}[3/6] Creating logs directory...${NC}"
mkdir -p "$APP_DIR/logs"

# Setup PM2 ecosystem
echo -e "${GREEN}[4/6] Configuring PM2...${NC}"
cd "$APP_DIR"

cat > ecosystem.config.js << EOL
module.exports = {
  apps: [{
    name: 'ecomm-backend',
    script: './server.js',
    cwd: '$APP_DIR',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '$APP_DIR/logs/backend-error.log',
    out_file: '$APP_DIR/logs/backend-out.log',
    log_file: '$APP_DIR/logs/backend-combined.log',
    time: true
  }]
}
EOL

# Start/Restart backend with PM2
pm2 delete ecomm-backend 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup | grep "sudo" | bash || true

# Configure Nginx
echo -e "${GREEN}[5/6] Configuring Nginx...${NC}"

sudo tee /etc/nginx/sites-available/ecomm > /dev/null << EOL
server {
    listen 80;
    server_name $DOMAIN;

    # Frontend (React build)
    root $APP_DIR/client/build;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Serve static files
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket support
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOL

# Enable site
sudo ln -sf /etc/nginx/sites-available/ecomm /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Setup SSL
echo -e "${GREEN}[6/6] Setting up SSL certificate...${NC}"
read -p "Do you want to setup SSL now? (requires DNS to be configured) (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN || echo -e "${YELLOW}SSL setup failed. You can run 'sudo certbot --nginx -d $DOMAIN' later${NC}"
else
    echo -e "${YELLOW}Skipping SSL setup. Run 'sudo certbot --nginx -d $DOMAIN' when DNS is configured${NC}"
fi

echo ""
echo -e "${GREEN}======================================"
echo "Deployment Complete!"
echo "======================================"
echo ""
echo "Application Status:"
pm2 status
echo ""
echo "Your application should be accessible at:"
echo "  http://$DOMAIN (or https if SSL was configured)"
echo ""
echo "Useful commands:"
echo "  pm2 logs ecomm-backend  - View backend logs"
echo "  pm2 restart ecomm-backend - Restart backend"
echo "  pm2 monit - Monitor resources"
echo "  sudo systemctl status nginx - Check Nginx status"
echo ""
echo "GoDaddy DNS Configuration:"
echo "  1. Login to GoDaddy"
echo "  2. Go to DNS Management"
echo "  3. Add A Record:"
echo "     Type: A"
echo "     Name: ${DOMAIN%%.*} (subdomain part)"
echo "     Value: $(curl -s ifconfig.me)"
echo "     TTL: 600"
echo ""
