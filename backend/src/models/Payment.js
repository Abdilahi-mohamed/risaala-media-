const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  amount: { type: Number, required: true, default: 0 },
  paymentMethod: { type: String, trim: true },
  paymentDate: { type: Date, default: Date.now },
  reference: { type: String, trim: true },
  notes: { type: String, trim: true }
}, { timestamps: true });

paymentSchema.index({ paymentDate: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
