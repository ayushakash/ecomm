/**
 * Create MerchantProduct entries to link products to merchants
 * Run with: node scripts/createMerchantProducts.js
 */

const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('../models/Product');
const Merchant = require('../models/Merchant');
const MerchantProduct = require('../models/MerchantProduct');

async function connectDB() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce';
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');
}

async function createMerchantProducts() {
  console.log('🔗 Creating Merchant-Product Links...\n');

  const products = await Product.find();
  const merchants = await Merchant.find({ activeStatus: 'approved' });

  console.log(`Found ${products.length} products and ${merchants.length} merchants`);

  const ranchiMerchants = merchants.filter(m => m.city === 'Ranchi');
  const bangaloreMerchants = merchants.filter(m => m.city === 'Bangalore' || m.city === 'Bengaluru');

  console.log(`Ranchi merchants: ${ranchiMerchants.length}`);
  console.log(`Bangalore merchants: ${bangaloreMerchants.length}\n`);

  let created = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];

    // Assign first 2 products to Ranchi, next 2 to Bangalore
    let targetMerchants = [];

    if (i < 2 && ranchiMerchants.length > 0) {
      targetMerchants = ranchiMerchants;
    } else if (bangaloreMerchants.length > 0) {
      targetMerchants = bangaloreMerchants;
    } else {
      targetMerchants = merchants;
    }

    // Create MerchantProduct for each merchant in target city
    for (const merchant of targetMerchants) {
      // Check if already exists
      const existing = await MerchantProduct.findOne({
        productId: product._id,
        merchantId: merchant._id
      });

      if (!existing) {
        await MerchantProduct.create({
          productId: product._id,
          merchantId: merchant._id,
          price: product.price || 100,
          stock: 100,
          enabled: true
        });

        console.log(`✅ Linked "${product.name}" → ${merchant.businessName} (${merchant.city})`);
        created++;
      } else {
        console.log(`  Already exists: "${product.name}" → ${merchant.businessName}`);
      }
    }
  }

  console.log(`\n✅ Created ${created} merchant-product links`);

  // Verify
  const allMerchantProducts = await MerchantProduct.find()
    .populate('productId', 'name')
    .populate('merchantId', 'businessName city');

  console.log('\n📦 All Merchant Products:');
  allMerchantProducts.forEach(mp => {
    console.log(`  ${mp.productId?.name} → ${mp.merchantId?.businessName} (${mp.merchantId?.city})`);
  });
}

async function main() {
  await connectDB();
  await createMerchantProducts();
  await mongoose.connection.close();
  console.log('\n👋 Done!\n');
}

main();
