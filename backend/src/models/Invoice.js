const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, trim: true, unique: true, index: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  items: [{ description: String, quantity: Number, unitPrice: Number, total: Number }],
  totalAmount: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  remainingBalance: { type: Number, default: 0 },
  dueDate: { type: Date },
  status: { type: String, enum: ['Unpaid', 'Partially Paid', 'Paid', 'Overdue'], default: 'Unpaid' }
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
