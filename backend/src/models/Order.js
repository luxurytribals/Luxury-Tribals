const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: String,
  price: Number,
  qty: Number,
  size: String,
  color: String,
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true, required: true },
  razorpayOrderId: String,
  razorpayPaymentId: String,
  razorpaySignature: String,
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  status: { type: String, enum: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
  amount: Number,
  items: [orderItemSchema],
  shippingAddress: {
    name: String, email: String, phone: String,
    address1: String, address2: String, landmark: String,
    city: String, state: String, pincode: String,
  },
  shiprocketOrderId: String,
  awb: String,
  courierName: String,
  trackingUrl: String,
  etaDate: Date,
  statusHistory: [{ status: String, at: { type: Date, default: Date.now }, note: String }],
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
