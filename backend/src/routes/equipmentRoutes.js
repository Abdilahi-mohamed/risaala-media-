const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const equipmentController = require('../controllers/equipmentController');

const router = express.Router();

router.use(authenticate);
router.get('/', authorize('CEO', 'MANAGER'), equipmentController.listEquipment);
router.post('/', authorize('MANAGER'), equipmentController.createEquipment);
router.get('/:id', authorize('CEO', 'MANAGER', 'EMPLOYEE'), equipmentController.getEquipmentById);
router.put('/:id', authorize('MANAGER'), equipmentController.updateEquipment);
router.delete('/:id', authorize('MANAGER'), equipmentController.deleteEquipment);

module.exports = router;
