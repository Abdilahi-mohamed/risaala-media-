const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  companyName: { type: String, trim: true },
  phone: { type: String, trim: true, index: true },
  email: { type: String, trim: true, lowercase: true, index: true },
  address: { type: String, trim: true },
  clientType: { type: String, trim: true },
  profileImage: { type: String, trim: true },
  notes: { type: String, trim: true },
}, { timestamps: true });

clientSchema.index({ phone: 1 });
clientSchema.index({ email: 1 });

module.exports = mongoose.model('Client', clientSchema);
