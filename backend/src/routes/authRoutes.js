const express = require('express');
const authController = require('../controllers/authController');
const validateRequest = require('../middleware/validateRequest');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { loginSchema, registerSchema } = require('../validators/authValidators');

const router = express.Router();

router.post('/login', validateRequest(loginSchema), authController.login);
router.post('/register', validateRequest(registerSchema), authController.register);
router.post('/staff', authenticate, authorize('MANAGER', 'CEO'), authController.createStaffUser);
router.post('/refresh', authController.refreshToken);

module.exports = router;
