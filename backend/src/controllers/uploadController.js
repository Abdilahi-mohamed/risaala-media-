const fs = require('fs');
const archiver = require('archiver');
const mongoose = require('mongoose');
const Job = require('../models/Job');
const MediaUpload = require('../models/MediaUpload');

const getGridFsBucket = () => {
  if (!mongoose.connection || !mongoose.connection.db) {
    throw new Error('MongoDB connection is not ready.');
  }

  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: 'uploads'
  });
};

const isAssignedEmployee = (job, user) => {
  if (!job || !user || user.role !== 'EMPLOYEE') return true;
  const assignedIds = (job.assignedEmployees || []).map((employee) => String(employee?._id || employee?.id || ''));
  return assignedIds.includes(String(user._id));
};

const normalizeRelativePath = (value = '') => {
  const cleaned = String(value || '').replace(/\\/g, '/').replace(/^\.?\//, '');
  return cleaned.trim();
};

const sanitizeFolderName = (value = '') => {
  const name = String(value || '').trim();
  return name || 'Project-Media';
};

const ensureAuthorizedBooking = async (bookingId, user) => {
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    throw new Error('Invalid booking ID.');
  }

  const job = await Job.findById(bookingId);
  if (!job) {
    throw new Error('Booking not found.');
  }

  if (user.role === 'MANAGER' || user.role === 'CEO') {
    return job;
  }

  if (user.role === 'EMPLOYEE' && !isAssignedEmployee(job, user)) {
    throw new Error('Access denied. This booking is not assigned to your account.');
  }

  return job;
};

const buildFolderSummaries = (items = []) => {
  const grouped = new Map();

  items.forEach((item) => {
    const folderId = String(item.folderId || 'folder');
    if (!grouped.has(folderId)) {
      grouped.set(folderId, {
        id: folderId,
        folderName: item.folderName || 'Project-Media',
        bookingId: item.bookingId,
        employeeId: item.employeeId,
        uploadedAt: item.uploadedAt || item.createdAt || new Date(),
        files: []
      });
    }

    const folder = grouped.get(folderId);
    folder.files.push({
      id: String(item._id),
      fileId: item.gridFsFileId ? String(item.gridFsFileId) : '',
      gridFsFileId: item.gridFsFileId ? String(item.gridFsFileId) : '',
      folderId: folder.id,
      folderName: folder.folderName,
      fileName: item.fileName,
      relativePath: item.relativePath || item.fileName,
      contentType: item.contentType,
      fileSize: item.fileSize || 0,
      employeeId: item.employeeId,
      bookingId: item.bookingId,
      uploadedAt: item.uploadedAt || item.createdAt || new Date()
    });
  });

  return Array.from(grouped.values()).map((folder) => {
    const imageCount = folder.files.filter((file) => String(file.contentType || '').startsWith('image/')).length;
    const videoCount = folder.files.filter((file) => String(file.contentType || '').startsWith('video/')).length;
    const totalSize = folder.files.reduce((sum, file) => sum + Number(file.fileSize || 0), 0);

    return {
      ...folder,
      fileCount: folder.files.length,
      imageCount,
      videoCount,
      totalSize
    };
  }).sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
};

const getFolderRecords = async (folderId) => {
  const records = await MediaUpload.find({ folderId }).sort({ relativePath: 1, fileName: 1 });
  return records;
};

const uploadFolder = async (req, res, next) => {
  try {
    const bookingId = req.body.bookingId || req.params.bookingId;
    const folderName = sanitizeFolderName(req.body.folderName || 'Project-Media');
    const files = Array.isArray(req.files) ? req.files : [];

    if (!bookingId || !files.length) {
      return res.status(400).json({ success: false, message: 'Please select a folder with valid image or video files.' });
    }

    await ensureAuthorizedBooking(bookingId, req.user);

    if (req.user.role === 'MANAGER') {
      return res.status(403).json({ success: false, message: 'Managers cannot upload employee folders.' });
    }

    const relativePaths = Array.isArray(req.body['relativePaths[]'])
      ? req.body['relativePaths[]']
      : Array.isArray(req.body.relativePaths)
        ? req.body.relativePaths
        : [];

    const folderId = new mongoose.Types.ObjectId().toString();
    const bucket = getGridFsBucket();
    const savedMetadata = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const mimeType = (file.mimetype || '').toLowerCase();
      const isImage = mimeType.startsWith('image/');
      const isVideo = mimeType.startsWith('video/');

      if (!isImage && !isVideo) {
        continue;
      }

      const filePath = normalizeRelativePath(relativePaths[index] || file.originalname);
      const relativeValue = filePath && filePath.includes('/') ? filePath : `${folderName}/${file.originalname}`;
      const uploadedFile = await new Promise((resolve, reject) => {
        const stream = bucket.openUploadStream(file.originalname, {
          metadata: {
            folderId,
            folderName,
            relativePath: relativeValue,
            contentType: mimeType,
            fileSize: file.size,
            employeeId: req.user._id,
            bookingId,
            uploadedAt: new Date()
          }
        });

        stream.on('error', reject);
        stream.on('finish', () => resolve(stream.id));
        stream.end(file.buffer);
      });

      savedMetadata.push({
        folderId,
        folderName,
        fileName: file.originalname,
        relativePath: normalizeRelativePath(relativeValue),
        gridFsFileId: uploadedFile,
        contentType: mimeType,
        fileSize: file.size,
        employeeId: req.user._id,
        bookingId,
        uploadedAt: new Date()
      });
    }

    if (!savedMetadata.length) {
      return res.status(400).json({ success: false, message: 'No supported image or video files were found in the selected folder.' });
    }

    const inserted = await MediaUpload.insertMany(savedMetadata);
    const summary = buildFolderSummaries(inserted)[0];

    res.status(201).json({
      success: true,
      message: 'Folder uploaded successfully.',
      data: { folder: summary }
    });
  } catch (error) {
    next(error);
  }
};

const listFolders = async (req, res, next) => {
  try {
    const { bookingId } = req.query;
    const filter = {};

    if (bookingId) {
      const job = await ensureAuthorizedBooking(bookingId, req.user);
      if (job && req.user.role === 'EMPLOYEE') {
        filter.employeeId = req.user._id;
      }
      filter.bookingId = bookingId;
    } else if (req.user.role === 'EMPLOYEE') {
      filter.employeeId = req.user._id;
    }

    const items = await MediaUpload.find(filter).sort({ uploadedAt: -1 });
    const summaries = buildFolderSummaries(items);
    res.json({ success: true, data: summaries });
  } catch (error) {
    next(error);
  }
};

const getFolder = async (req, res, next) => {
  try {
    const records = await getFolderRecords(req.params.folderId);
    if (!records.length) {
      return res.status(404).json({ success: false, message: 'Folder not found.' });
    }

    const bookingId = records[0].bookingId;
    await ensureAuthorizedBooking(bookingId, req.user);
    const summary = buildFolderSummaries(records)[0];
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};

const getFile = async (req, res, next) => {
  try {
    const rawId = req.params.fileId;
    const record = await MediaUpload.findById(rawId) || await MediaUpload.findOne({ gridFsFileId: new mongoose.Types.ObjectId(rawId) });

    if (!record) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    await ensureAuthorizedBooking(record.bookingId, req.user);
    const bucket = getGridFsBucket();
    const stream = bucket.openDownloadStream(record.gridFsFileId);

    res.setHeader('Content-Type', record.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(record.fileName)}"`);
    res.setHeader('Content-Length', String(record.fileSize || 0));

    stream.on('error', () => {
      res.status(404).json({ success: false, message: 'Stored file not found.' });
    });

    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

const downloadFolder = async (req, res, next) => {
  try {
    const records = await getFolderRecords(req.params.folderId);
    if (!records.length) {
      return res.status(404).json({ success: false, message: 'Folder not found.' });
    }

    const bookingId = records[0].bookingId;
    await ensureAuthorizedBooking(bookingId, req.user);

    const folderName = sanitizeFolderName(records[0].folderName || 'Project-Media');
    const bucket = getGridFsBucket();
    const archive = archiver('zip', { zlib: { level: 9 } });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${folderName}.zip"`);

    archive.on('error', (error) => next(error));
    archive.pipe(res);

    records.forEach((record) => {
      const zipPath = normalizeRelativePath(record.relativePath || record.fileName);
      const stream = bucket.openDownloadStream(record.gridFsFileId);
      archive.append(stream, { name: zipPath || record.fileName });
    });

    await archive.finalize();
  } catch (error) {
    next(error);
  }
};

const deleteFolder = async (req, res, next) => {
  try {
    const records = await getFolderRecords(req.params.folderId);
    if (!records.length) {
      return res.status(404).json({ success: false, message: 'Folder not found.' });
    }

    const bookingId = records[0].bookingId;
    await ensureAuthorizedBooking(bookingId, req.user);

    if (req.user.role === 'MANAGER') {
      return res.status(403).json({ success: false, message: 'Managers cannot delete employee folders.' });
    }

    const bucket = getGridFsBucket();

    for (const record of records) {
      if (record.gridFsFileId) {
        try {
          await bucket.delete(record.gridFsFileId);
        } catch (_error) {
          // Ignore missing GridFS entries and continue cleanup.
        }
      }
    }

    await MediaUpload.deleteMany({ folderId: req.params.folderId });
    res.json({ success: true, message: 'Folder deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadFolder,
  listFolders,
  getFolder,
  getFile,
  downloadFolder,
  deleteFolder
};
