const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  projectName: { type: String, required: true, trim: true, index: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  description: { type: String, trim: true },
  startDate: { type: Date },
  endDate: { type: Date },
  budget: { type: Number, default: 0 },
  assignedEmployees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  requiredEquipment: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Equipment' }],
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  status: { type: String, enum: ['Planning', 'Scheduled', 'In Progress', 'Editing', 'Review', 'Completed', 'Cancelled', 'Archived'], default: 'Planning', index: true },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  notes: { type: String, trim: true },
  attachments: [{ type: String }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

projectSchema.index({ status: 1 });
projectSchema.index({ projectName: 1 });

module.exports = mongoose.model('Project', projectSchema);
