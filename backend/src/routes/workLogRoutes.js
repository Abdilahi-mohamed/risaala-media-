const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const workLogController = require('../controllers/workLogController');

const router = express.Router();

router.use(authenticate);
router.get('/', authorize('CEO', 'MANAGER'), workLogController.listWorkLogs);
router.post('/', authorize('EMPLOYEE', 'MANAGER'), workLogController.createWorkLog);
router.get('/mine', authorize('EMPLOYEE'), workLogController.listMyWorkLogs);
router.get('/:id', authorize('CEO', 'MANAGER', 'EMPLOYEE'), workLogController.getWorkLogById);
router.put('/:id', authorize('EMPLOYEE', 'MANAGER'), workLogController.updateWorkLog);
router.patch('/:id/status', authorize('MANAGER'), workLogController.updateWorkLogStatus);
router.delete('/:id', authorize('MANAGER'), workLogController.deleteWorkLog);

module.exports = router;
