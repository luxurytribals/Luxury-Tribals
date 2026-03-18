const express = require('express');
const Order = require('../models/Order');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/:orderId', async (req, res) => {
  const order = await Order.findOne({ orderId: req.params.orderId });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  res.json(order);
});

router.get('/', protect, async (req, res) => {
  const { status, search } = req.query;
  const q = {};
  if (status) q.status = status;
  if (search) q.$or = [{ orderId: new RegExp(search, 'i') }, { 'shippingAddress.name': new RegExp(search, 'i') }];
  const orders = await Order.find(q).sort({ createdAt: -1 });
  res.json({ orders });
});

router.patch('/:id/status', protect, async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  order.status = req.body.status;
  order.statusHistory.push({ status: req.body.status, note: 'Updated by admin' });
  await order.save();
  res.json(order);
});

module.exports = router;
