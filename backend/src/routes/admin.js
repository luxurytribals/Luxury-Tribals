const express = require('express');
const { protect } = require('../middleware/auth');
const Order = require('../models/Order');
const Product = require('../models/Product');

const router = express.Router();

router.get('/dashboard', protect, async (_req, res) => {
  const [totals] = await Order.aggregate([{ $match: { paymentStatus: 'paid' } }, { $group: { _id: null, totalRevenue: { $sum: '$amount' }, totalOrders: { $sum: 1 } } }]);
  const productsLive = await Product.countDocuments({ isDeleted: false });
  const pendingShipments = await Order.countDocuments({ paymentStatus: 'paid', awb: { $in: [null, ''] } });

  const since = new Date(Date.now() - 6 * 86400000);
  const revenue7d = await Order.aggregate([
    { $match: { paymentStatus: 'paid', createdAt: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$amount' } } },
    { $sort: { _id: 1 } },
  ]);

  const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(8).select('orderId shippingAddress.name status amount createdAt');
  const topProducts = await Product.find({ isDeleted: false }).sort({ soldCount: -1 }).limit(6).select('name soldCount');

  res.json({
    stats: { totalRevenue: totals?.totalRevenue || 0, totalOrders: totals?.totalOrders || 0, productsLive, pendingShipments },
    revenue7d: revenue7d.map((d) => ({ date: d._id, revenue: d.revenue })),
    recentOrders: recentOrders.map((o) => ({ orderId: o.orderId, customerName: o.shippingAddress?.name || '', status: o.status, amount: o.amount })),
    topProducts,
  });
});

module.exports = router;
