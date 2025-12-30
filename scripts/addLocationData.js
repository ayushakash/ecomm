/**
 * Script to add GPS coordinates to existing merchants and create sample data
 * Run with: node scripts/addLocationData.js
 */

const mongoose = require('mongoose');
require('dotenv').config();
const Merchant = require('../models/Merchant');
const Product = require('../models/Product');
const MerchantProduct = require('../models/MerchantProduct');
const Address = require('../models/Address');
const User = require('../models/User');

// Sample GPS coordinates for different cities in India
const cityCoordinates = {
  // Bangalore coordinates (different areas)
  'Koramangala': { lat: 12.9352, lng: 77.6245, city: 'Bangalore', state: 'Karnataka', pincode: '560034' },
  'Indiranagar': { lat: 12.9716, lng: 77.6412, city: 'Bangalore', state: 'Karnataka', pincode: '560038' },
  'Whitefield': { lat: 12.9698, lng: 77.7499, city: 'Bangalore', state: 'Karnataka', pincode: '560066' },
  'HSR Layout': { lat: 12.9116, lng: 77.6390, city: 'Bangalore', state: 'Karnataka', pincode: '560102' },
  'BTM Layout': { lat: 12.9165, lng: 77.6101, city: 'Bangalore', state: 'Karnataka', pincode: '560076' },

  // Ranchi coordinates (different areas)
  'Lalpur': { lat: 23.3882, lng: 85.3386, city: 'Ranchi', state: 'Jharkhand', pincode: '834001' },
  'Doranda': { lat: 23.3676, lng: 85.3098, city: 'Ranchi', state: 'Jharkhand', pincode: '834002' },
  'Kanke': { lat: 23.4164, lng: 85.3202, city: 'Ranchi', state: 'Jharkhand', pincode: '834006' },

  // Delhi coordinates
  'Connaught Place': { lat: 28.6289, lng: 77.2065, city: 'Delhi', state: 'Delhi', pincode: '110001' },
  'Dwarka': { lat: 28.5921, lng: 77.0460, city: 'Delhi', state: 'Delhi', pincode: '110075' },
};

async function connectDB() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function updateMerchantsWithCoordinates() {
  console.log('\n📍 Updating merchants with GPS coordinates...');

  const merchants = await Merchant.find();
  console.log(`Found ${merchants.length} merchants`);

  let updated = 0;

  for (const merchant of merchants) {
    // Find matching area in our coordinates
    const areaData = Object.entries(cityCoordinates).find(([area, data]) =>
      merchant.area?.toLowerCase().includes(area.toLowerCase()) ||
      merchant.city?.toLowerCase() === data.city.toLowerCase()
    );

    if (areaData) {
      const [areaName, coords] = areaData;
      merchant.location = {
        type: 'Point',
        coordinates: [coords.lng, coords.lat] // MongoDB GeoJSON format [lng, lat]
      };

      // Also update city/state if missing
      if (!merchant.city) merchant.city = coords.city;
      if (!merchant.state) merchant.state = coords.state;
      if (!merchant.pincode) merchant.pincode = coords.pincode;

      await merchant.save();
      console.log(`✓ Updated ${merchant.businessName} - ${coords.city}, ${areaName} [${coords.lat}, ${coords.lng}]`);
      updated++;
    } else {
      // Assign random Bangalore location as fallback
      const randomArea = Object.entries(cityCoordinates)[0];
      const [areaName, coords] = randomArea;

      merchant.location = {
        type: 'Point',
        coordinates: [coords.lng, coords.lat]
      };
      merchant.city = coords.city;
      merchant.state = coords.state;
      merchant.area = areaName;
      merchant.pincode = coords.pincode;

      await merchant.save();
      console.log(`✓ Updated ${merchant.businessName} - ${coords.city}, ${areaName} (default) [${coords.lat}, ${coords.lng}]`);
      updated++;
    }
  }

  console.log(`\n✅ Updated ${updated} merchants with coordinates`);
}

async function createSampleMerchantsIfNeeded() {
  console.log('\n🏪 Creating sample merchants...');

  const existingCount = await Merchant.countDocuments();

  if (existingCount >= 5) {
    console.log(`Already have ${existingCount} merchants, skipping creation`);
    return;
  }

  const sampleMerchants = [
    {
      name: 'Rajesh Kumar',
      businessName: 'Koramangala Building Supplies',
      contactPersonName: 'Rajesh Kumar',
      phone: '9876543210',
      email: 'rajesh@kbs.com',
      password: 'password123',
      area: 'Koramangala',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560034',
      address: '123 Main Road, Koramangala',
      businessType: 'Building Materials',
      activeStatus: 'approved',
      location: {
        type: 'Point',
        coordinates: [77.6245, 12.9352]
      }
    },
    {
      name: 'Priya Sharma',
      businessName: 'Indiranagar Construction Mart',
      contactPersonName: 'Priya Sharma',
      phone: '9876543211',
      email: 'priya@icm.com',
      password: 'password123',
      area: 'Indiranagar',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560038',
      address: '456 100 Feet Road, Indiranagar',
      businessType: 'Building Materials',
      activeStatus: 'approved',
      location: {
        type: 'Point',
        coordinates: [77.6412, 12.9716]
      }
    },
    {
      name: 'Amit Verma',
      businessName: 'Ranchi Hardware Store',
      contactPersonName: 'Amit Verma',
      phone: '9876543212',
      email: 'amit@rhs.com',
      password: 'password123',
      area: 'Lalpur',
      city: 'Ranchi',
      state: 'Jharkhand',
      pincode: '834001',
      address: '789 Main Road, Lalpur',
      businessType: 'Building Materials',
      activeStatus: 'approved',
      location: {
        type: 'Point',
        coordinates: [85.3386, 23.3882]
      }
    },
    {
      name: 'Sunita Patel',
      businessName: 'Delhi Building Depot',
      contactPersonName: 'Sunita Patel',
      phone: '9876543213',
      email: 'sunita@dbd.com',
      password: 'password123',
      area: 'Connaught Place',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
      address: 'CP Market, Connaught Place',
      businessType: 'Building Materials',
      activeStatus: 'approved',
      location: {
        type: 'Point',
        coordinates: [77.2065, 28.6289]
      }
    }
  ];

  for (const merchantData of sampleMerchants) {
    try {
      const existing = await Merchant.findOne({ phone: merchantData.phone });
      if (!existing) {
        await Merchant.create(merchantData);
        console.log(`✓ Created merchant: ${merchantData.businessName} in ${merchantData.city}`);
      }
    } catch (err) {
      console.error(`Error creating merchant ${merchantData.businessName}:`, err.message);
    }
  }
}

async function createSampleUserAddress() {
  console.log('\n👤 Creating sample user with address...');

  // Find or create test user
  let user = await User.findOne({ phone: '9999999999' });

  if (!user) {
    user = await User.create({
      name: 'Test Customer',
      phone: '9999999999',
      email: 'test@customer.com',
      password: 'password123',
      role: 'customer',
      isPhoneVerified: true
    });
    console.log('✓ Created test user');
  } else {
    console.log('✓ Test user already exists');
  }

  // Create sample addresses for different cities
  const sampleAddresses = [
    {
      user: user._id,
      title: 'Bangalore Home',
      fullName: 'Test Customer',
      phoneNumber: '9999999999',
      addressLine1: '123 Test Street',
      area: 'Koramangala',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560034',
      addressType: 'home',
      isDefault: true,
      coordinates: {
        latitude: 12.9352,
        longitude: 77.6245
      }
    },
    {
      user: user._id,
      title: 'Ranchi Home',
      fullName: 'Test Customer',
      phoneNumber: '9999999999',
      addressLine1: '456 Test Road',
      area: 'Lalpur',
      city: 'Ranchi',
      state: 'Jharkhand',
      pincode: '834001',
      addressType: 'home',
      isDefault: false,
      coordinates: {
        latitude: 23.3882,
        longitude: 85.3386
      }
    }
  ];

  for (const addressData of sampleAddresses) {
    const existing = await Address.findOne({
      user: user._id,
      title: addressData.title
    });

    if (!existing) {
      await Address.create(addressData);
      console.log(`✓ Created address: ${addressData.title} (${addressData.city})`);
    } else {
      console.log(`✓ Address already exists: ${addressData.title}`);
    }
  }

  console.log('\n📝 Test User Credentials:');
  console.log('Phone: 9999999999');
  console.log('Password: password123');
}

async function linkProductsToMerchants() {
  console.log('\n🔗 Linking products to merchants...');

  const merchants = await Merchant.find({ activeStatus: 'approved' });
  const products = await Product.find();

  console.log(`Found ${merchants.length} merchants and ${products.length} products`);

  let linked = 0;

  // Link each product to merchants in the same city
  for (const product of products) {
    // Find merchants in the product's area/city
    const matchingMerchants = merchants.filter(m => {
      // Try to match by area or city
      return m.city === product.city ||
             m.area === product.area ||
             (merchants.length < 10); // If few merchants, link to all
    });

    if (matchingMerchants.length === 0) {
      // Link to first merchant as fallback
      if (merchants.length > 0 && !product.merchantId) {
        product.merchantId = merchants[0]._id;
        await product.save();
        console.log(`✓ Linked ${product.name} to ${merchants[0].businessName} (fallback)`);
        linked++;
      }
    } else {
      // Link to first matching merchant
      if (!product.merchantId) {
        product.merchantId = matchingMerchants[0]._id;
        await product.save();
        console.log(`✓ Linked ${product.name} to ${matchingMerchants[0].businessName}`);
        linked++;
      }
    }
  }

  console.log(`✅ Linked ${linked} products to merchants`);
}

async function main() {
  console.log('🚀 Starting location data setup...\n');

  await connectDB();

  try {
    await createSampleMerchantsIfNeeded();
    await updateMerchantsWithCoordinates();
    await createSampleUserAddress();
    await linkProductsToMerchants();

    console.log('\n✅ Location data setup complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. Login with phone: 9999999999, password: password123');
    console.log('2. Go to Products page - should see location-based filtering');
    console.log('3. Try switching between "Bangalore Home" and "Ranchi Home" in header');
    console.log('4. Products should filter based on selected location');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
}

main();
