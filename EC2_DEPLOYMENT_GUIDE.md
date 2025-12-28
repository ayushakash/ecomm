# EC2 Deployment Guide - UAT Environment

This guide will help you deploy your e-commerce application to AWS EC2 with a GoDaddy subdomain.

## Architecture Overview
- **Backend**: Node.js/Express running on port 5000
- **Frontend**: React app served through Nginx
- **Database**: MongoDB (Atlas or local)
- **Domain**: GoDaddy subdomain (e.g., uat.yourdomain.com)

---

## Prerequisites

1. AWS EC2 instance (Ubuntu 20.04 or 22.04 recommended)
2. GoDaddy domain
3. SSH key pair for EC2 access
4. Git repository with your code

---

## Step 1: EC2 Instance Setup

### 1.1 Launch EC2 Instance
1. Go to AWS Console > EC2 > Launch Instance
2. Choose **Ubuntu Server 22.04 LTS**
3. Instance type: **t2.small** or **t2.medium** (for UAT)
4. Configure Security Group:
   - SSH (22) - Your IP only
   - HTTP (80) - 0.0.0.0/0
   - HTTPS (443) - 0.0.0.0/0
   - Custom TCP (5000) - 0.0.0.0/0 (backend API)
5. Create or select existing key pair
6. Launch instance

### 1.2 Note Your EC2 Details
- **Public IP**: (e.g., 54.123.45.67)
- **Elastic IP** (recommended): Allocate and associate for permanent IP

---

## Step 2: Connect to EC2 Server

```bash
# SSH into your server
ssh -i /path/to/your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP

# Update system
sudo apt update && sudo apt upgrade -y
```

---

## Step 3: Install Required Software

### 3.1 Install Node.js (v18 LTS)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Verify installation
npm --version
```

### 3.2 Install MongoDB (Optional - if not using Atlas)
```bash
# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
sudo systemctl status mongod
```

### 3.3 Install Nginx
```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 3.4 Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

### 3.5 Install Git
```bash
sudo apt install -y git
```

---

## Step 4: Clone and Setup Your Application

### 4.1 Create Application Directory
```bash
cd /home/ubuntu
mkdir -p apps
cd apps
```

### 4.2 Clone Repository
```bash
# Clone your repository
git clone YOUR_REPO_URL ecomm
cd ecomm

# Or upload code via SCP
# scp -i your-key.pem -r /local/path/to/ecomm ubuntu@YOUR_EC2_IP:/home/ubuntu/apps/
```

### 4.3 Setup Backend
```bash
# Install backend dependencies
npm install

# Create .env file
nano .env
```

**Add these environment variables:**
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ecomm
# or use MongoDB Atlas
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ecomm

JWT_SECRET=your-super-secret-jwt-key-change-this
SESSION_SECRET=your-session-secret-change-this

# Your other environment variables
MSG91_AUTH_KEY=your-msg91-key
# ... add all other vars from your local .env
```

### 4.4 Setup Frontend
```bash
cd client

# Install dependencies
npm install

# Create production build
npm run build

# This creates a 'build' folder with optimized production files
```

---

## Step 5: Configure PM2 for Backend

### 5.1 Create PM2 Ecosystem File
```bash
cd /home/ubuntu/apps/ecomm
nano ecosystem.config.js
```

**Add this content:**
```javascript
module.exports = {
  apps: [{
    name: 'ecomm-backend',
    script: './server.js',
    cwd: '/home/ubuntu/apps/ecomm',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/home/ubuntu/apps/ecomm/logs/backend-error.log',
    out_file: '/home/ubuntu/apps/ecomm/logs/backend-out.log',
    log_file: '/home/ubuntu/apps/ecomm/logs/backend-combined.log',
    time: true
  }]
}
```

### 5.2 Create logs directory
```bash
mkdir -p logs
```

### 5.3 Start Backend with PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
# Follow the command output to enable PM2 on system startup
```

### 5.4 Check Status
```bash
pm2 status
pm2 logs ecomm-backend
```

---

## Step 6: Configure Nginx

### 6.1 Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/ecomm
```

**Add this configuration:**
```nginx
server {
    listen 80;
    server_name uat.yourdomain.com;  # Replace with your subdomain

    # Frontend (React build)
    root /home/ubuntu/apps/ecomm/client/build;
    index index.html;

    # Serve static files
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Additional proxy locations if needed
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
}
```

### 6.2 Enable Site
```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/ecomm /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## Step 7: Configure GoDaddy DNS

1. **Login to GoDaddy**
2. Go to **DNS Management** for your domain
3. **Add A Record**:
   - Type: `A`
   - Name: `uat` (for uat.yourdomain.com)
   - Value: `YOUR_EC2_PUBLIC_IP`
   - TTL: `600` (10 minutes)
4. **Save** and wait for DNS propagation (5-30 minutes)

### 7.1 Test DNS
```bash
# From your local machine
nslookup uat.yourdomain.com
ping uat.yourdomain.com
```

---

## Step 8: Setup SSL Certificate (HTTPS)

### 8.1 Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 8.2 Obtain SSL Certificate
```bash
sudo certbot --nginx -d uat.yourdomain.com
```

Follow the prompts:
- Enter email address
- Agree to terms
- Choose to redirect HTTP to HTTPS (recommended)

### 8.3 Test Auto-Renewal
```bash
sudo certbot renew --dry-run
```

---

## Step 9: Verify Deployment

### 9.1 Check Services
```bash
# Check PM2
pm2 status

# Check Nginx
sudo systemctl status nginx

# Check MongoDB (if local)
sudo systemctl status mongod
```

### 9.2 Test Application
```bash
# Test backend API
curl http://localhost:5000/api/health
curl https://uat.yourdomain.com/api/health

# Test frontend
curl https://uat.yourdomain.com
```

### 9.3 Open in Browser
Visit: `https://uat.yourdomain.com`

---

## Step 10: Setup Database (MongoDB)

### If using MongoDB Atlas (Recommended):
1. Create cluster on MongoDB Atlas
2. Whitelist EC2 IP address
3. Update .env with connection string

### If using local MongoDB:
```bash
# Import your data
mongorestore --db ecomm /path/to/backup

# Or run seed script
cd /home/ubuntu/apps/ecomm
node seed.js
```

---

## Useful Commands

### PM2 Management
```bash
pm2 list                    # List all processes
pm2 logs ecomm-backend      # View logs
pm2 restart ecomm-backend   # Restart backend
pm2 stop ecomm-backend      # Stop backend
pm2 delete ecomm-backend    # Delete process
pm2 monit                   # Monitor resources
```

### Nginx Commands
```bash
sudo nginx -t                    # Test configuration
sudo systemctl reload nginx      # Reload configuration
sudo systemctl restart nginx     # Restart Nginx
sudo tail -f /var/log/nginx/error.log  # View errors
```

### Deploy Updates
```bash
cd /home/ubuntu/apps/ecomm

# Pull latest code
git pull origin main

# Update backend
npm install
pm2 restart ecomm-backend

# Update frontend
cd client
npm install
npm run build
cd ..

# Reload nginx
sudo systemctl reload nginx
```

---

## About Claude Code on Server

**Can you install Claude Code on EC2?**

Technically yes, but **NOT RECOMMENDED** for production/UAT servers:

- Claude Code is a **development tool**, not for production use
- It requires interactive terminal access
- Security risks on production servers
- Resource intensive

**Better alternatives for server management:**
- Use Claude Code **locally** to generate deployment scripts
- SSH into server for manual operations
- Use CI/CD pipelines (GitHub Actions, Jenkins, etc.)
- Use monitoring tools (New Relic, DataDog, etc.)

---

## Security Checklist

- [ ] EC2 Security Group limits SSH to your IP only
- [ ] Strong passwords for MongoDB
- [ ] Environment variables secured in .env (not in git)
- [ ] SSL certificate installed and auto-renewing
- [ ] PM2 configured to restart on crashes
- [ ] Regular backups configured
- [ ] Firewall (UFW) configured
- [ ] Server updates scheduled

---

## Monitoring & Logs

### View Application Logs
```bash
# PM2 logs
pm2 logs ecomm-backend --lines 100

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# MongoDB logs (if local)
sudo tail -f /var/log/mongodb/mongod.log
```

### Setup Monitoring
```bash
# Install monitoring tools
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## Troubleshooting

### Backend not accessible
```bash
# Check if backend is running
pm2 status
pm2 logs ecomm-backend

# Check if port 5000 is listening
sudo netstat -tulpn | grep 5000
```

### Frontend shows blank page
```bash
# Check if build exists
ls -la /home/ubuntu/apps/ecomm/client/build

# Rebuild if needed
cd /home/ubuntu/apps/ecomm/client
npm run build

# Check Nginx configuration
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### DNS not resolving
```bash
# Check DNS from server
nslookup uat.yourdomain.com

# Check DNS from local
nslookup uat.yourdomain.com

# Wait 30 minutes for DNS propagation
```

### SSL certificate issues
```bash
# Check certificate status
sudo certbot certificates

# Renew manually
sudo certbot renew

# Check Nginx SSL config
sudo nano /etc/nginx/sites-available/ecomm
```

---

## Next Steps

1. **Setup CI/CD**: Automate deployments with GitHub Actions
2. **Setup Monitoring**: Use PM2 Plus, New Relic, or DataDog
3. **Setup Backups**: Automate MongoDB backups to S3
4. **Load Balancer**: Add multiple EC2 instances behind ALB
5. **CDN**: Use CloudFront for static assets

---

## Cost Estimation (UAT)

- **EC2 t2.small**: ~$17/month
- **Elastic IP**: Free (when associated)
- **MongoDB Atlas (Shared)**: Free tier available
- **SSL Certificate**: Free (Let's Encrypt)
- **Data Transfer**: Varies based on usage

**Total**: ~$17-25/month for basic UAT environment
