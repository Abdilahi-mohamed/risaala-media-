const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  jobTitle: { type: String, required: true, trim: true, index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  jobType: { type: String, trim: true },
  description: { type: String, trim: true },
  location: { type: String, trim: true },
  startDate: { type: Date },
  endDate: { type: Date },
  startTime: { type: String, trim: true },
  endTime: { type: String, trim: true },
  assignedEmployees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  requiredEquipment: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Equipment' }],
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  budget: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Overdue'], default: 'Pending' },
  status: { type: String, enum: ['Pending', 'Scheduled', 'In Progress', 'Editing', 'Review', 'Completed', 'Cancelled'], default: 'Pending', index: true },
  notes: { type: String, trim: true },
  // attachments can be legacy data-urls (string) or objects with metadata
  attachments: [
    {
      url: { type: String },
      filename: { type: String },
      type: { type: String },
      uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      uploadedAt: { type: Date }
    }
  ],
  // tools and process information saved with the job
  tools: [{ type: String }],
  process: { type: String },
  // manager-uploaded job videos (separate from employee attachments)
  jobVideos: [
    {
      url: { type: String },
      filename: { type: String },
      type: { type: String, default: 'video' },
      uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      uploadedAt: { type: Date }
    }
  ],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

jobSchema.index({ status: 1 });
jobSchema.index({ jobTitle: 1 });

module.exports = mongoose.model('Job', jobSchema);
