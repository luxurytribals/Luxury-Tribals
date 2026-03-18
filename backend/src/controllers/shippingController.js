const Order = require('../models/Order');

let shiprocketToken = null;
let shiprocketTokenAt = null;

async function getShiprocketToken() {
  const maxAge = 9 * 24 * 60 * 60 * 1000;
  if (shiprocketToken && Date.now() - shiprocketTokenAt < maxAge) return shiprocketToken;

  const res = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.SHIPROCKET_EMAIL, password: process.env.SHIPROCKET_PASSWORD }),
  });
  const data = await res.json();
  shiprocketToken = data.token;
  shiprocketTokenAt = Date.now();
  return shiprocketToken;
}

async function shiprocketRequest(path, body) {
  const token = await getShiprocketToken();
  const res = await fetch(`https://apiv2.shiprocket.in/v1/external${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return res.json();
}

exports.createShiprocketShipment = async function createShiprocketShipment(orderDoc) {
  const create = await shiprocketRequest('/orders/create/adhoc', {
    order_id: orderDoc.orderId,
    order_date: new Date().toISOString().slice(0, 10),
    pickup_location: process.env.STORE_NAME || 'Primary',
    billing_customer_name: orderDoc.shippingAddress.name,
    billing_last_name: '',
    billing_address: orderDoc.shippingAddress.address1,
    billing_address_2: orderDoc.shippingAddress.address2 || '',
    billing_city: orderDoc.shippingAddress.city,
    billing_pincode: orderDoc.shippingAddress.pincode,
    billing_state: orderDoc.shippingAddress.state,
    billing_country: 'India',
    billing_email: orderDoc.shippingAddress.email,
    billing_phone: orderDoc.shippingAddress.phone,
    shipping_is_billing: true,
    order_items: orderDoc.items.map((i) => ({ name: i.name, sku: i.name, units: i.qty, selling_price: i.price })),
    payment_method: 'Prepaid',
    sub_total: orderDoc.amount,
    length: 25, breadth: 20, height: 3, weight: 0.3,
  });

  const shipmentId = create?.shipment_id || create?.shipment_details?.shipment_id;
  const assign = await shiprocketRequest('/courier/assign/awb', { shipment_id: shipmentId, courier_id: '' });
  await shiprocketRequest('/courier/generate/pickup', { shipment_id: [shipmentId] });

  orderDoc.shiprocketOrderId = String(shipmentId || '');
  orderDoc.awb = String(assign?.response?.data?.awb_code || assign?.awb_code || '');
  orderDoc.courierName = assign?.response?.data?.courier_name || 'Auto Assigned Courier';
  orderDoc.trackingUrl = assign?.response?.data?.tracking_url || '';
  orderDoc.etaDate = new Date(Date.now() + 6 * 86400000);
  orderDoc.status = 'shipped';
  orderDoc.statusHistory.push({ status: 'shipped', note: 'AWB generated via Shiprocket' });
  await orderDoc.save();
  return orderDoc;
};

exports.trackAwb = async (req, res) => {
  const order = await Order.findOne({ awb: req.params.awb });
  if (!order) return res.status(404).json({ message: 'AWB not found' });
  res.json({ awb: order.awb, courierName: order.courierName, status: order.status, trackingUrl: order.trackingUrl, etaDate: order.etaDate });
};
