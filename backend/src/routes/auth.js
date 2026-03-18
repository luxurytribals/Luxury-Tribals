const express = require('express');
const { body, validationResult } = require('express-validator');
const Admin = require('../models/Admin');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/login', body('email').isEmail(), body('password').isLength({ min: 1 }), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email: email.toLowerCase() });
  if (!admin || !(await admin.matchPassword(password))) return res.status(401).json({ message: 'Invalid credentials' });
  res.json({ token: admin.generateJWT(), admin: { email: admin.email, role: admin.role } });
});

router.get('/me', protect, (req, res) => res.json({ email: req.admin.email, role: req.admin.role }));

router.patch('/change-password', protect, body('currentPassword').isLength({ min: 1 }), body('newPassword').isLength({ min: 8 }), async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const admin = await Admin.findById(req.admin._id);
  if (!(await admin.matchPassword(currentPassword))) return res.status(400).json({ message: 'Current password incorrect' });
  admin.password = newPassword;
  admin.tokenVersion += 1;
  await admin.save();
  res.json({ message: 'Password changed' });
});

router.post('/logout', protect, async (req, res) => {
  req.admin.tokenVersion += 1;
  await req.admin.save();
  res.json({ message: 'Logged out' });
});

module.exports = router;
