const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const projectController = require('../controllers/projectController');

const router = express.Router();

router.use(authenticate);
router.get('/', authorize('CEO', 'MANAGER'), projectController.listProjects);
router.post('/', authorize('MANAGER'), projectController.createProject);
router.get('/:id', authorize('CEO', 'MANAGER'), projectController.getProjectById);
router.put('/:id', authorize('MANAGER'), projectController.updateProject);
router.delete('/:id', authorize('MANAGER'), projectController.deleteProject);

module.exports = router;
