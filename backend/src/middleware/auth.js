const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

exports.protect = async (req, res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id);
    if (!admin || admin.tokenVersion !== decoded.tokenVersion) throw new Error('Invalid token');
    req.admin = admin;
    next();
  } catch (e) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

exports.allowRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.admin?.role)) return res.status(403).json({ message: 'Forbidden' });
  next();
};
