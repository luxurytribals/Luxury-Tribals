const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  subtitle: String,
  description: String,
  category: { type: String, enum: ['bestseller', 'new', 'limited'], default: 'new' },
  price: { type: Number, required: true },
  originalPrice: Number,
  sizes: [String],
  badge: String,
  emoji: String,
  svgAccentColor: { type: String, default: '#c9a84c' },
  features: [String],
  imageUrls: [String],
  colors: [{ name: String, hex: String }],
  weight: { type: Number, default: 0.25 },
  inStock: { type: Boolean, default: true },
  stockCount: { type: Number, default: 100 },
  soldCount: { type: Number, default: 0 },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
