const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  employeeId: { type: String, trim: true, unique: true, sparse: true },
  username: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['CEO', 'MANAGER', 'EMPLOYEE'], default: 'EMPLOYEE' },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'], default: 'ACTIVE' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  lastLogin: { type: Date },
}, { timestamps: true });

userSchema.index({ email: 1 });
userSchema.index({ employeeId: 1 });
userSchema.index({ username: 1 });

module.exports = mongoose.model('User', userSchema);
