const crypto = require('crypto');
const express = require('express');
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const getRazorpay = require('../utils/razorpay');
const { createShiprocketShipment } = require('../controllers/shippingController');

const router = express.Router();

/**
 * Create Razorpay order
 */
router.post('/create-order', 
  body('items').isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
  body('shippingAddress.name').isLength({ min: 2 }).withMessage('Name is required'),
  body('shippingAddress.email').isEmail().withMessage('Valid email is required'),
  body('shippingAddress.phone').isLength({ min: 10 }).withMessage('Valid phone is required'),
  body('shippingAddress.address1').notEmpty().withMessage('Address is required'),
  body('shippingAddress.city').notEmpty().withMessage('City is required'),
  body('shippingAddress.state').notEmpty().withMessage('State is required'),
  body('shippingAddress.pincode').isLength({ min: 6, max: 6 }).withMessage('Valid pincode is required'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Invalid input', 
          errors: errors.array() 
        });
      }

      // Fetch products and validate
      const products = await Product.find({ 
        _id: { $in: req.body.items.map((i) => i.productId) }, 
        isDeleted: false,
        inStock: true 
      });

      if (products.length !== req.body.items.length) {
        return res.status(400).json({ 
          message: 'Some products are unavailable or out of stock' 
        });
      }

      const map = Object.fromEntries(products.map((p) => [String(p._id), p]));

      // Build order items
      const items = req.body.items.map((i) => {
        const p = map[i.productId];
        if (!p) throw new Error('Product not found');
        
        return { 
          product: p._id, 
          name: p.name, 
          price: p.price, 
          qty: Number(i.qty || 1), 
          size: i.size || 'M', 
          color: i.color || '' 
        };
      });

      const amount = items.reduce((sum, i) => sum + i.price * i.qty, 0);

      // Create Razorpay order
      const razorpay = getRazorpay();
      const rpOrder = await razorpay.orders.create({ 
        amount: amount * 100, // Convert to paise
        currency: 'INR', 
        receipt: `lt_${Date.now()}` 
      });

      // Create order in database
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

      console.log(`📝 Order created: ${order.orderId} (₹${amount})`);

      res.json({ 
        razorpayOrderId: rpOrder.id, 
        amount: rpOrder.amount, 
        key: process.env.RAZORPAY_KEY_ID, 
        prefill: { 
          name: req.body.shippingAddress.name, 
          email: req.body.shippingAddress.email,
          contact: req.body.shippingAddress.phone
        }, 
        orderId: order.orderId 
      });

    } catch (error) {
      console.error('❌ Create order error:', error.message);
      res.status(500).json({ message: 'Failed to create order' });
    }
  }
);

/**
 * Verify Razorpay payment
 */
router.post('/verify', 
  body('razorpayOrderId').notEmpty(),
  body('razorpayPaymentId').notEmpty(),
  body('razorpaySignature').notEmpty(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Invalid input' });
      }

      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

      // Verify signature
      const expected = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      if (expected !== razorpaySignature) {
        console.error('❌ Payment signature mismatch');
        return res.status(400).json({ message: 'Payment verification failed' });
      }

      // Update order with atomic operation to prevent race conditions
      const order = await Order.findOneAndUpdate(
        { 
          razorpayOrderId, 
          paymentStatus: 'pending' // Only update if still pending
        },
        {
          paymentStatus: 'paid',
          status: 'paid',
          razorpayPaymentId,
          razorpaySignature,
          $push: { statusHistory: { status: 'paid', note: 'Payment verified' } }
        },
        { new: true }
      );

      if (!order) {
        console.warn('⚠️  Payment already processed or order not found');
        return res.status(400).json({ 
          message: 'Order already processed or not found' 
        });
      }

      console.log(`✅ Payment verified: ${order.orderId} (₹${order.amount})`);

      // Update or create customer
      await Customer.findOneAndUpdate(
        { email: order.shippingAddress.email },
        {
          $set: {
            name: order.shippingAddress.name,
            phone: order.shippingAddress.phone,
            city: order.shippingAddress.city,
            lastOrderDate: new Date()
          },
          $inc: {
            totalOrders: 1,
            totalSpent: order.amount
          }
        },
        { upsert: true, new: true }
      );

      // Update product sold counts and stock
      await Promise.all(
        order.items.map((i) => 
          Product.findByIdAndUpdate(i.product, {
            $inc: { 
              soldCount: i.qty, 
              stockCount: -i.qty 
            }
          })
        )
      );

      // Create Shiprocket shipment asynchronously
      // Don't wait for it - let it run in background
      createShiprocketShipment(order).catch((e) => {
        console.error(`❌ Shiprocket async error for ${order.orderId}:`, e.message);
        // Error is already logged in the controller
      });

      res.json({ 
        message: 'Payment verified successfully', 
        orderId: order.orderId 
      });

    } catch (error) {
      console.error('❌ Payment verification error:', error.message);
      res.status(500).json({ message: 'Payment verification failed' });
    }
  }
);

/**
 * Razorpay webhook handler
 */
router.post('/webhook', express.raw({ type: '*/*' }), async (req, res) => {
  try {
    const sig = req.headers['x-razorpay-signature'];
    
    if (!sig) {
      console.error('❌ Webhook: Missing signature');
      return res.status(400).send('Missing signature');
    }

    // Verify webhook signature
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(req.body)
      .digest('hex');

    if (sig !== expected) {
      console.error('❌ Webhook: Invalid signature');
      return res.status(400).send('Invalid signature');
    }

    const payload = JSON.parse(req.body.toString());
    const event = payload.event;
    const entity = payload?.payload?.payment?.entity;

    console.log(`📨 Webhook received: ${event}`);

    // Handle payment failed
    if (event === 'payment.failed' && entity) {
      await Order.findOneAndUpdate(
        { razorpayPaymentId: entity.id },
        { 
          paymentStatus: 'failed', 
          status: 'pending',
          $push: { statusHistory: { status: 'failed', note: 'Payment failed' } }
        }
      );
      console.log(`❌ Payment failed: ${entity.id}`);
    }

    // Handle payment captured
    if (event === 'payment.captured' && entity) {
      await Order.findOneAndUpdate(
        { razorpayOrderId: entity.order_id },
        { 
          paymentStatus: 'paid',
          $push: { statusHistory: { status: 'paid', note: 'Payment captured via webhook' } }
        }
      );
      console.log(`✅ Payment captured: ${entity.order_id}`);
    }

    res.status(200).send('ok');

  } catch (error) {
    console.error('❌ Webhook processing error:', error.message);
    res.status(500).send('Webhook processing failed');
  }
});

module.exports = router;
