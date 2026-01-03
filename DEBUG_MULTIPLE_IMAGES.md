# 🐛 Debugging Multiple Image Upload Issue

## Issue
Only the last image is being saved when uploading multiple product images.

## What I've Added

### Frontend Debugging (`client/src/pages/admin/Products.js`)

Added console logs to track the image upload flow:

1. **Upload Response**:
   ```javascript
   console.log('📤 Upload response:', response.data);
   console.log('🔗 Image URLs received:', urls);
   console.log('🔢 Number of URLs:', urls.length);
   ```

2. **Before Submit**:
   ```javascript
   console.log('📸 Uploaded images:', imageUrls);
   console.log('📦 Submitting product data:', productData);
   console.log('🖼️ Images array:', productData.images);
   ```

### Backend Debugging (`routes/products.js`)

Added console logs to see what the backend receives:

```javascript
console.log('📥 Received images:', images);
console.log('📥 Images type:', typeof images);
console.log('📥 Images is array:', Array.isArray(images));
console.log('✅ Processed images:', processedImages);
```

## How to Test

1. **Start Backend**:
   ```bash
   npm start
   ```

2. **Start Frontend**:
   ```bash
   cd client && npm start
   ```

3. **Open Browser Console** (F12)

4. **Add a Product with Multiple Images**:
   - Go to http://localhost:3000/admin/products
   - Click "+ Add Product"
   - Fill product details
   - Select 3-4 images
   - Click "Save Product"

5. **Check Console Logs**:
   - Frontend console (browser) will show:
     - Number of files selected
     - Upload response from MinIO
     - Image URLs array
     - Product data being submitted

   - Backend console (terminal) will show:
     - Received images data
     - Data type
     - Whether it's an array
     - Processed images array

## Expected Flow

```
User selects 3 images
  ↓
Frontend: selectedFiles = [File, File, File]
  ↓
Upload to MinIO: POST /api/upload/product-images
  ↓
Backend returns: { urls: [url1, url2, url3] }
  ↓
Frontend receives: urls = [url1, url2, url3] (length: 3)
  ↓
Submit product: { ...productData, images: [url1, url2, url3] }
  ↓
Backend receives: images = [url1, url2, url3] (is array: true)
  ↓
Save to DB: product.images = [url1, url2, url3]
```

## What to Look For

### ✅ Correct Behavior
- Upload response shows all 3 URLs
- Product data shows images array with 3 items
- Backend receives array with 3 items
- Database saves all 3 URLs

### ❌ Problem Indicators

**If only 1 image is saved:**
1. Check upload response - does it have all URLs?
2. Check product data before submit - is images array complete?
3. Check backend received data - is it still an array?
4. Check database - what's actually saved?

## Possible Issues & Fixes

### Issue 1: Upload Returns Only Last URL
**Symptom**: Upload response only has 1 URL
**Cause**: Multer or MinIO upload issue
**Check**: Backend upload route logs

### Issue 2: Frontend Loses URLs
**Symptom**: Upload has all URLs but submit has only 1
**Cause**: State management issue
**Fix**: Check if imageUrls is being overwritten

### Issue 3: Backend Receives Single Value
**Symptom**: Backend receives string instead of array
**Cause**: API serialization issue
**Fix**: Check axios request format

### Issue 4: Database Saves Only Last Item
**Symptom**: Backend has array but DB has only 1
**Cause**: Mongoose schema or save issue
**Fix**: Check Product model schema

## Quick Fixes to Try

### Fix 1: Ensure Array Format
```javascript
// In handleSubmit
const productData = {
  ...formData,
  images: Array.isArray(imageUrls) ? imageUrls : [imageUrls]
};
```

### Fix 2: Clone Form Data
```javascript
// Before mutate
const productData = JSON.parse(JSON.stringify({
  ...formData,
  images: imageUrls
}));
```

### Fix 3: Log Full Request
```javascript
// In productAPI.createProduct
createProduct: (productData) => {
  console.log('API call data:', productData);
  return api.post('/api/products', productData);
}
```

## Next Steps

1. Run the test above
2. Share the console logs (both frontend and backend)
3. I'll identify exactly where the issue is occurring
4. Apply the appropriate fix

## Remove Debug Logs Later

Once fixed, remove these console.log statements:
- `client/src/pages/admin/Products.js` (lines with 📸, 📦, 🖼️, 📤, 🔗, 🔢)
- `routes/products.js` (lines with 📥, ✅)
