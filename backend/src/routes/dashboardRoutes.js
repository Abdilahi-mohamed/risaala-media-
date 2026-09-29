const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

router.use(authenticate);
router.get('/overview', authorize('CEO', 'MANAGER'), dashboardController.getDashboardOverview);
router.get('/employee-activity', authorize('CEO', 'MANAGER'), dashboardController.getEmployeeActivity);
router.get('/employee-performance', authorize('CEO', 'MANAGER'), dashboardController.getEmployeePerformance);
router.get('/revenue', authorize('CEO', 'MANAGER'), dashboardController.getRevenueStats);

module.exports = router;
