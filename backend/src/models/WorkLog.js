const mongoose = require('mongoose');

const workLogSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
  date: { type: Date, required: true, index: true },
  workType: { type: String, trim: true },
  description: { type: String, trim: true },
  location: { type: String, trim: true },
  startTime: { type: String, trim: true },
  endTime: { type: String, trim: true },
  duration: { type: Number, default: 0 },
  completionPercentage: { type: Number, min: 0, max: 100, default: 0 },
  status: { type: String, enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'], default: 'DRAFT', index: true },
  managerComment: { type: String, trim: true },
  attachments: [{ type: String }]
}, { timestamps: true });

workLogSchema.index({ status: 1, date: 1 });

module.exports = mongoose.model('WorkLog', workLogSchema);
