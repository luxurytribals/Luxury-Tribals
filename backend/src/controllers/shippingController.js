const Order = require('../models/Order');

let shiprocketToken = null;
let shiprocketTokenAt = null;

/**
 * Get Shiprocket authentication token (with caching)
 * Token is valid for 10 days, we refresh at 8 days for safety
 */
async function getShiprocketToken() {
  // Changed from 9 days to 8 days for safety margin
  const maxAge = 8 * 24 * 60 * 60 * 1000; // 8 days in milliseconds
  
  if (shiprocketToken && Date.now() - shiprocketTokenAt < maxAge) {
    return shiprocketToken;
  }

  try {
    const res = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: process.env.SHIPROCKET_EMAIL, 
        password: process.env.SHIPROCKET_PASSWORD 
      }),
    });

    if (!res.ok) {
      throw new Error(`Shiprocket auth failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    
    if (!data.token) {
      throw new Error('No token received from Shiprocket');
    }

    shiprocketToken = data.token;
    shiprocketTokenAt = Date.now();
    console.log('✅ Shiprocket token refreshed');
    
    return shiprocketToken;
  } catch (error) {
    console.error('❌ Shiprocket authentication failed:', error.message);
    throw error;
  }
}

/**
 * Make authenticated request to Shiprocket API
 */
async function shiprocketRequest(path, body) {
  const token = await getShiprocketToken();
  
  try {
    const res = await fetch(`https://apiv2.shiprocket.in/v1/external${path}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Shiprocket API error: ${res.status} - ${errorText}`);
    }

    return res.json();
  } catch (error) {
    console.error('❌ Shiprocket request failed:', error.message);
    throw error;
  }
}

/**
 * Create shipment in Shiprocket and generate AWB
 */
exports.createShiprocketShipment = async function createShiprocketShipment(orderDoc) {
  try {
    console.log(`📦 Creating Shiprocket shipment for order: ${orderDoc.orderId}`);

    // Calculate total weight from order items
    const totalWeight = orderDoc.items.reduce((sum, item) => {
      return sum + (item.qty * 0.3); // Assuming 0.3 kg per item
    }, 0);

    // Step 1: Create order in Shiprocket
    const createPayload = {
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
      order_items: orderDoc.items.map((i) => ({ 
        name: i.name, 
        sku: i.name, 
        units: i.qty, 
        selling_price: i.price 
      })),
      payment_method: 'Prepaid',
      sub_total: orderDoc.amount,
      length: 25, 
      breadth: 20, 
      height: 3, 
      weight: Math.max(0.3, totalWeight) // Minimum 0.3 kg
    };

    const create = await shiprocketRequest('/orders/create/adhoc', createPayload);
    
    const shipmentId = create?.shipment_id || create?.shipment_details?.shipment_id;
    
    if (!shipmentId) {
      throw new Error('No shipment ID received from Shiprocket. Response: ' + JSON.stringify(create));
    }

    console.log(`   ✓ Shiprocket shipment created: ${shipmentId}`);

    // Step 2: Auto-assign courier and get AWB
    const assign = await shiprocketRequest('/courier/assign/awb', { 
      shipment_id: shipmentId, 
      courier_id: '' // Empty = auto-assign
    });

    const awb = String(assign?.response?.data?.awb_code || assign?.awb_code || '');
    
    if (!awb) {
      console.warn('⚠️  No AWB received, shipment created but courier not assigned yet');
    } else {
      console.log(`   ✓ AWB generated: ${awb}`);
    }

    // Step 3: Generate pickup request
    await shiprocketRequest('/courier/generate/pickup', { 
      shipment_id: [shipmentId] 
    });
    console.log(`   ✓ Pickup request generated`);

    // Update order document
    orderDoc.shiprocketOrderId = String(shipmentId);
    orderDoc.awb = awb;
    orderDoc.courierName = assign?.response?.data?.courier_name || 'Auto Assigned Courier';
    orderDoc.trackingUrl = assign?.response?.data?.tracking_url || '';
    orderDoc.etaDate = new Date(Date.now() + 6 * 86400000); // 6 days from now
    orderDoc.status = 'shipped';
    orderDoc.statusHistory.push({ 
      status: 'shipped', 
      note: 'AWB generated via Shiprocket' 
    });
    
    await orderDoc.save();
    
    console.log(`✅ Shipment created successfully for ${orderDoc.orderId}`);
    return orderDoc;

  } catch (error) {
    console.error(`❌ Shiprocket shipment creation failed for ${orderDoc.orderId}:`, error.message);
    
    // Update order status to processing (not shipped)
    orderDoc.statusHistory.push({ 
      status: 'processing', 
      note: `Shiprocket error: ${error.message}. Manual intervention required.` 
    });
    orderDoc.status = 'processing';
    await orderDoc.save();
    
    // Re-throw error so calling code knows it failed
    throw error;
  }
};

/**
 * Track shipment by AWB number
 */
exports.trackAwb = async (req, res) => {
  try {
    const order = await Order.findOne({ awb: req.params.awb });
    
    if (!order) {
      return res.status(404).json({ message: 'AWB not found' });
    }

    res.json({ 
      awb: order.awb, 
      courierName: order.courierName, 
      status: order.status, 
      trackingUrl: order.trackingUrl, 
      etaDate: order.etaDate,
      orderId: order.orderId
    });
  } catch (error) {
    console.error('❌ Track AWB error:', error.message);
    res.status(500).json({ message: 'Failed to track AWB' });
  }
};
