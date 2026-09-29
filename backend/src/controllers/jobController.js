const fs = require('fs');
const path = require('path');
const Job = require('../models/Job');
const User = require('../models/User');

const populateFields = 'projectId clientId assignedEmployees requiredEquipment';

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const resolveEmployeeByIdentifier = async (identifier = '') => {
  const raw = String(identifier || '').trim();
  if (!raw) return null;

  const directMatch = await User.findOne({
    role: 'EMPLOYEE',
    $or: [
      { _id: mongoose.Types.ObjectId.isValid(raw) ? raw : undefined },
      { employeeId: raw },
      { username: raw.toLowerCase() },
      { email: raw.toLowerCase() },
      { name: { $regex: new RegExp(`^${escapeRegex(raw)}$`, 'i') } }
    ].filter(Boolean)
  });

  if (directMatch) return directMatch;

  return User.findOne({
    role: 'EMPLOYEE',
    $or: [
      { name: { $regex: new RegExp(escapeRegex(raw), 'i') } },
      { email: { $regex: new RegExp(escapeRegex(raw), 'i') } },
      { employeeId: { $regex: new RegExp(escapeRegex(raw), 'i') } },
      { username: { $regex: new RegExp(escapeRegex(raw), 'i') } }
    ]
  });
};

const isAssignedEmployee = (job, user) => {
  if (!job || !user || user.role !== 'EMPLOYEE') return true;
  const assignedIds = (job.assignedEmployees || []).map((employee) => String(employee?._id || employee?.id || ''));
  return assignedIds.includes(String(user._id));
};

const listJobs = async (req, res, next) => {
  try {
    const query = {};
    if (req.user.role === 'EMPLOYEE') {
      query.assignedEmployees = req.user._id;
    }
    const jobs = await Job.find(query).populate(populateFields).sort({ createdAt: -1 });
    res.json({ success: true, message: 'Jobs retrieved', data: jobs });
  } catch (error) {
    next(error);
  }
};

const createJob = async (req, res, next) => {
  try {
    const body = { ...req.body, createdBy: req.user._id };
    const employeeIdentifier = req.body.assignedEmployeeId || req.body.employeeId || req.body.username || req.body.employeeName;

    if (employeeIdentifier) {
      const employee = await resolveEmployeeByIdentifier(employeeIdentifier);
      if (employee) {
        body.assignedEmployees = [employee._id];
        body.notes = `Assigned employee: ${employee.name}${employee.employeeId ? ` (${employee.employeeId})` : ''}`;
      } else if (req.body.employeeName) {
        body.notes = `Assigned employee: ${req.body.employeeName}`;
      }
    }

    delete body.assignedEmployeeId;
    delete body.employeeId;
    delete body.username;
    delete body.employeeName;

    const job = await Job.create(body);
    const populated = await Job.findById(job._id).populate(populateFields);
    res.status(201).json({ success: true, message: 'Job created', data: populated });
  } catch (error) {
    next(error);
  }
};

const mongoose = require('mongoose');

const getJobById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Job not found (Invalid ID format)' });
    }
    const job = await Job.findById(req.params.id).populate(populateFields);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (!isAssignedEmployee(job, req.user)) {
      return res.status(403).json({ success: false, message: 'Access denied. This job is assigned to another employee.' });
    }
    res.json({ success: true, message: 'Job retrieved', data: job });
  } catch (error) {
    next(error);
  }
};

const updateJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id).populate(populateFields);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    if (!isAssignedEmployee(job, req.user)) {
      return res.status(403).json({ success: false, message: 'Access denied. This job is assigned to another employee.' });
    }

    const updates = { ...req.body };

    const employeeIdentifier = req.body.assignedEmployeeId || req.body.employeeId || req.body.username || req.body.employeeName;
    if (employeeIdentifier) {
      const employee = await resolveEmployeeByIdentifier(employeeIdentifier);
      if (employee) {
        updates.assignedEmployees = [employee._id];
        updates.notes = `Assigned employee: ${employee.name}${employee.employeeId ? ` (${employee.employeeId})` : ''}`;
      } else if (req.body.employeeName) {
        updates.notes = `Assigned employee: ${req.body.employeeName}`;
      }
    }

    delete updates.assignedEmployeeId;
    delete updates.employeeId;
    delete updates.username;
    delete updates.employeeName;

    const nextJob = await Job.findByIdAndUpdate(req.params.id, updates, { new: true }).populate(populateFields);
    res.json({ success: true, message: 'Job updated', data: nextJob });
  } catch (error) {
    next(error);
  }
};

const deleteJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
    const removeFile = (fileUrl = '') => {
      const filename = String(fileUrl).replace(/^\/uploads\//, '');
      if (!filename) return;
      const filePath = path.join(uploadsDir, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    };

    (job.attachments || []).forEach((file) => removeFile(file.url));
    (job.jobVideos || []).forEach((file) => removeFile(file.url));

    await Job.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Job deleted' });
  } catch (error) {
    next(error);
  }
};

const getMediaRecord = (job, mediaId) => {
  const attachment = (job.attachments || []).find((file) => String(file._id) === String(mediaId));
  if (attachment) return { kind: 'attachment', media: attachment };

  const jobVideo = (job.jobVideos || []).find((file) => String(file._id) === String(mediaId));
  if (jobVideo) return { kind: 'video', media: jobVideo };

  return null;
};

const uploadJobMedia = async (req, res, next) => {
  try {
    if (req.params.id && !mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    if (req.user.role === 'MANAGER') {
      return res.status(403).json({
        success: false,
        message: 'Managers can only view employee uploads; they cannot upload files to a booking.'
      });
    }

    if (!isAssignedEmployee(job, req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only upload files to jobs assigned to your account.'
      });
    }

    const files = Array.isArray(req.files) ? req.files : [];

    const added = files.map((file) => ({
      url: `/uploads/${file.filename}`,
      filename: file.originalname,
      type: file.mimetype.startsWith('video/') ? 'video' : (file.mimetype.startsWith('image/') ? 'image' : 'file'),
      uploadedBy: req.user ? req.user._id : null,
      uploadedAt: new Date()
    }));

    job.attachments = Array.isArray(job.attachments) ? job.attachments.concat(added) : added;
    await job.save();

    const updated = await Job.findById(req.params.id).populate(populateFields);
    res.json({ success: true, message: 'Files uploaded', data: updated });
  } catch (error) {
    next(error);
  }
};

const uploadJobVideo = async (req, res, next) => {
  try {
    if (req.params.id && !mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    if (req.user.role === 'MANAGER') {
      return res.status(403).json({
        success: false,
        message: 'Managers can only view employee uploads; they cannot upload videos to a booking.'
      });
    }

    if (!isAssignedEmployee(job, req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only upload videos to jobs assigned to your account.'
      });
    }

    const files = Array.isArray(req.files) ? req.files : [];
    const videoFiles = files.filter((file) => file.mimetype.startsWith('video/'));

    if (!videoFiles.length) {
      return res.status(400).json({ success: false, message: 'Please upload a valid video file.' });
    }

    const added = videoFiles.map((file) => ({
      url: `/uploads/${file.filename}`,
      filename: file.originalname,
      type: 'video',
      uploadedBy: req.user ? req.user._id : null,
      uploadedAt: new Date()
    }));

    job.jobVideos = Array.isArray(job.jobVideos) ? job.jobVideos.concat(added) : added;
    await job.save();

    const updated = await Job.findById(req.params.id).populate(populateFields);
    res.json({ success: true, message: 'Job video uploaded', data: updated });
  } catch (error) {
    next(error);
  }
};

const downloadJobMedia = async (req, res, next) => {
  try {
    if (req.params.id && !mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    const mediaRecord = getMediaRecord(job, req.params.mediaId);
    if (!mediaRecord) return res.status(404).json({ success: false, message: 'Media not found' });

    const user = req.user;
    const isManagerOrCEO = user.role === 'MANAGER' || user.role === 'CEO';
    const isOwner = !mediaRecord.media.uploadedBy || (mediaRecord.media.uploadedBy && mediaRecord.media.uploadedBy.equals(user._id));

    if (user.role === 'EMPLOYEE' && !isOwner) {
      return res.status(403).json({ success: false, message: 'You do not have permission to download this file.' });
    }

    if (!isManagerOrCEO && user.role !== 'EMPLOYEE') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
    const fileUrl = mediaRecord.media.url || '';
    const filename = String(fileUrl).replace(/^\/uploads\//, '').split('?')[0];
    const filePath = path.join(uploadsDir, filename);

    if (!filename || !fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Stored file not found' });
    }

    res.download(filePath, mediaRecord.media.filename || path.basename(filePath));
  } catch (error) {
    next(error);
  }
};

const deleteJobMedia = async (req, res, next) => {
  try {
    if (req.params.id && !mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    const { mediaId } = req.params;
    const mediaRecord = getMediaRecord(job, mediaId);
    if (!mediaRecord) return res.status(404).json({ success: false, message: 'Media not found' });

    const user = req.user;
    const isManagerOrCEO = user.role === 'MANAGER' || user.role === 'CEO';
    const isOwner = !mediaRecord.media.uploadedBy || (mediaRecord.media.uploadedBy && mediaRecord.media.uploadedBy.equals(user._id));

    if (user.role === 'MANAGER') {
      return res.status(403).json({ success: false, message: 'Managers cannot delete employee uploads.' });
    }

    if (user.role === 'EMPLOYEE' && !isOwner) {
      return res.status(403).json({ success: false, message: 'You can only delete your own uploads.' });
    }

    if (!isManagerOrCEO && user.role !== 'EMPLOYEE') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
    const removeStoredFile = (fileUrl = '') => {
      const filename = String(fileUrl).replace(/^\/uploads\//, '').split('?')[0];
      if (!filename) return;
      const filePath = path.join(uploadsDir, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    };

    if (mediaRecord.kind === 'attachment') {
      removeStoredFile(mediaRecord.media.url);
      job.attachments = job.attachments.filter((file) => String(file._id) !== String(mediaId));
      await job.save();
      const updated = await Job.findById(req.params.id).populate(populateFields);
      return res.json({ success: true, message: 'Media deleted', data: updated });
    }

    removeStoredFile(mediaRecord.media.url);
    job.jobVideos = job.jobVideos.filter((file) => String(file._id) !== String(mediaId));
    await job.save();
    const updated = await Job.findById(req.params.id).populate(populateFields);
    return res.json({ success: true, message: 'Job video deleted', data: updated });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listJobs,
  createJob,
  getJobById,
  updateJob,
  deleteJob,
  uploadJobMedia,
  uploadJobVideo,
  downloadJobMedia,
  deleteJobMedia
};
