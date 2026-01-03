# MinIO Integration Guide

## 🎉 MinIO Storage Successfully Configured!

Your MinIO object storage is now integrated with your e-commerce platform for handling product images.

### ✅ What's Been Configured

1. **Backend Configuration**
   - MinIO client setup in `config/minio.js`
   - Upload routes in `routes/upload.js`
   - Environment variables in `.env`
   - Route registered in `server.js`

2. **Frontend Integration**
   - Admin Products page updated with file upload UI
   - Multiple image upload support (up to 10 images)
   - Image preview and management
   - Real-time upload progress

3. **Storage Details**
   - **Endpoint**: https://storage.chardeevari.in
   - **Web Console**: https://storage.chardeevari.in/console/
   - **Bucket**: `product-images`

---

## 📋 Features

### Admin Product Management
- ✅ Upload multiple product images (up to 10 per product)
- ✅ Preview images before uploading
- ✅ View existing product images
- ✅ Remove individual images
- ✅ Automatic upload to MinIO server
- ✅ Image URLs saved to MongoDB
- ✅ 5MB file size limit per image

### Available Buckets
- `product-images` - Product photos
- `user-avatars` - Profile pictures
- `merchant-images` - Shop images
- `documents` - PDFs, receipts

---

## 🚀 How to Use

### Adding a Product with Images

1. Go to **Admin Dashboard** → **Products**
2. Click **"+ Add Product"**
3. Fill in product details
4. Click the **image upload area** or drag & drop images
5. Preview selected images
6. Click **"Save Product"**
7. Images are automatically uploaded to MinIO and URLs saved to database

### Editing Product Images

1. Click **"Edit"** on any product
2. **Current images** are shown at the top
3. Click **×** on any image to remove it
4. Upload new images by clicking the upload area
5. Click **"Save Product"**
6. New images are added while keeping existing ones (unless removed)

---

## 🔧 API Endpoints

### Upload Product Images
```
POST /api/upload/product-images
Authorization: Bearer <token>
Content-Type: multipart/form-data

Body: FormData with 'images' field (multiple files)

Response:
{
  "message": "3 image(s) uploaded successfully",
  "urls": [
    "https://storage.chardeevari.in/product-images/1234567890-abc.jpg",
    "https://storage.chardeevari.in/product-images/1234567891-def.jpg",
    "https://storage.chardeevari.in/product-images/1234567892-ghi.jpg"
  ]
}
```

### Upload Single Image
```
POST /api/upload/single-product-image
Authorization: Bearer <token>
Content-Type: multipart/form-data

Body: FormData with 'image' field (single file)
```

### Delete Image
```
DELETE /api/upload/delete
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "url": "https://storage.chardeevari.in/product-images/1234567890-abc.jpg"
}
```

---

## 🗂️ File Structure

```
backend/
├── config/
│   └── minio.js                 # MinIO client configuration
├── routes/
│   └── upload.js                # Upload API routes
├── server.js                    # Route registration
└── .env                         # MinIO credentials

frontend/
└── src/
    └── pages/
        └── admin/
            └── Products.js      # Updated with file upload UI
```

---

## 🔐 Environment Variables

Already configured in `.env`:

```env
MINIO_ENDPOINT=storage.chardeevari.in
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=ecomm_minio_admin
MINIO_SECRET_KEY=MinioSecure5332173e9bbcdd
MINIO_PUBLIC_URL=https://storage.chardeevari.in
```

---

## 📝 Code Examples

### Backend: Upload Function
```javascript
const { uploadFile, BUCKETS } = require('../config/minio');

// Upload single file
const url = await uploadFile(
  fileBuffer,
  originalFilename,
  BUCKETS.PRODUCT_IMAGES,
  'image/jpeg'
);
```

### Frontend: Upload Images
```javascript
const uploadImages = async (files) => {
  const formData = new FormData();
  files.forEach(file => formData.append('images', file));

  const response = await axios.post('/api/upload/product-images', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'Authorization': `Bearer ${token}`
    }
  });

  return response.data.urls; // Array of image URLs
};
```

---

## 🎯 Testing

1. **Start Backend**: `npm start` (in root)
2. **Start Frontend**: `npm start` (in client folder)
3. Navigate to http://localhost:3000/admin/products
4. Add a new product with images
5. Check MinIO console at https://storage.chardeevari.in/console/ to see uploaded images

---

## 🔍 Troubleshooting

### Images not uploading?
- Check backend logs for MinIO connection errors
- Verify `.env` has correct MinIO credentials
- Ensure `minio` npm package is installed: `npm list minio`

### Upload fails with 401 Unauthorized?
- Make sure you're logged in as admin
- Check JWT token in localStorage
- Verify `requireAdmin` middleware is working

### Images not displaying?
- Check MinIO bucket policy is public for reads
- Verify CORS is enabled on MinIO server
- Check browser console for CORS errors

---

## ✨ Next Steps

You can now:
- ✅ Add products with multiple images
- ✅ Edit and manage product images
- ✅ Images are stored securely on MinIO
- ✅ Image URLs are saved in MongoDB

**Your image upload system is production-ready!** 🚀
