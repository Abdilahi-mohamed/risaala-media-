const express = require('express');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const clientController = require('../controllers/clientController');

const router = express.Router();

router.use(authenticate);
router.get('/', authorize('CEO', 'MANAGER'), clientController.listClients);
router.post('/', authorize('MANAGER'), clientController.createClient);
router.get('/:id', authorize('CEO', 'MANAGER'), clientController.getClientById);
router.put('/:id', authorize('MANAGER'), clientController.updateClient);
router.delete('/:id', authorize('MANAGER'), clientController.deleteClient);

module.exports = router;
