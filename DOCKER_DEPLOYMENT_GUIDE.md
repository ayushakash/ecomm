# Docker Deployment Guide - Push to Docker Hub & Deploy to EC2

Complete guide to containerize, push to Docker Hub, and deploy your e-commerce app.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Build Docker Images Locally](#build-docker-images-locally)
3. [Push to Docker Hub](#push-to-docker-hub)
4. [Deploy on EC2](#deploy-on-ec2)
5. [Setup SSL](#setup-ssl)
6. [Monitoring & Management](#monitoring--management)

---

## Prerequisites

### 1. Install Docker on Your Local Machine

**Ubuntu/Linux:**
```bash
# Update package index
sudo apt update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group (to run without sudo)
sudo usermod -aG docker $USER

# Log out and log back in, then verify
docker --version
docker-compose --version
```

**Windows/Mac:**
- Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### 2. Create Docker Hub Account

1. Go to [https://hub.docker.com](https://hub.docker.com)
2. Click **Sign Up** (Free tier is sufficient)
3. Verify your email
4. Note your username (e.g., `johnsmith`)

---

## Build Docker Images Locally

### Step 1: Login to Docker Hub

```bash
# From your local machine (in /home/oem/projects/ecomm)
docker login

# Enter your Docker Hub username and password
# Username: your-dockerhub-username
# Password: your-dockerhub-password
```

### Step 2: Build Backend Image

```bash
cd /home/oem/projects/ecomm

# Build backend image
# Replace 'yourusername' with your actual Docker Hub username
docker build -t yourusername/ecomm-backend:latest .

# Example: docker build -t johnsmith/ecomm-backend:latest .
```

This will take 2-5 minutes.

### Step 3: Build Frontend Image

```bash
cd /home/oem/projects/ecomm/client

# Build frontend image
docker build -t yourusername/ecomm-frontend:latest .

# Example: docker build -t johnsmith/ecomm-frontend:latest .
```

This will take 3-7 minutes (builds React app).

### Step 4: Verify Images

```bash
# List your Docker images
docker images | grep ecomm

# Should show:
# yourusername/ecomm-backend    latest    abc123...   5 minutes ago   150MB
# yourusername/ecomm-frontend   latest    def456...   2 minutes ago   25MB
```

### Step 5: Test Locally (Optional but Recommended)

```bash
cd /home/oem/projects/ecomm

# Create .env.production file
cp .env .env.production

# Edit if needed
nano .env.production

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Test in browser
# Open: http://localhost

# Stop services
docker-compose down
```

---

## Push to Docker Hub

### Step 1: Tag Images (if not already tagged)

```bash
# Tag backend (if you didn't use the full name when building)
docker tag ecomm-backend:latest yourusername/ecomm-backend:latest

# Tag frontend
docker tag ecomm-frontend:latest yourusername/ecomm-frontend:latest
```

### Step 2: Push Backend Image

```bash
docker push yourusername/ecomm-backend:latest

# Example: docker push johnsmith/ecomm-backend:latest
```

This will upload ~150MB (takes 5-15 minutes depending on internet speed).

**Output:**
```
latest: digest: sha256:abc123... size: 2841
```

### Step 3: Push Frontend Image

```bash
docker push yourusername/ecomm-frontend:latest
```

This will upload ~25MB (takes 2-5 minutes).

### Step 4: Verify on Docker Hub

1. Go to [https://hub.docker.com](https://hub.docker.com)
2. Login
3. Click **Repositories**
4. You should see:
   - `yourusername/ecomm-backend`
   - `yourusername/ecomm-frontend`

---

## Deploy on EC2

### Step 1: Setup EC2 Instance

1. Launch Ubuntu 22.04 EC2 instance (t2.small or larger)
2. Security Group - Open ports:
   ```
   SSH (22) - Your IP
   HTTP (80) - 0.0.0.0/0
   HTTPS (443) - 0.0.0.0/0
   ```
3. Allocate Elastic IP
4. SSH into instance

### Step 2: Install Docker on EC2

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

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

# Verify installation
docker --version
docker-compose --version

# Log out and log back in for group changes to take effect
exit
```

### Step 3: Upload Configuration Files

```bash
# From your local machine, create deployment directory on EC2
ssh -i your-key.pem ubuntu@YOUR_EC2_IP "mkdir -p ~/ecomm-app"

# Upload docker-compose.prod.yml
scp -i your-key.pem docker-compose.prod.yml ubuntu@YOUR_EC2_IP:~/ecomm-app/

# Or create it manually on EC2 (next step)
```

### Step 4: Create Production Files on EC2

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

cd ~/ecomm-app

# Create docker-compose.prod.yml
nano docker-compose.prod.yml
```

**Paste this content** (replace `yourusername` with your Docker Hub username):

```yaml
version: '3.8'

services:
  backend:
    image: yourusername/ecomm-backend:latest
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
      MSG91_AUTH_KEY: ${MSG91_AUTH_KEY}
      MSG91_SENDER_ID: ${MSG91_SENDER_ID}
      MSG91_ROUTE: ${MSG91_ROUTE:-4}
      MSG91_COUNTRY: ${MSG91_COUNTRY:-91}
      MSG91_OTP_ENABLED: ${MSG91_OTP_ENABLED:-true}
      OTP_EXPIRY_MINUTES: ${OTP_EXPIRY_MINUTES:-5}
      N8N_ENABLED: ${N8N_ENABLED:-false}
      ABANDONED_CART_ENABLED: ${ABANDONED_CART_ENABLED:-true}
      FRONTEND_URL: ${FRONTEND_URL}
    networks:
      - ecomm-network

  frontend:
    image: yourusername/ecomm-frontend:latest
    container_name: ecomm-frontend
    restart: always
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - ecomm-network

networks:
  ecomm-network:
    driver: bridge
```

**Save**: `Ctrl+X`, `Y`, `Enter`

### Step 5: Create Environment File

```bash
# Create .env file
nano .env
```

**Add your environment variables:**

```env
# Database - Use MongoDB Atlas (recommended)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ecomm?retryWrites=true&w=majority

# Security - Generate random secrets
JWT_SECRET=your-super-long-random-secret-here
SESSION_SECRET=another-super-long-random-secret-here

# MSG91 Configuration
MSG91_AUTH_KEY=your-msg91-auth-key
MSG91_SENDER_ID=CNSMAT
MSG91_ROUTE=4
MSG91_COUNTRY=91
MSG91_OTP_ENABLED=true
OTP_EXPIRY_MINUTES=5

# Configuration
N8N_ENABLED=false
ABANDONED_CART_ENABLED=true

# Frontend URL (update with your domain)
FRONTEND_URL=https://uat.yourdomain.com
```

**Generate secrets:**
```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Save**: `Ctrl+X`, `Y`, `Enter`

### Step 6: Pull and Start Containers

```bash
cd ~/ecomm-app

# Pull latest images from Docker Hub
docker-compose -f docker-compose.prod.yml pull

# Start containers
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Step 7: Verify Deployment

```bash
# Check if containers are running
docker ps

# Test backend
curl http://localhost:5000/health

# Test frontend
curl http://localhost

# Should return HTML
```

---

## Setup DNS (GoDaddy)

### Step 1: Configure A Record

1. Login to GoDaddy
2. Go to **My Products** → **DNS**
3. Add A Record:
   ```
   Type: A
   Name: uat
   Value: YOUR_EC2_ELASTIC_IP
   TTL: 600
   ```
4. Save and wait 5-30 minutes

### Step 2: Verify DNS

```bash
nslookup uat.yourdomain.com
# Should return your EC2 IP
```

---

## Setup SSL (HTTPS)

### Option 1: Using Nginx Reverse Proxy (Recommended)

#### Step 1: Install Nginx on EC2

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

#### Step 2: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/ecomm
```

**Add this configuration:**

```nginx
server {
    listen 80;
    server_name uat.yourdomain.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Step 3: Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/ecomm /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

#### Step 4: Get SSL Certificate

```bash
sudo certbot --nginx -d uat.yourdomain.com

# Follow prompts:
# - Enter email
# - Agree to terms
# - Choose: Redirect HTTP to HTTPS
```

Now your site is accessible at: **https://uat.yourdomain.com**

---

## Updating Your Application

### Step 1: Build New Images Locally

```bash
# On your local machine
cd /home/oem/projects/ecomm

# Make your code changes, then rebuild
docker build -t yourusername/ecomm-backend:latest .

cd client
docker build -t yourusername/ecomm-frontend:latest .
```

### Step 2: Push to Docker Hub

```bash
docker push yourusername/ecomm-backend:latest
docker push yourusername/ecomm-frontend:latest
```

### Step 3: Update on EC2

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

cd ~/ecomm-app

# Pull latest images
docker-compose -f docker-compose.prod.yml pull

# Restart containers
docker-compose -f docker-compose.prod.yml up -d

# Verify
docker-compose -f docker-compose.prod.yml ps
```

---

## Monitoring & Management

### Useful Docker Commands

```bash
# View running containers
docker ps

# View all containers (including stopped)
docker ps -a

# View logs
docker logs ecomm-backend
docker logs ecomm-frontend
docker logs -f ecomm-backend  # Follow logs

# Stop containers
docker-compose -f docker-compose.prod.yml stop

# Start containers
docker-compose -f docker-compose.prod.yml start

# Restart containers
docker-compose -f docker-compose.prod.yml restart

# Remove containers
docker-compose -f docker-compose.prod.yml down

# View resource usage
docker stats

# Execute commands in container
docker exec -it ecomm-backend sh
docker exec -it ecomm-backend node -e "console.log('Hello')"

# View container details
docker inspect ecomm-backend
```

### Health Checks

```bash
# Backend health
curl http://localhost:5000/health

# Frontend health
curl http://localhost/health

# Container health status
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### Clean Up

```bash
# Remove unused images
docker image prune -a

# Remove unused containers
docker container prune

# Remove unused volumes
docker volume prune

# Remove everything unused
docker system prune -a
```

---

## Troubleshooting

### Container won't start

```bash
# Check logs
docker logs ecomm-backend
docker logs ecomm-frontend

# Check if port is already in use
sudo netstat -tulpn | grep 5000
sudo netstat -tulpn | grep 80
```

### Cannot connect to MongoDB

```bash
# Check MONGODB_URI in .env
cat .env | grep MONGODB_URI

# If using MongoDB Atlas:
# - Verify connection string
# - Whitelist EC2 IP in Atlas
```

### Image pull fails

```bash
# Verify image exists on Docker Hub
docker search yourusername/ecomm-backend

# Login to Docker Hub on EC2
docker login

# Try pulling manually
docker pull yourusername/ecomm-backend:latest
```

### Frontend shows blank page

```bash
# Rebuild frontend locally with production settings
cd /home/oem/projects/ecomm/client

# Check environment variables in build
npm run build

# Push new image
docker build -t yourusername/ecomm-frontend:latest .
docker push yourusername/ecomm-frontend:latest

# Update on EC2
docker-compose -f docker-compose.prod.yml pull frontend
docker-compose -f docker-compose.prod.yml up -d frontend
```

---

## Advantages of Docker Deployment

✅ **Consistency**: Same environment on local, UAT, and production
✅ **Easy Updates**: Just push new image and restart containers
✅ **Rollback**: Easy to rollback to previous image version
✅ **Portability**: Move to any cloud provider easily
✅ **Scalability**: Easy to add more instances
✅ **Isolation**: Each service runs in isolated container

---

## Docker Hub Free Tier Limits

- **Storage**: Unlimited public repositories
- **Pulls**: Unlimited
- **Pushes**: Unlimited
- **Private Repos**: 1 private repository (upgrade for more)

---

## Cost Estimation

- **EC2 t2.small**: ~$17/month
- **Elastic IP**: Free (when associated)
- **MongoDB Atlas Free Tier**: $0
- **Docker Hub Free**: $0
- **SSL (Let's Encrypt)**: Free

**Total**: ~$17/month

---

## Next Steps

1. **Setup CI/CD**: Automate builds with GitHub Actions
2. **Monitoring**: Add monitoring (Prometheus, Grafana)
3. **Backup**: Setup automated backups
4. **Load Balancer**: Add ALB for high availability
5. **CDN**: Add CloudFront for static assets

---

## Summary - Quick Commands Reference

```bash
# Build images locally
docker build -t yourusername/ecomm-backend:latest .
docker build -t yourusername/ecomm-frontend:latest ./client

# Push to Docker Hub
docker push yourusername/ecomm-backend:latest
docker push yourusername/ecomm-frontend:latest

# Deploy on EC2
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Update application
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop
docker-compose -f docker-compose.prod.yml down
```

---

**Your application is now containerized and deployed! 🐳🚀**
