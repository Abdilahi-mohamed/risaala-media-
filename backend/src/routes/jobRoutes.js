const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const jobController = require('../controllers/jobController');
const multer = require('multer');
const path = require('path');

const router = express.Router();

const mongoose = require('mongoose');

const validateObjectId = (req, res, next) => {
  if (req.params.id && !mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(404).json({ success: false, message: 'Job not found (Invalid ID format)' });
  }
  next();
};

router.use(authenticate);
router.get('/', authorize('CEO', 'MANAGER', 'EMPLOYEE'), jobController.listJobs);
router.post('/', authorize('MANAGER'), jobController.createJob);
router.get('/:id', authorize('CEO', 'MANAGER', 'EMPLOYEE'), validateObjectId, jobController.getJobById);
router.put('/:id', authorize('CEO', 'MANAGER', 'EMPLOYEE'), validateObjectId, jobController.updateJob);
router.delete('/:id', authorize('MANAGER'), validateObjectId, jobController.deleteJob);

// configure multer for uploads
const storage = multer.diskStorage({
	destination: (req, file, cb) => cb(null, path.join(__dirname, '..', '..', 'uploads')),
	filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`)
});
const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } });

// media upload route - allow assigned employees to upload, and managers to view only.
router.post('/:id/media', authorize('CEO', 'MANAGER', 'EMPLOYEE'), upload.array('files'), jobController.uploadJobMedia);
router.post('/:id/videos', authorize('CEO', 'MANAGER', 'EMPLOYEE'), upload.array('files'), jobController.uploadJobVideo);
router.get('/:id/media/:mediaId/download', authorize('CEO', 'MANAGER', 'EMPLOYEE'), validateObjectId, jobController.downloadJobMedia);
router.delete('/:id/media/:mediaId', authorize('CEO', 'MANAGER', 'EMPLOYEE'), validateObjectId, jobController.deleteJobMedia);

module.exports = router;
