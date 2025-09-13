/**
 * Script to add phone numbers to existing merchants
 * Run with: node scripts/addMerchantPhoneNumbers.js
 */

const mongoose = require('mongoose');
const Merchant = require('../models/Merchant');
require('dotenv').config();

// Test phone numbers for merchants
const testPhoneNumbers = [
  '+919876543210',
  '+919876543211', 
  '+919876543212',
  '+919876543213',
  '+919876543214',
  '+919876543215',
  '+919876543216',
  '+919876543217',
  '+919876543218',
  '+919876543219'
];

async function addPhoneNumbers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/construction-ecommerce');
    console.log('Connected to MongoDB');

    // Get all merchants
    const merchants = await Merchant.find({});
    console.log(`Found ${merchants.length} merchants`);

    if (merchants.length === 0) {
      console.log('No merchants found. Please run addTestMerchantLocations.js first.');
      return;
    }

    // Update each merchant with phone number
    for (let i = 0; i < merchants.length; i++) {
      const merchant = merchants[i];
      const phoneNumber = testPhoneNumbers[i % testPhoneNumbers.length];

      const updateData = {
        contact: {
          ...merchant.contact,
          phone: phoneNumber,
          email: merchant.contact?.email || `${merchant.name?.toLowerCase().replace(/\s+/g, '')}@merchant.com`
        }
      };

      await Merchant.findByIdAndUpdate(merchant._id, updateData);
      
      console.log(`✅ Updated merchant: ${merchant.name}`);
      console.log(`   Phone: ${phoneNumber}`);
      console.log(`   Email: ${updateData.contact.email}`);
    }

    console.log('\n🎉 All merchants updated with phone numbers!');
    console.log('\nYou can now test the smart notification system:');
    console.log('1. Place an order with GPS location');
    console.log('2. Check server logs for smart merchant selection');
    console.log('3. Check n8n workflow for SMS/WhatsApp notifications');

  } catch (error) {
    console.error('❌ Error updating merchants:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
addPhoneNumbers();