const mongoose = require('mongoose');

const equipmentSchema = new mongoose.Schema({
  equipmentCode: { type: String, required: true, trim: true, unique: true, index: true },
  name: { type: String, required: true, trim: true, index: true },
  category: { type: String, trim: true },
  brand: { type: String, trim: true },
  model: { type: String, trim: true },
  serialNumber: { type: String, trim: true, index: true },
  purchaseDate: { type: Date },
  purchasePrice: { type: Number, default: 0 },
  currentValue: { type: Number, default: 0 },
  condition: { type: String, trim: true },
  status: { type: String, enum: ['Available', 'In Use', 'Reserved', 'Maintenance', 'Damaged', 'Lost', 'Retired'], default: 'Available', index: true },
  location: { type: String, trim: true },
  maintenanceDate: { type: Date },
  warranty: { type: String, trim: true },
  image: { type: String, trim: true },
  notes: { type: String, trim: true }
}, { timestamps: true });

equipmentSchema.index({ serialNumber: 1 });

module.exports = mongoose.model('Equipment', equipmentSchema);
