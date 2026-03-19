require('dotenv').config();
const mongoose = require('mongoose');
const AppSettings = require('../models/AppSettings');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/construction-ecommerce').then(async () => {
  const s = await AppSettings.findOne();
  if (!s) {
    console.log('NO SETTINGS DOCUMENT — model defaults apply:');
    console.log('  gstMode: no-gst');
    console.log('  platformFeeRate: 2%');
    console.log('  priceDisplayMode: admin');
    console.log('  deliveryConfig.type: threshold (free above ₹1000)');
    console.log('  minimumOrderValue: ₹100');
  } else {
    console.log('Current AppSettings:');
    console.log('  gstMode:', s.gstMode);
    console.log('  platformFeeRate:', (s.platformFeeRate * 100).toFixed(2) + '%');
    console.log('  priceDisplayMode:', s.priceDisplayMode);
    console.log('  deliveryConfig.type:', s.deliveryConfig?.type);
    console.log('  deliveryConfig.fixedCharge:', s.deliveryConfig?.fixedCharge);
    console.log('  deliveryConfig.freeDeliveryThreshold:', s.deliveryConfig?.freeDeliveryThreshold);
    console.log('  minimumOrderValue:', s.minimumOrderValue);
    console.log('  splitGSTEnabled:', s.splitGSTEnabled);
  }
  mongoose.disconnect();
});
