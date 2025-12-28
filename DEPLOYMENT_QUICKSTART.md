# Deployment Quick Start Guide

This is a simplified step-by-step guide to deploy your e-commerce app to EC2 with GoDaddy subdomain.

## Prerequisites Checklist

- [ ] AWS account with EC2 instance (Ubuntu 22.04)
- [ ] GoDaddy domain
- [ ] SSH key for EC2 access
- [ ] Git repository URL (or code ready to upload)

---

## Part 1: Server Setup (One-time)

### 1. Launch EC2 Instance

1. Go to AWS Console → EC2 → Launch Instance
2. Choose: **Ubuntu Server 22.04 LTS**
3. Instance type: **t2.small** (minimum for UAT)
4. Security Group - Allow these ports:
   ```
   SSH (22) - Your IP only
   HTTP (80) - 0.0.0.0/0
   HTTPS (443) - 0.0.0.0/0
   ```
5. Create/select key pair and launch
6. **IMPORTANT**: Allocate and associate an **Elastic IP** (so IP doesn't change)
7. Note your **Elastic IP address**

### 2. Connect to Server

```bash
# From your local machine
ssh -i /path/to/your-key.pem ubuntu@YOUR_EC2_IP
```

### 3. Run Initial Setup

```bash
# Upload setup script
exit  # Exit from server

# From local machine, upload files
scp -i your-key.pem deploy-setup.sh ubuntu@YOUR_EC2_IP:/home/ubuntu/
scp -i your-key.pem deploy-app.sh ubuntu@YOUR_EC2_IP:/home/ubuntu/
scp -i your-key.pem update-app.sh ubuntu@YOUR_EC2_IP:/home/ubuntu/

# SSH back in
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# Run setup script
cd /home/ubuntu
bash deploy-setup.sh
```

This will install: Node.js, Nginx, PM2, Git, Certbot, and optionally MongoDB.

---

## Part 2: Upload Your Code

### Option A: Using Git (Recommended)

```bash
cd /home/ubuntu/apps

# Clone your repository
git clone https://github.com/yourusername/ecomm.git

# Or if private repo
git clone https://YOUR_TOKEN@github.com/yourusername/ecomm.git
```

### Option B: Upload via SCP

```bash
# From your local machine (in /home/oem/projects/ecomm)
# First, commit your current changes
git add .
git commit -m "Prepare for deployment"

# Upload to server
scp -i your-key.pem -r /home/oem/projects/ecomm ubuntu@YOUR_EC2_IP:/home/ubuntu/apps/
```

---

## Part 3: Configure Environment

```bash
# SSH into server
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

cd /home/ubuntu/apps/ecomm

# Create .env file
nano .env
```

**Add these variables** (minimum required):

```env
NODE_ENV=production
PORT=5000

# Database - Choose one:
# Local MongoDB:
MONGODB_URI=mongodb://localhost:27017/ecomm

# OR MongoDB Atlas (recommended):
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ecomm

# Security (generate random strings)
JWT_SECRET=your-super-long-random-secret-min-32-characters
SESSION_SECRET=another-super-long-random-secret

# Add all other vars from your local .env
MSG91_AUTH_KEY=your-key-here
# ... etc
```

**Save**: Press `Ctrl+X`, then `Y`, then `Enter`

---

## Part 4: Deploy Application

```bash
cd /home/ubuntu/apps/ecomm

# Make deployment scripts executable
chmod +x deploy-app.sh update-app.sh

# Run deployment
bash deploy-app.sh
```

**When prompted:**
- Enter your subdomain: `uat.yourdomain.com`
- SSL setup: Enter `n` (we'll do this after DNS is configured)

---

## Part 5: Configure DNS (GoDaddy)

1. Login to **GoDaddy**
2. Go to **My Products** → Click **DNS** next to your domain
3. Click **Add** to add a new record
4. Configure:
   ```
   Type: A
   Name: uat (or your subdomain prefix)
   Value: YOUR_EC2_ELASTIC_IP
   TTL: 600 seconds
   ```
5. Click **Save**
6. Wait **5-30 minutes** for DNS to propagate

### Test DNS:

```bash
# From your local machine
nslookup uat.yourdomain.com
ping uat.yourdomain.com

# Should show your EC2 IP
```

---

## Part 6: Setup SSL (After DNS works)

```bash
# SSH into server
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# Run certbot
sudo certbot --nginx -d uat.yourdomain.com

# Follow prompts:
# - Enter email
# - Agree to terms
# - Choose: Redirect HTTP to HTTPS (option 2)
```

---

## Part 7: Verify Deployment

### Check Services

```bash
# Check PM2 (backend)
pm2 status

# Check Nginx
sudo systemctl status nginx

# View backend logs
pm2 logs ecomm-backend
```

### Test Application

Open browser and visit:
```
https://uat.yourdomain.com
```

You should see your e-commerce frontend!

Test API:
```
https://uat.yourdomain.com/api/health
```

---

## Common Commands

### View Logs
```bash
# Backend logs
pm2 logs ecomm-backend

# Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### Restart Services
```bash
# Restart backend
pm2 restart ecomm-backend

# Restart Nginx
sudo systemctl restart nginx
```

### Deploy Updates
```bash
cd /home/ubuntu/apps/ecomm
bash update-app.sh
```

---

## Database Setup

### If using local MongoDB:

```bash
# Import your data
mongorestore --db ecomm /path/to/backup

# Or run seed script
cd /home/ubuntu/apps/ecomm
node seed.js
```

### If using MongoDB Atlas:

1. Create free cluster at mongodb.com
2. Create database user
3. Whitelist EC2 IP: `YOUR_EC2_IP/32`
4. Get connection string
5. Update `.env` with Atlas connection string

---

## Troubleshooting

### Backend not starting
```bash
pm2 logs ecomm-backend --lines 50
# Check for errors in .env or missing dependencies
```

### Frontend shows blank page
```bash
# Rebuild frontend
cd /home/ubuntu/apps/ecomm/client
npm run build
sudo systemctl reload nginx
```

### Can't access site
```bash
# Check firewall
sudo ufw status

# Check if Nginx is running
sudo systemctl status nginx

# Check DNS
nslookup uat.yourdomain.com
```

---

## About Claude Code on Server

**Question: Can I install Claude Code on EC2?**

**Answer: Not recommended!**

Claude Code is a **development tool** for your local machine, not for production servers.

**Why not?**
- Security risk on production servers
- Requires interactive terminal
- Resource intensive
- Not designed for server environments

**Better approach:**
- Use Claude Code **on your local machine** to write code
- Deploy code to server using git/scripts
- Use SSH for server management
- Use PM2 for monitoring

---

## Security Checklist

After deployment, verify:

- [ ] EC2 Security Group limits SSH to your IP
- [ ] `.env` file has strong random secrets
- [ ] SSL certificate is active (https://)
- [ ] MongoDB is password protected
- [ ] PM2 is configured to restart on failure
- [ ] Regular backups are scheduled

---

## Cost Breakdown

- **EC2 t2.small**: ~$17/month
- **Elastic IP**: Free (when attached)
- **MongoDB Atlas Free Tier**: $0
- **SSL (Let's Encrypt)**: Free
- **Domain (GoDaddy)**: Already owned

**Total UAT Cost: ~$17/month**

---

## Next Steps After Deployment

1. **Setup automatic deployments** (GitHub Actions)
2. **Configure monitoring** (PM2 Plus, UptimeRobot)
3. **Setup automated backups** (MongoDB → S3)
4. **Add staging environment**
5. **Plan production deployment**

---

## Support

If you encounter issues:

1. Check logs: `pm2 logs ecomm-backend`
2. Check Nginx: `sudo tail -f /var/log/nginx/error.log`
3. Verify DNS: `nslookup uat.yourdomain.com`
4. Check this guide's troubleshooting section

---

## Summary

Your deployment architecture:

```
User Browser
    ↓
GoDaddy DNS (uat.yourdomain.com)
    ↓
EC2 Instance (Elastic IP)
    ↓
Nginx (Port 80/443)
    ├── Frontend (React build files)
    └── API requests → Backend (PM2, Port 5000)
            ↓
        MongoDB (Local or Atlas)
```

That's it! Your app is now live on UAT! 🚀
