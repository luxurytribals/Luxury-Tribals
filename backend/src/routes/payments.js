const crypto = require('crypto');
const express = require('express');
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const getRazorpay = require('../utils/razorpay');
const { createShiprocketShipment } = require('../controllers/shippingController');

const router = express.Router();

router.post('/create-order', body('items').isArray({ min: 1 }), body('shippingAddress.name').isLength({ min: 2 }), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Invalid input', errors: errors.array() });

  const products = await Product.find({ _id: { $in: req.body.items.map((i) => i.productId) }, isDeleted: false });
  const map = Object.fromEntries(products.map((p) => [String(p._id), p]));

  const items = req.body.items.map((i) => {
    const p = map[i.productId];
    if (!p) throw new Error('Product missing');
    return { product: p._id, name: p.name, price: p.price, qty: Number(i.qty || 1), size: i.size || 'M', color: i.color || '' };
  });

  const amount = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const razorpay = getRazorpay();
  const rpOrder = await razorpay.orders.create({ amount: amount * 100, currency: 'INR', receipt: `lt_${Date.now()}` });

  const order = await Order.create({
    orderId: `LT${Date.now()}`,
    razorpayOrderId: rpOrder.id,
    paymentStatus: 'pending',
    status: 'pending',
    amount,
    items,
    shippingAddress: req.body.shippingAddress,
    statusHistory: [{ status: 'pending', note: 'Order created' }],
  });

  res.json({ razorpayOrderId: rpOrder.id, amount: rpOrder.amount, key: process.env.RAZORPAY_KEY_ID, prefill: { name: req.body.shippingAddress.name, email: req.body.shippingAddress.email }, orderId: order.orderId });
});

router.post('/verify', body('razorpayOrderId').notEmpty(), body('razorpayPaymentId').notEmpty(), body('razorpaySignature').notEmpty(), async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest('hex');
  if (expected !== razorpaySignature) return res.status(400).json({ message: 'Signature mismatch' });

  const order = await Order.findOne({ razorpayOrderId });
  if (!order) return res.status(404).json({ message: 'Order not found' });

  order.paymentStatus = 'paid'; order.status = 'paid';
  order.razorpayPaymentId = razorpayPaymentId; order.razorpaySignature = razorpaySignature;
  order.statusHistory.push({ status: 'paid', note: 'Payment verified' });
  await order.save();

  await Customer.findOneAndUpdate(
    { email: order.shippingAddress.email },
    { $set: { name: order.shippingAddress.name, phone: order.shippingAddress.phone, city: order.shippingAddress.city, lastOrderDate: new Date() }, $inc: { totalOrders: 1, totalSpent: order.amount } },
    { upsert: true, new: true }
  );

  await Promise.all(order.items.map((i) => Product.findByIdAndUpdate(i.product, { $inc: { soldCount: i.qty, stockCount: -i.qty } })));

  createShiprocketShipment(order).catch((e) => console.error('Shiprocket async error', e.message));
  res.json({ message: 'Payment verified', orderId: order.orderId });
});

router.post('/webhook', express.raw({ type: '*/*' }), async (req, res) => {
  const sig = req.headers['x-razorpay-signature'];
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(req.body).digest('hex');
  if (sig !== expected) return res.status(400).send('Invalid signature');
  const payload = JSON.parse(req.body.toString());
  const entity = payload?.payload?.payment?.entity;
  if (payload.event === 'payment.failed') await Order.findOneAndUpdate({ razorpayPaymentId: entity.id }, { paymentStatus: 'failed', status: 'pending' });
  if (payload.event === 'payment.captured') await Order.findOneAndUpdate({ razorpayOrderId: entity.order_id }, { paymentStatus: 'paid' });
  res.status(200).send('ok');
});

module.exports = router;
