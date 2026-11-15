const mongoose = require('mongoose');

/** Trades a worker or contractor team can cover. Labels are shown in the admin panel and app. */
const TRADES = [
  { value: 'mason', label: 'Mason (राजमिस्त्री)' },
  { value: 'labour', label: 'Labour (मज़दूर)' },
  { value: 'painter', label: 'Painter (पेंटर)' },
  { value: 'plumber', label: 'Plumber (प्लंबर)' },
  { value: 'electrician', label: 'Electrician (बिजली मिस्त्री)' },
  { value: 'tile_fitter', label: 'Tile fitter (टाइल मिस्त्री)' },
  { value: 'carpenter', label: 'Carpenter (बढ़ई)' },
  { value: 'pop_ceiling', label: 'POP / False ceiling' },
  { value: 'welder', label: 'Welder / Grill (वेल्डर)' },
  { value: 'waterproofing', label: 'Waterproofing' },
];
const TRADE_VALUES = TRADES.map((t) => t.value);

const PHONE = /^[6-9]\d{9}$/;
const nonEmpty = (arr) => Array.isArray(arr) && arr.length > 0;

const teamMemberSchema = new mongoose.Schema({
  trade: { type: String, enum: TRADE_VALUES, required: true },
  count: { type: Number, required: true, min: 1, max: 500 },
}, { _id: false });

/**
 * A mason, painter, plumber… (individual) or a contractor with a team, registered by admin.
 * Customers will later see verified, active professionals in the mobile app.
 */
const professionalSchema = new mongoose.Schema({
  kind: { type: String, enum: ['individual', 'contractor'], required: true, default: 'individual' },
  name: { type: String, required: [true, 'Name is required'], trim: true, minlength: 2, maxlength: 80 },
  phone: {
    type: String, required: [true, 'Phone is required'], trim: true, unique: true,
    match: [PHONE, 'Phone must be a valid 10-digit mobile number'],
  },
  whatsapp: { type: String, trim: true, match: [PHONE, 'WhatsApp must be a valid 10-digit mobile number'] },
  trades: {
    type: [{ type: String, enum: TRADE_VALUES }],
    validate: [nonEmpty, 'Select at least one trade'],
  },
  areas: {
    type: [{ type: String, trim: true, maxlength: 60 }],
    validate: [nonEmpty, 'Add at least one area'],
  },
  city: { type: String, trim: true, default: 'Ranchi' },
  experienceYears: { type: Number, required: [true, 'Experience is required'], min: 0, max: 60 },
  team: {
    type: [teamMemberSchema],
    default: [],
    validate: {
      validator(team) { return this.kind === 'contractor' || team.length === 0; },
      message: 'Only contractors can have a team',
    },
  },
  rateNote: { type: String, trim: true, maxlength: 60 },
  photoUrl: { type: String, trim: true },
  sitePhotos: {
    type: [{ type: String, trim: true }],
    validate: [(a) => a.length <= 6, 'At most 6 site photos'],
  },
  notes: { type: String, trim: true, maxlength: 500 },
  verified: { type: Boolean, default: false },
  consentGiven: {
    type: Boolean,
    required: true,
    validate: [(v) => v === true, 'Consent to list the professional is required'],
  },
  isActive: { type: Boolean, default: true },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

/** Total people a contractor can put on site (team members; the contractor himself not counted). */
professionalSchema.virtual('teamTotal').get(function () {
  return (this.team || []).reduce((sum, m) => sum + (m.count || 0), 0);
});

professionalSchema.index({ trades: 1, isActive: 1 });
professionalSchema.index({ areas: 1 });

const Professional = mongoose.model('Professional', professionalSchema);
module.exports = Professional;
module.exports.TRADES = TRADES;
