/**
 * Fix customer data issues
 * Run with: node scripts/fixCustomerData.js
 */

const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');
const Address = require('../models/Address');
const Merchant = require('../models/Merchant');
const Product = require('../models/Product');

async function connectDB() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce';
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');
}

async function fixCustomerData(phone) {
  console.log('🔧 Fixing Customer Data for:', phone);
  console.log('='.repeat(70));

  const user = await User.findOne({ phone });
  if (!user) {
    console.log('❌ User not found');
    return;
  }

  // Fix 1: Update city names to match (capitalize first letter)
  console.log('\n1️⃣ Fixing city name capitalization...');
  const addresses = await Address.find({ user: user._id });

  for (const addr of addresses) {
    const originalCity = addr.city;
    // Capitalize first letter of each word
    addr.city = addr.city
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    if (originalCity !== addr.city) {
      await addr.save();
      console.log(`   ✅ Updated "${originalCity}" → "${addr.city}"`);
    }
  }

  // Fix 2: Update office address coordinates (Bangalore)
  console.log('\n2️⃣ Fixing office address coordinates...');
  const officeAddr = addresses.find(a => a.title === 'office');

  if (officeAddr && (!officeAddr.coordinates?.latitude || officeAddr.coordinates.latitude === 0)) {
    // Bangalore Whitefield coordinates (since area is sdfsdf, use a default Bangalore location)
    officeAddr.coordinates = {
      latitude: 12.9698,
      longitude: 77.7499
    };
    officeAddr.city = 'Bangalore'; // Normalize to Bangalore
    officeAddr.area = 'Whitefield'; // Give proper area name
    await officeAddr.save();
    console.log('   ✅ Updated office address with Bangalore coordinates');
  }

  // Fix 3: Assign products to merchants
  console.log('\n3️⃣ Assigning products to merchants...');
  const merchants = await Merchant.find({ activeStatus: 'approved' });
  const products = await Product.find();

  // Distribute products among Ranchi merchants (since most products should be there)
  const ranchiMerchants = merchants.filter(m => m.city === 'Ranchi');
  const bangaloreMerchants = merchants.filter(m => m.city === 'Bangalore');

  if (ranchiMerchants.length === 0) {
    console.log('   ⚠️ No Ranchi merchants found, assigning to all merchants');
  }

  for (let i = 0; i < products.length; i++) {
    const product = products[i];

    if (!product.merchantId) {
      // Assign half to Ranchi, half to Bangalore for testing
      if (i < products.length / 2 && ranchiMerchants.length > 0) {
        product.merchantId = ranchiMerchants[i % ranchiMerchants.length]._id;
        console.log(`   ✅ Assigned "${product.name}" to ${ranchiMerchants[i % ranchiMerchants.length].businessName} (Ranchi)`);
      } else if (bangaloreMerchants.length > 0) {
        product.merchantId = bangaloreMerchants[i % bangaloreMerchants.length]._id;
        console.log(`   ✅ Assigned "${product.name}" to ${bangaloreMerchants[i % bangaloreMerchants.length].businessName} (Bangalore)`);
      } else if (merchants.length > 0) {
        product.merchantId = merchants[0]._id;
        console.log(`   ✅ Assigned "${product.name}" to ${merchants[0].businessName}`);
      }

      await product.save();
    }
  }

  // Summary
  console.log('\n✅ FIXES APPLIED:');
  console.log('='.repeat(70));

  const updatedAddresses = await Address.find({ user: user._id });
  console.log('\n📍 Updated Addresses:');
  updatedAddresses.forEach(addr => {
    console.log(`  • ${addr.title}: ${addr.city}, ${addr.area}`);
    console.log(`    Coordinates: [${addr.coordinates?.latitude}, ${addr.coordinates?.longitude}]`);
  });

  const updatedProducts = await Product.find();
  console.log('\n📦 Updated Products:');
  for (const p of updatedProducts) {
    const merchant = await Merchant.findById(p.merchantId);
    console.log(`  • ${p.name} → ${merchant ? merchant.businessName + ' (' + merchant.city + ')' : 'No merchant'}`);
  }

  console.log('\n✅ All fixes complete! Try logging in again.');
}

async function main() {
  await connectDB();

  const phone = process.argv[2] || '6201176610';
  await fixCustomerData(phone);

  await mongoose.connection.close();
  console.log('\n👋 Database connection closed\n');
}

main();
