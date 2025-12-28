# Docker Quick Start - Essential Commands

**Replace `yourusername` with your Docker Hub username throughout**

---

## 1️⃣ Install Docker (Local Machine)

```bash
# Ubuntu/Linux
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
# Log out and back in
```

---

## 2️⃣ Login to Docker Hub

```bash
docker login
# Enter your Docker Hub username and password
```

---

## 3️⃣ Build Images

```bash
cd /home/oem/projects/ecomm

# Build backend
docker build -t yourusername/ecomm-backend:latest .

# Build frontend
cd client
docker build -t yourusername/ecomm-frontend:latest .
```

---

## 4️⃣ Push to Docker Hub

```bash
docker push yourusername/ecomm-backend:latest
docker push yourusername/ecomm-frontend:latest
```

---

## 5️⃣ EC2 Setup (One-time)

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Log out and back in
exit
```

---

## 6️⃣ Deploy on EC2

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# Create app directory
mkdir -p ~/ecomm-app
cd ~/ecomm-app

# Create docker-compose.prod.yml
nano docker-compose.prod.yml
```

**Paste this (replace `yourusername`):**

```yaml
version: '3.8'

services:
  backend:
    image: yourusername/ecomm-backend:latest
    restart: always
    ports:
      - "5000:5000"
    env_file:
      - .env
    networks:
      - ecomm-network

  frontend:
    image: yourusername/ecomm-frontend:latest
    restart: always
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - ecomm-network

networks:
  ecomm-network:
```

**Create .env file:**

```bash
nano .env
```

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/ecomm
JWT_SECRET=generate-random-64-char-string
SESSION_SECRET=generate-random-64-char-string
MSG91_AUTH_KEY=your-key
MSG91_SENDER_ID=CNSMAT
MSG91_OTP_ENABLED=true
FRONTEND_URL=https://uat.yourdomain.com
```

**Start containers:**

```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## 7️⃣ GoDaddy DNS

1. Login → My Products → DNS
2. Add Record:
   - Type: **A**
   - Name: **uat**
   - Value: **YOUR_EC2_IP**
   - TTL: **600**
3. Save

---

## 8️⃣ Setup SSL

```bash
# On EC2
sudo apt install -y nginx certbot python3-certbot-nginx

# Configure Nginx
sudo nano /etc/nginx/sites-available/ecomm
```

```nginx
server {
    listen 80;
    server_name uat.yourdomain.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/ecomm /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d uat.yourdomain.com
```

---

## 9️⃣ Update Application

```bash
# Local: Build and push new images
docker build -t yourusername/ecomm-backend:latest .
docker push yourusername/ecomm-backend:latest

# EC2: Pull and restart
cd ~/ecomm-app
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🔧 Common Commands

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check status
docker ps

# Restart
docker-compose -f docker-compose.prod.yml restart

# Stop
docker-compose -f docker-compose.prod.yml down

# Start
docker-compose -f docker-compose.prod.yml up -d
```

---

## ✅ Checklist

- [ ] Docker installed locally
- [ ] Docker Hub account created
- [ ] Images built and pushed
- [ ] EC2 instance launched (t2.small)
- [ ] Docker installed on EC2
- [ ] docker-compose.prod.yml created
- [ ] .env file configured
- [ ] Containers running
- [ ] GoDaddy DNS configured
- [ ] SSL certificate installed
- [ ] Application accessible at https://uat.yourdomain.com

---

**Done! Your app is live! 🚀**
