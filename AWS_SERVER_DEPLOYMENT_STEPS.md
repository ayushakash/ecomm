# AWS EC2 Server Deployment - Complete Step-by-Step Guide

## Overview
This guide will deploy the Chardeevari e-commerce application using Docker containers pulled from Docker Hub (ayushmishra9/ecomm-backend and ayushmishra9/ecomm-frontend).

---

## STEP 1: Install Docker

Run these commands:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add ubuntu user to docker group
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clean up
rm get-docker.sh
```

**IMPORTANT:** After running these commands, LOG OUT and LOG BACK IN for docker group to take effect.

Then verify:
```bash
docker --version
docker compose version
```

---

## STEP 2: Create Application Directory

```bash
mkdir -p ~/ecomm-app
cd ~/ecomm-app
```

---

## STEP 3: Create docker-compose.yml

Run this command to create the file:

```bash
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  backend:
    image: ayushmishra9/ecomm-backend:latest
    container_name: ecomm-backend
    restart: always
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
      PORT: 5000
      HOST: 0.0.0.0
      MONGODB_URI: ${MONGODB_URI}
      JWT_SECRET: ${JWT_SECRET}
      SESSION_SECRET: ${SESSION_SECRET}
      MSG91_AUTH_KEY: ${MSG91_AUTH_KEY:-471309TydHm2HpEe68dce0f9P1}
      MSG91_SENDER_ID: ${MSG91_SENDER_ID:-CNSMAT}
      MSG91_ROUTE: ${MSG91_ROUTE:-4}
      MSG91_COUNTRY: ${MSG91_COUNTRY:-91}
      MSG91_OTP_ENABLED: ${MSG91_OTP_ENABLED:-true}
      OTP_EXPIRY_MINUTES: ${OTP_EXPIRY_MINUTES:-5}
      N8N_ENABLED: ${N8N_ENABLED:-false}
      ABANDONED_CART_ENABLED: ${ABANDONED_CART_ENABLED:-true}
      FRONTEND_URL: ${FRONTEND_URL}
    networks:
      - ecomm-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  frontend:
    image: ayushmishra9/ecomm-frontend:latest
    container_name: ecomm-frontend
    restart: always
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - ecomm-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

networks:
  ecomm-network:
    driver: bridge
EOF
```

Verify the file was created:
```bash
cat docker-compose.yml
```

---

## STEP 4: Generate Security Secrets

Run these commands to generate random secrets:

```bash
echo "JWT_SECRET:"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

echo ""
echo "SESSION_SECRET:"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**IMPORTANT:** Copy these two generated values - you'll need them in the next step.

---

## STEP 5: Create .env File

**BEFORE running this command, you need:**
1. MongoDB Atlas connection string (get from https://cloud.mongodb.com)
2. JWT_SECRET (generated in Step 4)
3. SESSION_SECRET (generated in Step 4)
4. Your domain name (e.g., uat.yourdomain.com)

Run this command and **REPLACE the placeholder values**:

```bash
cat > .env << 'EOF'
# Database - MongoDB Atlas Connection String
# Get from: https://cloud.mongodb.com -> Connect -> Connect your application
# Format: mongodb+srv://username:password@cluster.mongodb.net/dbname
MONGODB_URI=REPLACE_WITH_YOUR_MONGODB_ATLAS_CONNECTION_STRING

# Security - Use the generated values from Step 4
JWT_SECRET=REPLACE_WITH_GENERATED_JWT_SECRET
SESSION_SECRET=REPLACE_WITH_GENERATED_SESSION_SECRET

# MSG91 Configuration (SMS/OTP Service)
MSG91_AUTH_KEY=471309TydHm2HpEe68dce0f9P1
MSG91_SENDER_ID=CNSMAT
MSG91_ROUTE=4
MSG91_COUNTRY=91
MSG91_OTP_ENABLED=true
OTP_EXPIRY_MINUTES=5

# Features
N8N_ENABLED=false
ABANDONED_CART_ENABLED=true

# Frontend URL - Replace with your actual domain
FRONTEND_URL=https://REPLACE_WITH_YOUR_DOMAIN
EOF
```

**NOW EDIT THE FILE** to replace the placeholder values:
```bash
nano .env
```

Replace:
- `REPLACE_WITH_YOUR_MONGODB_ATLAS_CONNECTION_STRING`
- `REPLACE_WITH_GENERATED_JWT_SECRET`
- `REPLACE_WITH_GENERATED_SESSION_SECRET`
- `REPLACE_WITH_YOUR_DOMAIN`

Save: `Ctrl+X`, then `Y`, then `Enter`

---

## STEP 6: MongoDB Atlas Setup

**On your local machine or browser:**

1. Go to https://cloud.mongodb.com
2. Sign up / Login
3. Create a **FREE cluster** (M0 Sandbox)
4. Click **Connect** → **Connect your application**
5. Copy the connection string
6. **IMPORTANT - Network Access:**
   - Click **Network Access** in left menu
   - Click **Add IP Address**
   - Add your EC2 server's public IP with `/32`
   - Example: `54.123.45.67/32`
7. **IMPORTANT - Database User:**
   - Click **Database Access** in left menu
   - Make sure you have a database user created
   - Note the username and password

**Update your .env file** with the MongoDB connection string:
```bash
nano .env
# Update MONGODB_URI with the connection string
# Replace <password> with your actual database password
# Replace <dbname> with: construction-ecommerce
```

---

## STEP 7: Pull Docker Images

```bash
cd ~/ecomm-app

# Login to Docker Hub (if needed)
# docker login

# Pull images from Docker Hub
docker compose pull
```

This will download:
- `ayushmishra9/ecomm-backend:latest` (~197MB)
- `ayushmishra9/ecomm-frontend:latest` (~51MB)

---

## STEP 8: Start the Application

```bash
cd ~/ecomm-app

# Start containers in detached mode
docker compose up -d

# Check status
docker compose ps
```

**Expected output:**
```
NAME              IMAGE                                  STATUS
ecomm-backend     ayushmishra9/ecomm-backend:latest     Up (healthy)
ecomm-frontend    ayushmishra9/ecomm-frontend:latest    Up (healthy)
```

---

## STEP 9: Verify Application is Running

```bash
# Check backend health
curl http://localhost:5000/health

# Expected: {"status":"ok","message":"Backend is running"}

# Check frontend
curl http://localhost | grep title

# Expected: <title>Chardeevari - Construction Materials E-commerce</title>

# View logs
docker compose logs backend | tail -20
docker compose logs frontend | tail -20
```

**You should see in backend logs:**
- ✅ "MongoDB connected"
- ✅ "Server running on 0.0.0.0:5000"

---

## STEP 10: Install and Configure Nginx

```bash
# Install Nginx and Certbot for SSL
sudo apt install -y nginx certbot python3-certbot-nginx
```

Create Nginx configuration:

```bash
# Replace uat.yourdomain.com with YOUR actual domain
DOMAIN="uat.yourdomain.com"

sudo tee /etc/nginx/sites-available/ecomm > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to frontend container
    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
```

Enable the site:
```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/ecomm /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Check status
sudo systemctl status nginx
```

---

## STEP 11: Configure GoDaddy DNS

**On GoDaddy website:**

1. Login to https://www.godaddy.com
2. Go to **My Products** → Click **DNS** next to your domain
3. Click **Add** to add a new record
4. Configure:
   - **Type:** A
   - **Name:** uat (or your desired subdomain)
   - **Value:** YOUR_EC2_ELASTIC_IP (get from AWS console)
   - **TTL:** 600 seconds
5. Click **Save**

**Wait 5-30 minutes for DNS to propagate**

Test DNS resolution:
```bash
# Replace with your domain
nslookup uat.yourdomain.com

# Should return your EC2 IP address
```

---

## STEP 12: Setup SSL Certificate (HTTPS)

**IMPORTANT:** Only run this AFTER DNS is working (Step 11 is complete)

```bash
# Replace uat.yourdomain.com with YOUR actual domain
DOMAIN="uat.yourdomain.com"

# Get SSL certificate
sudo certbot --nginx -d $DOMAIN

# Follow the prompts:
# 1. Enter your email address
# 2. Agree to Terms of Service (Y)
# 3. Share email with EFF (optional - your choice)
# 4. It will automatically configure Nginx for HTTPS
```

**Test auto-renewal:**
```bash
sudo certbot renew --dry-run
```

**Verify SSL:**
```bash
# Visit your domain in a browser
# https://uat.yourdomain.com
# You should see a padlock icon (secure connection)
```

---

## STEP 13: Final Verification

```bash
# Check all services
docker compose ps

# Check Nginx
sudo systemctl status nginx

# View application logs
docker compose logs -f

# Test backend API
curl https://uat.yourdomain.com/api/health

# Or from browser, visit:
# https://uat.yourdomain.com
```

---

## COMPLETE! Your Application is Deployed 🎉

**Application URLs:**
- Frontend: https://uat.yourdomain.com
- Backend API: https://uat.yourdomain.com/api
- Direct Backend: http://YOUR_EC2_IP:5000

---

## Common Commands for Management

### View Logs
```bash
cd ~/ecomm-app

# All logs
docker compose logs -f

# Backend only
docker compose logs -f backend

# Last 100 lines
docker compose logs --tail=100
```

### Restart Services
```bash
cd ~/ecomm-app

# Restart all
docker compose restart

# Restart backend only
docker compose restart backend

# Restart frontend only
docker compose restart frontend
```

### Update Application (Deploy New Version)
```bash
cd ~/ecomm-app

# Pull latest images
docker compose pull

# Restart with new images
docker compose up -d

# Verify
docker compose ps
```

### Stop Application
```bash
cd ~/ecomm-app
docker compose stop
```

### Start Application
```bash
cd ~/ecomm-app
docker compose start
```

### Remove Everything
```bash
cd ~/ecomm-app

# Stop and remove containers
docker compose down

# Stop, remove containers and volumes
docker compose down -v
```

### Check Resource Usage
```bash
# Container stats
docker stats

# Disk usage
docker system df

# Clean up unused images
docker system prune -a
```

---

## Troubleshooting

### Container won't start
```bash
# Check logs
docker compose logs backend
docker compose logs frontend

# Check if ports are available
sudo netstat -tulpn | grep -E ':80|:5000'
```

### Can't connect to MongoDB
```bash
# Check MongoDB connection string in .env
cat .env | grep MONGODB_URI

# Check backend logs
docker compose logs backend | grep -i mongo

# Verify MongoDB Atlas:
# 1. IP is whitelisted
# 2. Database user exists
# 3. Password is correct in connection string
```

### SSL certificate fails
```bash
# Make sure DNS is working first
nslookup uat.yourdomain.com

# Check Nginx configuration
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### Application not accessible
```bash
# Check EC2 Security Group allows:
# - Port 80 (HTTP)
# - Port 443 (HTTPS)
# - Port 22 (SSH)

# Check Nginx status
sudo systemctl status nginx

# Check containers
docker compose ps
```

---

## Security Checklist

- [ ] JWT_SECRET and SESSION_SECRET are random and secure
- [ ] MongoDB Atlas IP whitelist is configured
- [ ] EC2 Security Group limits SSH to your IP only
- [ ] SSL certificate is installed and working
- [ ] `.env` file has proper permissions (not world-readable)
- [ ] Firewall (UFW) is configured if needed
- [ ] Regular backups are scheduled

---

## Next Steps

1. **Setup Monitoring:**
   - Use AWS CloudWatch
   - Setup UptimeRobot (free)
   - Monitor Docker container health

2. **Setup Backups:**
   - MongoDB Atlas automatic backups (included in free tier)
   - Backup `.env` file securely

3. **Setup CI/CD:**
   - GitHub Actions to auto-deploy on push
   - Automated testing before deployment

4. **Performance Optimization:**
   - Setup CDN (CloudFront) for static assets
   - Configure caching headers
   - Enable gzip compression

---

## Support

If you encounter issues:

1. Check logs: `docker compose logs -f`
2. Check this troubleshooting section
3. Verify all steps were completed
4. Check EC2 Security Group settings
5. Verify MongoDB Atlas configuration

---

**End of Deployment Guide**

Your e-commerce application is now running on AWS EC2 with Docker! 🚀
use the server configuration use the domain name uat.chardeevari.in for frontned and backend
