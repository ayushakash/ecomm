/**
 * Script to add location data to existing merchants for testing
 * Run with: node scripts/addTestMerchantLocations.js
 */

const mongoose = require('mongoose');
const Merchant = require('../models/Merchant');
require('dotenv').config();

// Sample locations in India (longitude, latitude)
const testLocations = [
  {
    name: 'Delhi NCR Area',
    coordinates: [77.1025, 28.7041],
    address: 'Connaught Place, New Delhi',
    area: 'Delhi',
    pincode: '110001',
    city: 'Delhi',
    state: 'Delhi'
  },
  {
    name: 'Mumbai Central',
    coordinates: [72.8777, 19.0760],
    address: 'Fort, Mumbai',
    area: 'Fort',
    pincode: '400001',
    city: 'Mumbai',
    state: 'Maharashtra'
  },
  {
    name: 'Bangalore Tech Park',
    coordinates: [77.5946, 12.9716],
    address: 'Electronic City, Bangalore',
    area: 'Electronic City',
    pincode: '560100',
    city: 'Bangalore',
    state: 'Karnataka'
  },
  {
    name: 'Pune IT Hub',
    coordinates: [73.8567, 18.5204],
    address: 'Hinjewadi, Pune',
    area: 'Hinjewadi',
    pincode: '411057',
    city: 'Pune',
    state: 'Maharashtra'
  },
  {
    name: 'Chennai Marina',
    coordinates: [80.2707, 13.0827],
    address: 'Marina Beach, Chennai',
    area: 'Marina',
    pincode: '600001',
    city: 'Chennai',
    state: 'Tamil Nadu'
  },
  {
    name: 'Hyderabad HITEC City',
    coordinates: [78.4867, 17.3850],
    address: 'HITEC City, Hyderabad',
    area: 'HITEC City',
    pincode: '500081',
    city: 'Hyderabad',
    state: 'Telangana'
  }
];

async function addTestLocations() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/construction-ecommerce');
    console.log('Connected to MongoDB');

    // Get all merchants
    const merchants = await Merchant.find({});
    console.log(`Found ${merchants.length} merchants`);

    if (merchants.length === 0) {
      console.log('No merchants found. Please add merchants first.');
      return;
    }

    // Update each merchant with a random location
    for (let i = 0; i < merchants.length; i++) {
      const merchant = merchants[i];
      const locationIndex = i % testLocations.length;
      const testLocation = testLocations[locationIndex];

      // Add some randomness to coordinates (within 5km radius)
      const randomOffset = () => (Math.random() - 0.5) * 0.05; // ~5km variation
      const coordinates = [
        testLocation.coordinates[0] + randomOffset(),
        testLocation.coordinates[1] + randomOffset()
      ];

      const updateData = {
        location: {
          type: 'Point',
          coordinates: coordinates,
          address: testLocation.address,
          area: testLocation.area,
          pincode: testLocation.pincode,
          city: testLocation.city,
          state: testLocation.state
        },
        availability: {
          isActive: true,
          maxDailyOrders: Math.floor(Math.random() * 10) + 5, // 5-15 orders
          currentDayOrders: Math.floor(Math.random() * 3), // 0-3 current orders
          lastOrderAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000), // Random time in last 24h
          workingHours: {
            start: "09:00",
            end: "18:00",
            days: ["mon", "tue", "wed", "thu", "fri", "sat"]
          }
        }
      };

      await Merchant.findByIdAndUpdate(merchant._id, updateData);
      
      console.log(`✅ Updated merchant: ${merchant.name}`);
      console.log(`   Location: ${testLocation.name} (${coordinates[1].toFixed(4)}, ${coordinates[0].toFixed(4)})`);
      console.log(`   Availability: ${updateData.availability.currentDayOrders}/${updateData.availability.maxDailyOrders} orders`);
    }

    console.log('\\n🎉 All merchants updated with test locations and availability data!');
    console.log('\\nYou can now test the smart notification system by:');
    console.log('1. Creating an order with GPS location');
    console.log('2. The system will find nearby merchants');
    console.log('3. Send targeted SMS notifications');

  } catch (error) {
    console.error('❌ Error updating merchants:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
addTestLocations();