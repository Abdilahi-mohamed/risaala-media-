const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authorization token missing' });
  }

  // Development demo-token bypass — maps 'demo-token' to the first active MANAGER (or CEO)
  // so that demo frontend sessions can interact with the real database.
  if (token === 'demo-token') {
    try {
      let demoUser = await User.findOne({ role: 'MANAGER', status: 'ACTIVE' }).select('-password')
        || await User.findOne({ role: 'CEO', status: 'ACTIVE' }).select('-password')
        || await User.findOne({ status: 'ACTIVE' }).select('-password');
      
      // Auto-seed/create demo manager if database has no active manager/user
      if (!demoUser) {
        const bcrypt = require('bcrypt');
        const hashedManagerPassword = await bcrypt.hash('manager123', 10);
        demoUser = await User.create({
          name: 'Abdiqani Sh. Ibrahim',
          email: 'manager@risaala.com',
          password: hashedManagerPassword,
          role: 'MANAGER',
          status: 'ACTIVE'
        });
        
        const hashedStaffPassword = await bcrypt.hash('staff123', 10);
        await User.create({
          name: 'Daniel Kim',
          email: 'staff@risaala.com',
          password: hashedStaffPassword,
          role: 'EMPLOYEE',
          status: 'ACTIVE'
        });
      }

      if (demoUser) {
        req.user = demoUser;
        return next();
      }
    } catch (_err) {
      // fall through to normal auth error
    }
    return res.status(401).json({ success: false, message: 'Demo user not found in database' });
  }

  // Standard JWT authentication
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-key');
    const user = await User.findById(decoded.id).select('-password');
    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ success: false, message: 'Unauthorized token' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  next();
};

module.exports = { authenticate, authorize };
