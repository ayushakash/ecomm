// seedOrders.js
import axios from "axios";

const API = "http://localhost:5000"; // 👈 change if different

// Demo customer login credentials (must exist in your DB)
const CUSTOMER_EMAIL = "customer@example6.com";
const CUSTOMER_PASSWORD = "password123";

async function loginCustomer() {
  try {
    const res = await axios.post(`${API}/auth/login`, {
      email: CUSTOMER_EMAIL,
      password: CUSTOMER_PASSWORD,
    });
    console.log("✅ Logged in as customer");
    return res.data.token; // adjust if your API returns differently
  } catch (err) {
    console.error("❌ Login failed:", err.response?.data || err.message);
    process.exit(1);
  }
}

async function createOrder(token, productId, qty) {
  try {
    const res = await axios.post(
      `${API}/orders`,
      {
        items: [{ productId, quantity: qty }],
        customerPhone: "9876543210",
        customerAddress: "221B Baker Street",
        paymentMethod: "cod",
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    console.log("✅ Order placed:", res.data.order.orderNumber);
  } catch (err) {
    console.error("❌ Error placing order:", err.response?.data || err.message);
  }
}

async function seedOrders() {
  // Step 1: Login
  const token = await loginCustomer();

  // Step 2: Choose product IDs
  const productIds = [
    "68a8e19f3340318175c687ed", // 👈 replace with actual product IDs
    "68a8e19f3340318175c687ed",
    "68a8e19f3340318175c687ed",
  ];

  // Step 3: Place multiple orders
  for (let i = 0; i < 5; i++) {
    const productId = productIds[i % productIds.length];
    const qty = Math.floor(Math.random() * 3) + 1;
    await createOrder(token, productId, qty);
  }
}

seedOrders();
