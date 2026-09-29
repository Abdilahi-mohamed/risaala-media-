const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secret-key', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

const register = async (req, res, next) => {
  try {
    const { name, email, password, role, employeeId, username, createdBy } = req.body;
    const normalizedEmail = String(email || '').toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already exists' });
    }
    if (!password || String(password).trim().length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashed,
      role,
      employeeId: employeeId || undefined,
      username: username || undefined,
      createdBy: createdBy || null
    });
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
        username: user.username
      }
    });
  } catch (error) {
    next(error);
  }
};

const createStaffUser = async (req, res, next) => {
  try {
    const actor = req.user;
    if (!actor || !['MANAGER', 'CEO'].includes(actor.role)) {
      return res.status(403).json({ success: false, message: 'Only managers or CEOs can create staff users.' });
    }

    const { name, email, password, username, employeeId } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Full name, email, and password are required.' });
    }
    if (String(password).trim().length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedUsername = username ? String(username).trim().toLowerCase() : '';
    const normalizedEmployeeId = employeeId ? String(employeeId).trim() : undefined;

    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      return res.status(409).json({ success: false, message: 'A user with that email already exists.' });
    }

    if (normalizedUsername) {
      const usernameExists = await User.findOne({ username: normalizedUsername });
      if (usernameExists) {
        return res.status(409).json({ success: false, message: 'That username is already in use.' });
      }
    }

    if (normalizedEmployeeId) {
      const employeeIdExists = await User.findOne({ employeeId: normalizedEmployeeId });
      if (employeeIdExists) {
        return res.status(409).json({ success: false, message: 'That employee ID is already in use.' });
      }
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      username: normalizedUsername || undefined,
      employeeId: normalizedEmployeeId || undefined,
      password: hashed,
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      createdBy: actor._id
    });

    res.status(201).json({
      success: true,
      message: 'Staff user created successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        employeeId: user.employeeId,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid login credentials' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid login credentials' });
    }
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, message: 'Account is not active' });
    }
    user.lastLogin = new Date();
    await user.save();
    const token = generateToken(user);
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          employeeId: user.employeeId,
          username: user.username
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Refresh token missing' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-key');
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    const refreshed = generateToken(user);
    res.json({ success: true, message: 'Token refreshed', data: { token: refreshed } });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, createStaffUser, login, refreshToken };
