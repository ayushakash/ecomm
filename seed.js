const adminToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGE4YzcyNTZlNmYzMjJkYTVhYjlhM2YiLCJpYXQiOjE3NTU4OTYyMTMsImV4cCI6MTc1NTg5OTgxM30.-VLRVCQItTAa0U0yoY7MOPgle9qWfEzlzJBC7nhX4KM"
import axios from "axios";

const API = "http://localhost:5000/api";

async function seed() {
  try {
    // 1. Use existing Admin (already seeded in DB)
    console.log("✅ Using existing admin token");

    // 2. Register Merchant
    let res = await axios.post(`${API}/auth/register`, {
      name: "Test Merchant",
      email: "merchant@example6.com",
      password: "password123",
      area: "Test Area",
      role: "merchant"
    });
    const merchantUserId = res.data.user._id;
    const merchantUserToken = res.data.accessToken;
    console.log("✅ Merchant user created:", merchantUserId);

    // 3. Register Customer
    res = await axios.post(`${API}/auth/register`, {
      name: "Test Customer",
      email: "customer@example6.com",
      password: "password123",
      area: "Test Area",
      role: "customer"
    });
    const customerToken = res.data.accessToken;
    console.log("✅ Customer created:", res.data.user._id);

    // 4. Onboard Merchant (Admin only)
    res = await axios.post(`${API}/merchants/onboard`, {
      userId: merchantUserId,
      name: "Test Merchant",
      contact: { phone: "12345678901", email: "merchant@example6.com" },
      area: "Test Area",
      address: "123 Test St",
      businessType: "Retail",
      documents: { gstNumber: "GST123", panNumber: "PAN123" }
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const merchantId = res.data.merchant._id;
    console.log("✅ Merchant onboarded:", merchantId);

    // 5. Create a Product (assume endpoint: /api/products)
    res = await axios.post(`${API}/products`, {
      name: "Test Product",
      price: 100,
      stock: 50,
      description: "Sample product",
     category: "cement",  // must be one from your schema
    unit: "bag"          // must be one from your schema
    }, {
      headers: { Authorization: `Bearer ${merchantUserToken}` }
    });
    const productId = res.data.product._id;
    console.log("✅ Product created:", productId);

    // 6. Place Order (Customer only)
    res = await axios.post(`${API}/orders`, {
      items: [{ productId, quantity: 2 }],
    //   orderNumber: "ORD-" + Date.now(),
      customerPhone: "1234567890",
      customerAddress: "123 Test St",
      paymentMethod: "cod"
    }, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    const orderId = res.data.order._id;
    console.log("✅ Order placed:", orderId);

    // 7. Assign Order (Admin only)
    res = await axios.put(`${API}/orders/${orderId}/assign`, {
      merchantId
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log("✅ Order assigned:", res.data.order._id);

    // 8. Update Order Status (Merchant/Admin)
    res = await axios.put(`${API}/orders/${orderId}/status`, {
      status: "delivered",
      note: "Delivered successfully"
    }, {
      headers: { Authorization: `Bearer ${merchantUserToken}` }
    });
    console.log("✅ Order status updated:", res.data.order.status);

  } catch (err) {
    if (err.response) {
      console.error("❌ Error:", err.response.data);
    } else {
      console.error("❌ Error:", err.message);
    }
  }
}

seed();
