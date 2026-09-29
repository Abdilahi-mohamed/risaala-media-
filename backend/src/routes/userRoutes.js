const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');

const router = express.Router();

router.use(authenticate);
router.get('/', authorize('CEO', 'MANAGER', 'EMPLOYEE'), userController.listUsers);
router.get('/me', userController.getCurrentUser);
router.patch('/me', userController.updateProfile);
router.patch('/me/password', userController.updateProfile);
router.get('/:id', authorize('CEO', 'MANAGER', 'EMPLOYEE'), userController.getUserById);
router.put('/:id', authorize('CEO', 'MANAGER'), userController.updateUser);
router.patch('/:id/password', authorize('CEO', 'MANAGER'), userController.updateManagedPassword);
router.delete('/:id', authorize('CEO', 'MANAGER'), userController.deleteUser);

module.exports = router;
