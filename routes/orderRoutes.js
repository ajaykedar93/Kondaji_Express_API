const express = require('express');
const router = express.Router();
const db = require('../db'); // PostgreSQL pool
const { io } = require('../index'); // ✅ Import socket.io instance

// Helper: check if product exists
async function productExists(client, id) {
  const res = await client.query('SELECT 1 FROM products WHERE id = $1', [id]);
  return res.rowCount > 0;
}

// 1. Create new order (user) with stock decrement logic
router.post('/create', async (req, res) => {
  const {
    userId,
    items,
    address,
    payment_method,
    total,
    discount_code,
    discount_amount,
    delivery_charge,
    payment_status,
    customer_notes,
  } = req.body;

  if (!userId || !items || !items.length || !address || !total) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // Lock rows and check stock
    for (const item of items) {
      const stockRes = await client.query(
        'SELECT stock_quantity FROM products WHERE id = $1 FOR UPDATE',
        [item.id]
      );

      if (stockRes.rows.length === 0) {
        throw new Error(`Product with id ${item.id} not found`);
      }

      const currentStock = stockRes.rows[0].stock_quantity;
      if (currentStock < item.quantity) {
        throw new Error(`Insufficient stock for product id ${item.id}`);
      }
    }

    // Insert order
    const orderRes = await client.query(
      `INSERT INTO orders (
        user_id, items, shipping_name, shipping_phone, shipping_street, shipping_city, shipping_state, shipping_pincode,
        payment_method, payment_type, payment_status, total, discount_code,
        discount_amount, delivery_charge, customer_notes, order_status
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'online',$10,$11,$12,$13,$14,$15,'Pending')
      RETURNING id`,
      [
        userId,
        JSON.stringify(items),
        address.name,
        address.phone,
        address.street,
        address.city,
        address.state,
        address.pincode,
        payment_method || 'online',
        payment_status || 'Unpaid',
        total,
        discount_code || null,
        discount_amount || 0,
        delivery_charge || 0,
        customer_notes || '',
      ]
    );

    const orderId = orderRes.rows[0].id;

    // Decrement stock
    for (const item of items) {
      await client.query(
        `UPDATE products
         SET stock_quantity = stock_quantity - $1,
             in_stock = CASE WHEN stock_quantity - $1 <= 0 THEN FALSE ELSE TRUE END
         WHERE id = $2`,
        [item.quantity, item.id]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({ message: 'Order placed successfully', orderId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Order creation error:', err);
    res.status(500).json({ error: err.message || 'Failed to place order' });
  } finally {
    client.release();
  }
});

// 2. Get all orders (admin)
router.get('/', async (req, res) => {
  try {
    const orders = await db.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(orders.rows);
  } catch (err) {
    console.error('Fetch all orders error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// 3. Get single order by ID
router.get('/:orderId', async (req, res) => {
  const { orderId } = req.params;
  try {
    const order = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    if (order.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json(order.rows[0]);
  } catch (err) {
    console.error('Fetch order error:', err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// 4. Get all orders by user ID
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const orders = await db.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(orders.rows);
  } catch (err) {
    console.error('Fetch user orders error:', err);
    res.status(500).json({ error: 'Failed to fetch user orders' });
  }
});

// 5. Admin updates order status, tracking, notes, etc.
router.patch('/update-status', async (req, res) => {
  const {
    orderId,
    newStatus,
    adminNotes,
    trackingId,
    courierName,
    estimatedDeliveryDate,
    deliveredAt,
    cancelledAt,
    isCancelled,
  } = req.body;

  try {
    const fields = [];
    const values = [];
    let idx = 1;

    if (newStatus !== undefined) {
      fields.push(`order_status = $${idx++}`);
      values.push(newStatus);
    }
    if (adminNotes !== undefined) {
      fields.push(`admin_notes = $${idx++}`);
      values.push(adminNotes);
    }
    if (trackingId !== undefined) {
      fields.push(`tracking_id = $${idx++}`);
      values.push(trackingId);
    }
    if (courierName !== undefined) {
      fields.push(`courier_name = $${idx++}`);
      values.push(courierName);
    }
    if (estimatedDeliveryDate !== undefined) {
      fields.push(`estimated_delivery_date = $${idx++}`);
      values.push(estimatedDeliveryDate);
    }
    if (deliveredAt !== undefined) {
      fields.push(`delivered_at = $${idx++}`);
      values.push(deliveredAt);
    }
    if (cancelledAt !== undefined) {
      fields.push(`cancelled_at = $${idx++}`);
      values.push(cancelledAt);
    }
    if (isCancelled !== undefined) {
      fields.push(`is_cancelled = $${idx++}`);
      values.push(isCancelled);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No update fields provided' });
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');

    const query = `
      UPDATE orders
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING *;
    `;
    values.push(orderId);

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const updatedOrder = result.rows[0];

    // ✅ Emit real-time delivery status update to the order room
    if (newStatus) {
      io.to(orderId.toString()).emit('delivery-status-update', newStatus);
    }

    res.json({ message: 'Order updated', order: updatedOrder });
  } catch (err) {
    console.error('Order update error:', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

module.exports = router;
