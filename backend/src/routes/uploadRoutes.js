const express = require('express');
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const uploadController = require('../controllers/uploadController');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }
});

router.use(authenticate);

router.post('/folder', authorize('EMPLOYEE', 'MANAGER', 'CEO'), upload.array('files', 500), uploadController.uploadFolder);
router.get('/folders', authorize('EMPLOYEE', 'MANAGER', 'CEO'), uploadController.listFolders);
router.get('/folder/:folderId', authorize('EMPLOYEE', 'MANAGER', 'CEO'), uploadController.getFolder);
router.get('/file/:fileId', authorize('EMPLOYEE', 'MANAGER', 'CEO'), uploadController.getFile);
router.get('/folder/:folderId/download', authorize('EMPLOYEE', 'MANAGER', 'CEO'), uploadController.downloadFolder);
router.delete('/folder/:folderId', authorize('EMPLOYEE', 'MANAGER', 'CEO'), uploadController.deleteFolder);

module.exports = router;
