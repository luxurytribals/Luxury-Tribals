const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, index: true },
  phone: String,
  city: String,
  totalOrders: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  lastOrderDate: Date,
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
