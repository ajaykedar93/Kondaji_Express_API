const pool = require('../db');  // PostgreSQL DB connection

// Utility to get current date and delivery date (e.g., +3 to +4 days)
const getDateInfo = () => {
  const today = new Date();
  const deliveryDate = new Date();
  // Randomly set delivery to 3 or 4 days ahead
  deliveryDate.setDate(today.getDate() + Math.floor(Math.random() * 2) + 3); // +3 or +4 days

  return {
    orderDate: today.toISOString().split('T')[0], // 'YYYY-MM-DD'
    estimatedDelivery: deliveryDate.toISOString().split('T')[0]
  };
};

// Place a new order
const placeOrder = async (orderData) => {
  const { user_id, items, address, payment_method, total, status = 'Pending' } = orderData;

  const { orderDate, estimatedDelivery } = getDateInfo();

  const result = await pool.query(
    `INSERT INTO orders (
      user_id, items, address, payment_method, total, status, order_date, estimated_delivery_date
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, user_id, items, address, payment_method, total, status, created_at, order_date, estimated_delivery_date`,
    [
      user_id,
      JSON.stringify(items),
      address,
      payment_method,
      total,
      status,
      orderDate,
      estimatedDelivery
    ]
  );

  return result.rows[0];  // Return the newly created order with full details
};

// Get all orders of a specific user
const getUserOrders = async (userId) => {
  const result = await pool.query(
    `SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;  // Return all orders for the user
};

// Get order by order ID
const getOrderById = async (orderId) => {
  const result = await pool.query(
    `SELECT * FROM orders WHERE id = $1`,
    [orderId]
  );
  return result.rows.length > 0 ? result.rows[0] : null;  // If order exists, return it; otherwise, return null
};

// Update order status (admin or cancel)
const updateOrderStatus = async (orderId, status) => {
  const result = await pool.query(
    `UPDATE orders SET status = $1 WHERE id = $2 RETURNING *`,
    [status, orderId]
  );
  return result.rows[0];  // Return the updated order details
};

module.exports = {
  placeOrder,
  getUserOrders,
  getOrderById,
  updateOrderStatus
};
