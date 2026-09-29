const WorkLog = require('../models/WorkLog');

const listWorkLogs = async (req, res, next) => {
  try {
    const workLogs = await WorkLog.find().populate('employeeId projectId jobId').sort({ date: -1 });
    res.json({ success: true, message: 'Work logs retrieved', data: workLogs });
  } catch (error) {
    next(error);
  }
};

const listMyWorkLogs = async (req, res, next) => {
  try {
    const workLogs = await WorkLog.find({ employeeId: req.user._id }).populate('projectId jobId').sort({ date: -1 });
    res.json({ success: true, message: 'My work logs retrieved', data: workLogs });
  } catch (error) {
    next(error);
  }
};

const createWorkLog = async (req, res, next) => {
  try {
    const workLog = await WorkLog.create({ ...req.body, employeeId: req.user._id });
    res.status(201).json({ success: true, message: 'Work log created', data: workLog });
  } catch (error) {
    next(error);
  }
};

const getWorkLogById = async (req, res, next) => {
  try {
    const workLog = await WorkLog.findById(req.params.id).populate('employeeId projectId jobId');
    if (!workLog) return res.status(404).json({ success: false, message: 'Work log not found' });
    if (req.user.role === 'EMPLOYEE' && !workLog.employeeId._id.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    res.json({ success: true, message: 'Work log retrieved', data: workLog });
  } catch (error) {
    next(error);
  }
};

const updateWorkLog = async (req, res, next) => {
  try {
    const workLog = await WorkLog.findById(req.params.id);
    if (!workLog) return res.status(404).json({ success: false, message: 'Work log not found' });
    if (req.user.role === 'EMPLOYEE' && !workLog.employeeId.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const updated = await WorkLog.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, message: 'Work log updated', data: updated });
  } catch (error) {
    next(error);
  }
};

const updateWorkLogStatus = async (req, res, next) => {
  try {
    const workLog = await WorkLog.findByIdAndUpdate(req.params.id, { status: req.body.status, managerComment: req.body.managerComment }, { new: true });
    if (!workLog) return res.status(404).json({ success: false, message: 'Work log not found' });
    res.json({ success: true, message: 'Work log status updated', data: workLog });
  } catch (error) {
    next(error);
  }
};

const deleteWorkLog = async (req, res, next) => {
  try {
    const workLog = await WorkLog.findByIdAndDelete(req.params.id);
    if (!workLog) return res.status(404).json({ success: false, message: 'Work log not found' });
    res.json({ success: true, message: 'Work log deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { listWorkLogs, listMyWorkLogs, createWorkLog, getWorkLogById, updateWorkLog, updateWorkLogStatus, deleteWorkLog };
