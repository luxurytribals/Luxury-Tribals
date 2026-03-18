const express = require('express');
const { protect } = require('../middleware/auth');
const Customer = require('../models/Customer');
const Order = require('../models/Order');

const router = express.Router();

router.get('/', protect, async (_req, res) => {
  const customers = await Customer.find().sort({ lastOrderDate: -1 });
  res.json({ customers });
});

router.get('/:id', protect, async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  const orders = await Order.find({ 'shippingAddress.email': customer.email }).sort({ createdAt: -1 });
  res.json({ customer, orders });
});

module.exports = router;
