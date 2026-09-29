const bcrypt = require('bcrypt');
const User = require('../models/User');

const sanitizeUser = (user) => { if (!user) return null; const doc = user.toObject ? user.toObject() : user; const { password, ...safeUser } = doc; return safeUser; };

const isManagerManagedUser = (actor, targetUser) => {
  if (!actor || !targetUser) return false;
  if (actor.role === 'CEO') return true;
  if (actor.role !== 'MANAGER') return false;
  return String(targetUser.createdBy || '') === String(actor._id || actor.id || '');
};

const listUsers = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role === 'MANAGER') {
      filter.createdBy = req.user._id;
    }
    if (req.user.role === 'EMPLOYEE') {
      filter._id = req.user._id;
    }

    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, message: 'Users retrieved', data: users });
  } catch (error) {
    next(error);
  }
};

const getCurrentUser = async (req, res, next) => {
  try {
    res.json({ success: true, message: 'Current user', data: sanitizeUser(req.user) });
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (req.user.role === 'MANAGER' && !isManagerManagedUser(req.user, user)) {
      return res.status(403).json({ success: false, message: 'You can only view users created by your account.' });
    }
    res.json({ success: true, message: 'User retrieved', data: user });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const { username, currentPassword, newPassword } = req.body || {};
    const updates = {};

    if (username !== undefined) {
      const normalizedUsername = String(username).trim().toLowerCase();
      if (!normalizedUsername) {
        return res.status(400).json({ success: false, message: 'Username cannot be empty.' });
      }
      const existing = await User.findOne({ username: normalizedUsername, _id: { $ne: user._id } });
      if (existing) {
        return res.status(409).json({ success: false, message: 'That username is already in use.' });
      }
      updates.username = normalizedUsername;
    }

    if (newPassword !== undefined || currentPassword !== undefined) {
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'Current password and a new password are required.' });
      }
      if (String(newPassword).trim().length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
      }
      const valid = await bcrypt.compare(String(currentPassword), user.password);
      if (!valid) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
      }
      updates.password = await bcrypt.hash(String(newPassword).trim(), 10);
    }

    const nextUser = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password');
    res.json({ success: true, message: 'Profile updated successfully', data: nextUser });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });
    if (req.user.role === 'MANAGER' && !isManagerManagedUser(req.user, targetUser)) {
      return res.status(403).json({ success: false, message: 'You can only modify staff users created by your account.' });
    }

    const { username, password, employeeId, status } = req.body || {};
    if (password !== undefined) {
      if (String(password).trim().length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
      }
    }

    const updates = {};
    if (username !== undefined) {
      const normalizedUsername = String(username).trim().toLowerCase();
      if (!normalizedUsername) {
        return res.status(400).json({ success: false, message: 'Username cannot be empty.' });
      }
      const existing = await User.findOne({ username: normalizedUsername, _id: { $ne: targetUser._id } });
      if (existing) {
        return res.status(409).json({ success: false, message: 'That username is already in use.' });
      }
      updates.username = normalizedUsername;
    }
    if (employeeId !== undefined) updates.employeeId = employeeId ? String(employeeId).trim() : undefined;
    if (status !== undefined) updates.status = status;
    if (password !== undefined) updates.password = await bcrypt.hash(String(password).trim(), 10);

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
    res.json({ success: true, message: 'User updated', data: user });
  } catch (error) {
    next(error);
  }
};

const updateManagedPassword = async (req, res, next) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });
    if (req.user.role === 'MANAGER' && !isManagerManagedUser(req.user, targetUser)) {
      return res.status(403).json({ success: false, message: 'You can only update passwords for users you created.' });
    }

    const { password } = req.body || {};
    if (!password || String(password).trim().length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    targetUser.password = await bcrypt.hash(String(password).trim(), 10);
    await targetUser.save();
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (req.user.role === 'MANAGER' && !isManagerManagedUser(req.user, user)) {
      return res.status(403).json({ success: false, message: 'You can only delete staff users you created.' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { listUsers, getCurrentUser, getUserById, updateProfile, updateUser, updateManagedPassword, deleteUser };
