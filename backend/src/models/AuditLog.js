const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  action: { type: String, required: true, trim: true },
  module: { type: String, trim: true },
  recordId: { type: String, trim: true },
  oldValues: { type: Object },
  newValues: { type: Object },
  ipAddress: { type: String, trim: true }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
