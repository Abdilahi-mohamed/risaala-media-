const mongoose = require('mongoose');

const mediaUploadSchema = new mongoose.Schema({
  folderId: { type: String, required: true, index: true },
  folderName: { type: String, required: true, trim: true },
  fileName: { type: String, required: true, trim: true },
  relativePath: { type: String, default: '', trim: true },
  gridFsFileId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  contentType: { type: String, required: true },
  fileSize: { type: Number, default: 0 },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
  uploadedAt: { type: Date, default: Date.now }
}, { timestamps: true });

mediaUploadSchema.index({ folderId: 1, bookingId: 1, employeeId: 1 });

module.exports = mongoose.model('MediaUpload', mediaUploadSchema);
