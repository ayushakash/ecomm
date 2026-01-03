# 🚀 Deployment Checklist - MinIO Integration

## ✅ Completed Configuration

### 1. Backend Setup
- [x] MinIO client installed (`minio` package)
- [x] MinIO configuration file created (`config/minio.js`)
- [x] Upload routes created (`routes/upload.js`)
- [x] Routes registered in `server.js`
- [x] Environment variables added to `.env`

### 2. Frontend Setup
- [x] Admin Products page updated
- [x] Multiple image upload UI implemented
- [x] Image preview and management added
- [x] Upload progress indicators added

### 3. Docker Configuration
- [x] MinIO env vars added to `docker-compose.yml`
- [x] `.env.example` updated with MinIO config
- [x] `.env.production.example` created
- [x] `docker-push.sh` script ready

---

## 📋 Pre-Deployment Checklist

### Environment Variables
Ensure these are set in your production environment:

```bash
MINIO_ENDPOINT=storage.chardeevari.in
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=ecomm_minio_admin
MINIO_SECRET_KEY=MinioSecure5332173e9bbcdd
MINIO_PUBLIC_URL=https://storage.chardeevari.in
```

### Files to Update Before Deployment

1. **Create `.env` file on server**
   ```bash
   cp .env.example .env
   # Edit .env with actual production values
   ```

2. **Verify MinIO buckets exist**
   - Login to https://storage.chardeevari.in/console/
   - Check buckets: `product-images`, `user-avatars`, `merchant-images`, `documents`

3. **Set bucket policies (if not done)**
   ```bash
   # Product images should be publicly readable
   # Other buckets can be private
   ```

---

## 🐳 Deployment Steps

### Option 1: Using Docker Push Script (Recommended)

```bash
# 1. Build and push images to Docker Hub
./docker-push.sh v1.1.0

# 2. On server, pull and run
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# 3. Check logs
docker-compose -f docker-compose.prod.yml logs -f backend
```

### Option 2: Manual Docker Build

```bash
# 1. Build images locally
docker build -t ayushmishra9/ecomm-backend:latest .
docker build -t ayushmishra9/ecomm-frontend:latest ./client

# 2. Push to Docker Hub
docker push ayushmishra9/ecomm-backend:latest
docker push ayushmishra9/ecomm-frontend:latest

# 3. Deploy on server
docker-compose -f docker-compose.prod.yml up -d
```

### Option 3: Direct Deployment (Without Docker Hub)

```bash
# On production server
git pull origin main
docker-compose up -d --build
```

---

## 🧪 Post-Deployment Testing

### 1. Test Backend Health
```bash
curl https://your-domain.com/health
# Should return: {"status":"ok","message":"Backend is running"}
```

### 2. Test MinIO Connection
```bash
# Check backend logs for MinIO connection
docker logs ecomm-backend | grep -i minio
```

### 3. Test Image Upload

1. Login as admin
2. Go to Products → Add Product
3. Upload 2-3 product images
4. Click "Save Product"
5. Verify:
   - Images appear in MinIO console
   - Product shows images in admin panel
   - Image URLs are saved in database

### 4. Test Image Display

1. View product in admin panel
2. Check if images display correctly
3. Verify image URLs start with `https://storage.chardeevari.in/`

---

## 🔍 Troubleshooting

### Images not uploading?

**Check 1: MinIO credentials**
```bash
docker exec ecomm-backend printenv | grep MINIO
```

**Check 2: Network connectivity**
```bash
docker exec ecomm-backend ping storage.chardeevari.in
```

**Check 3: Backend logs**
```bash
docker logs ecomm-backend --tail 100
```

### Upload returns 401 Unauthorized?

- Verify you're logged in as admin
- Check JWT token in browser localStorage
- Check `requireAdmin` middleware

### Images uploaded but not displaying?

- Check MinIO bucket policy is public
- Verify CORS settings on MinIO
- Check browser console for errors

---

## 📊 Monitoring

### Important Metrics to Watch

1. **Storage Usage**
   - Check MinIO console for bucket sizes
   - Monitor disk space on MinIO server

2. **Upload Success Rate**
   - Check backend logs for upload errors
   - Monitor failed upload attempts

3. **Response Times**
   - Monitor image upload times
   - Check if images load quickly for users

---

## 🔄 Rollback Plan

If deployment fails:

```bash
# 1. Stop new containers
docker-compose -f docker-compose.prod.yml down

# 2. Roll back to previous version
docker-compose -f docker-compose.prod.yml up -d ayushmishra9/ecomm-backend:v1.0.0

# 3. Verify rollback
docker ps
docker logs ecomm-backend
```

---

## 📝 Environment Variables Reference

### Required Variables
```
MINIO_ENDPOINT           # MinIO server endpoint
MINIO_PORT               # MinIO port (443 for HTTPS)
MINIO_USE_SSL            # true/false
MINIO_ACCESS_KEY         # MinIO access key
MINIO_SECRET_KEY         # MinIO secret key
MINIO_PUBLIC_URL         # Public URL for image access
```

### Optional Variables (with defaults)
```
MINIO_ENDPOINT=storage.chardeevari.in     # Default
MINIO_PORT=443                            # Default
MINIO_USE_SSL=true                        # Default
MINIO_PUBLIC_URL=https://storage.chardeevari.in  # Default
```

---

## ✨ Next Deployment

When you run `./docker-push.sh` next time:

1. ✅ All MinIO configuration will be included
2. ✅ Environment variables from `.env` will be used
3. ✅ Images will be built with latest code
4. ✅ Pushed to Docker Hub automatically

**Command:**
```bash
./docker-push.sh v1.1.0  # Or any version number
```

---

## 🎯 Success Criteria

Deployment is successful when:

- [x] Backend starts without errors
- [x] MinIO connection established
- [x] Admin can upload product images
- [x] Images are stored in MinIO
- [x] Images display correctly in admin panel
- [x] Image URLs are saved in database
- [x] No CORS errors in browser console

---

## 📞 Support

If you encounter issues:

1. Check backend logs: `docker logs ecomm-backend`
2. Check MinIO console: https://storage.chardeevari.in/console/
3. Verify environment variables are set correctly
4. Test MinIO connection from backend container

**Your deployment is ready!** 🚀
