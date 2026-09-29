const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

router.use(authenticate);
router.get('/', notificationController.listNotifications);
router.post('/', authorize('MANAGER'), notificationController.createNotification);
router.patch('/:id/read', notificationController.markAsRead);
router.delete('/:id', authorize('MANAGER'), notificationController.deleteNotification);

module.exports = router;
