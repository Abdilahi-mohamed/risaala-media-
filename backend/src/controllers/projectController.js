const Project = require('../models/Project');

const listProjects = async (req, res, next) => {
  try {
    const projects = await Project.find().populate('clientId assignedEmployees requiredEquipment').sort({ createdAt: -1 });
    res.json({ success: true, message: 'Projects retrieved', data: projects });
  } catch (error) {
    next(error);
  }
};

const createProject = async (req, res, next) => {
  try {
    const project = await Project.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, message: 'Project created', data: project });
  } catch (error) {
    next(error);
  }
};

const getProjectById = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id).populate('clientId assignedEmployees requiredEquipment');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, message: 'Project retrieved', data: project });
  } catch (error) {
    next(error);
  }
};

const updateProject = async (req, res, next) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('clientId assignedEmployees requiredEquipment');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, message: 'Project updated', data: project });
  } catch (error) {
    next(error);
  }
};

const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, message: 'Project deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { listProjects, createProject, getProjectById, updateProject, deleteProject };
