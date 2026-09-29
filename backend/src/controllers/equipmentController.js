const Equipment = require('../models/Equipment');

const listEquipment = async (req, res, next) => {
  try {
    const equipment = await Equipment.find().sort({ createdAt: -1 });
    res.json({ success: true, message: 'Equipment retrieved', data: equipment });
  } catch (error) {
    next(error);
  }
};

const createEquipment = async (req, res, next) => {
  try {
    const equipment = await Equipment.create(req.body);
    res.status(201).json({ success: true, message: 'Equipment created', data: equipment });
  } catch (error) {
    next(error);
  }
};

const getEquipmentById = async (req, res, next) => {
  try {
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) return res.status(404).json({ success: false, message: 'Equipment not found' });
    res.json({ success: true, message: 'Equipment retrieved', data: equipment });
  } catch (error) {
    next(error);
  }
};

const updateEquipment = async (req, res, next) => {
  try {
    const equipment = await Equipment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!equipment) return res.status(404).json({ success: false, message: 'Equipment not found' });
    res.json({ success: true, message: 'Equipment updated', data: equipment });
  } catch (error) {
    next(error);
  }
};

const deleteEquipment = async (req, res, next) => {
  try {
    const equipment = await Equipment.findByIdAndDelete(req.params.id);
    if (!equipment) return res.status(404).json({ success: false, message: 'Equipment not found' });
    res.json({ success: true, message: 'Equipment deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { listEquipment, createEquipment, getEquipmentById, updateEquipment, deleteEquipment };
