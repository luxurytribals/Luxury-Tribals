const express = require('express');
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  const { category } = req.query;
  const q = { isDeleted: false };
  if (category) q.category = category;
  const products = await Product.find(q).sort({ createdAt: -1 });
  res.json({ products });
});

router.get('/:idOrSlug', async (req, res) => {
  const product = await Product.findOne({ isDeleted: false, $or: [{ _id: req.params.idOrSlug }, { slug: req.params.idOrSlug }] });
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
});

router.post('/', protect, body('name').isLength({ min: 2 }), body('price').isNumeric(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
  const slug = req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const product = await Product.create({ ...req.body, slug });
  res.status(201).json(product);
});

router.patch('/:id', protect, async (req, res) => {
  if (req.body.name && !req.body.slug) req.body.slug = req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
});

router.patch('/:id/stock', protect, async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, { inStock: !!req.body.inStock }, { new: true });
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
});

router.delete('/:id', protect, async (req, res) => {
  await Product.findByIdAndUpdate(req.params.id, { isDeleted: true });
  res.status(204).send();
});

module.exports = router;
