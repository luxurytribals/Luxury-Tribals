const nodemailer = require('nodemailer');

// Create transporter using Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Send order confirmation email to admin
 */
async function sendOrderNotification(order) {
  try {
    const itemsList = order.items.map(item => 
      `• ${item.name} (Size: ${item.size}) x${item.qty} — ₹${item.price * item.qty}`
    ).join('\n');

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to yourself
      subject: `🛍️ New Order Received! ${order.orderId} — ₹${order.amount}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #f6f1df; padding: 30px; border-radius: 8px;">
          
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #c9a84c; font-size: 28px; margin: 0;">Luxury Tribals</h1>
            <p style="color: #c9c3b2; margin: 8px 0 0 0;">New Order Notification</p>
          </div>

          <div style="background: #151515; padding: 20px; border-radius: 8px; border: 1px solid #2f2f2f; margin-bottom: 20px;">
            <h2 style="color: #c9a84c; margin-top: 0;">🎉 New Order Received!</h2>
            <p style="color: #c9c3b2;">A new order has been placed on your store.</p>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #c9c3b2; width: 40%;">Order ID:</td>
                <td style="padding: 8px 0; color: #f6f1df; font-weight: bold;">${order.orderId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #c9c3b2;">Order Amount:</td>
                <td style="padding: 8px 0; color: #c9a84c; font-weight: bold; font-size: 20px;">₹${order.amount}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #c9c3b2;">Payment Status:</td>
                <td style="padding: 8px 0; color: #6fcf6f; font-weight: bold;">✅ PAID</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #c9c3b2;">Order Date:</td>
                <td style="padding: 8px 0; color: #f6f1df;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td>
              </tr>
            </table>
          </div>

          <div style="background: #151515; padding: 20px; border-radius: 8px; border: 1px solid #2f2f2f; margin-bottom: 20px;">
            <h3 style="color: #c9a84c; margin-top: 0;">📦 Items Ordered</h3>
            ${order.items.map(item => `
              <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #2f2f2f;">
                <div>
                  <p style="margin: 0; color: #f6f1df; font-weight: bold;">${item.name}</p>
                  <p style="margin: 4px 0 0 0; color: #c9c3b2; font-size: 14px;">Size: ${item.size} | Qty: ${item.qty}</p>
                </div>
                <p style="margin: 0; color: #c9a84c; font-weight: bold;">₹${item.price * item.qty}</p>
              </div>
            `).join('')}
            <div style="display: flex; justify-content: space-between; padding: 12px 0 0 0;">
              <p style="margin: 0; color: #f6f1df; font-weight: bold; font-size: 18px;">Total</p>
              <p style="margin: 0; color: #c9a84c; font-weight: bold; font-size: 18px;">₹${order.amount}</p>
            </div>
          </div>

          <div style="background: #151515; padding: 20px; border-radius: 8px; border: 1px solid #2f2f2f; margin-bottom: 20px;">
            <h3 style="color: #c9a84c; margin-top: 0;">🚚 Shipping Address</h3>
            <p style="margin: 0; color: #f6f1df; font-weight: bold;">${order.shippingAddress.name}</p>
            <p style="margin: 4px 0; color: #c9c3b2;">${order.shippingAddress.address1}</p>
            ${order.shippingAddress.address2 ? `<p style="margin: 4px 0; color: #c9c3b2;">${order.shippingAddress.address2}</p>` : ''}
            ${order.shippingAddress.landmark ? `<p style="margin: 4px 0; color: #c9c3b2;">Landmark: ${order.shippingAddress.landmark}</p>` : ''}
            <p style="margin: 4px 0; color: #c9c3b2;">${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}</p>
            <p style="margin: 8px 0 4px 0; color: #c9c3b2;">📧 ${order.shippingAddress.email}</p>
            <p style="margin: 4px 0; color: #c9c3b2;">📱 ${order.shippingAddress.phone}</p>
          </div>

          <div style="text-align: center; margin-top: 20px;">
            <a href="https://luxurytribals.github.io/Luxury-Tribals/lt-manage-2026.html" 
               style="background: #c9a84c; color: #111; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
              View in Admin Panel →
            </a>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #2f2f2f;">
            <p style="color: #666; font-size: 12px;">Luxury Tribals · Wear the Ancient Soul</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Order notification email sent for ${order.orderId}`);
  } catch (error) {
    console.error('❌ Failed to send order notification email:', error.message);
    // Don't throw - email failure shouldn't break the order process
  }
}

module.exports = { sendOrderNotification };
