const express = require('express');
const Order = require('../models/Order');
const { protect } = require('../middleware/auth');
const { trackAwb, createShiprocketShipment } = require('../controllers/shippingController');

const router = express.Router();

router.get('/track/:awb', protect, trackAwb);

router.post('/reship/:orderId', protect, async (req, res) => {
  const order = await Order.findOne({ orderId: req.params.orderId });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  await createShiprocketShipment(order);
  res.json({ message: 'Reship processed', awb: order.awb });
});

router.delete('/cancel/:id', protect, async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  order.status = 'cancelled';
  order.statusHistory.push({ status: 'cancelled', note: 'Cancelled by admin' });
  await order.save();
  res.status(204).send();
});

module.exports = router;
