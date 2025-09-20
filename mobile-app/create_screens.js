const fs = require('fs');
const path = require('path');

const screens = [
  // Customer screens
  { dir: 'customer', name: 'HomeScreen', title: 'Customer Home' },
  { dir: 'customer', name: 'ProductListScreen', title: 'Product List' },
  { dir: 'customer', name: 'ProductDetailScreen', title: 'Product Detail' },
  { dir: 'customer', name: 'CartScreen', title: 'Cart' },
  { dir: 'customer', name: 'CheckoutScreen', title: 'Checkout' },
  { dir: 'customer', name: 'OrdersScreen', title: 'Orders' },
  { dir: 'customer', name: 'OrderDetailScreen', title: 'Order Detail' },
  { dir: 'customer', name: 'ProfileScreen', title: 'Profile' },
  
  // Merchant screens
  { dir: 'merchant', name: 'DashboardScreen', title: 'Merchant Dashboard' },
  { dir: 'merchant', name: 'ProductsScreen', title: 'Merchant Products' },
  { dir: 'merchant', name: 'OrdersScreen', title: 'Merchant Orders' },
  { dir: 'merchant', name: 'ProfileScreen', title: 'Merchant Profile' },
  { dir: 'merchant', name: 'AnalyticsScreen', title: 'Merchant Analytics' },
  
  // Admin screens
  { dir: 'admin', name: 'DashboardScreen', title: 'Admin Dashboard' },
  { dir: 'admin', name: 'UsersScreen', title: 'Admin Users' },
  { dir: 'admin', name: 'MerchantsScreen', title: 'Admin Merchants' },
  { dir: 'admin', name: 'OrdersScreen', title: 'Admin Orders' },
  { dir: 'admin', name: 'ProductsScreen', title: 'Admin Products' },
  { dir: 'admin', name: 'AnalyticsScreen', title: 'Admin Analytics' },
  { dir: 'admin', name: 'SettingsScreen', title: 'Admin Settings' },
];

screens.forEach(({ dir, name, title }) => {
  const content = `import { createPlaceholderScreen } from '../../utils/createPlaceholderScreen';

export default createPlaceholderScreen('${title}');`;

  const filePath = path.join(__dirname, 'src', 'screens', dir, `${name}.tsx`);
  const dirPath = path.dirname(filePath);
  
  // Ensure directory exists
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`Created ${filePath}`);
});

console.log('All screen files created successfully!');