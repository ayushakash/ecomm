const mongoose = require('mongoose');

const calculatorLeadSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true, index: true },
  city: { type: String, trim: true },
  area: { type: Number },           // sq ft
  floors: { type: Number },
  totalCost: { type: Number },      // estimated cost
  priceMode: { type: String },      // 'market' | 'custom'
  materials: { type: mongoose.Schema.Types.Mixed }, // breakdown object
}, {
  timestamps: true
});

calculatorLeadSchema.index({ createdAt: -1 });

module.exports = mongoose.model('CalculatorLead', calculatorLeadSchema);
