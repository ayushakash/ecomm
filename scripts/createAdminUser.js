const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

/**
 * Script to create an admin user
 * Usage: node scripts/createAdminUser.js
 */

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecomm';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Admin user details - CHANGE THESE VALUES
    const adminData = {
      name: 'Admin User',
      email: 'ayushakash9@gmail.com',
      phone: '8553545862', // Change this to your phone number
      password: 'Ayushmishra@9', // Change this to a secure password
      role: 'admin',
      isPhoneVerified: true,
      isActive: true
    };

    // Check if admin already exists
    const existingAdmin = await User.findOne({
      $or: [
        { email: adminData.email },
        { phone: adminData.phone }
      ]
    });

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists with this email or phone:');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Phone: ${existingAdmin.phone}`);
      console.log(`   Role: ${existingAdmin.role}`);

      // Ask if you want to update the existing user to admin role
      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin';
        existingAdmin.isActive = true;
        await existingAdmin.save();
        console.log('✅ Updated existing user to admin role');
      }

      await mongoose.disconnect();
      return;
    }

    // Create new admin user
    const admin = new User(adminData);
    await admin.save(); // Password will be automatically hashed by the pre-save hook

    console.log('\n🎉 Admin user created successfully!');
    console.log('================================');
    console.log(`Name: ${admin.name}`);
    console.log(`Email: ${admin.email}`);
    console.log(`Phone: ${admin.phone}`);
    console.log(`Role: ${admin.role}`);
    console.log(`Password: ${adminData.password} (SAVE THIS - it's now hashed in DB)`);
    console.log('================================\n');

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  }
};

// Run the script
createAdminUser();
