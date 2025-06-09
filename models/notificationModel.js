const db = require('../db');

// ✅ Create new notification
exports.createNotification = async (title, message, type = 'info') => {
  const result = await db.query(
    `INSERT INTO notifications (title, message, type) VALUES ($1, $2, $3) RETURNING *`,
    [title, message, type]
  );
  return result.rows[0];
};

// ✅ Get all notifications
exports.getAllNotifications = async () => {
  const result = await db.query('SELECT * FROM notifications ORDER BY created_at DESC');
  return result.rows;
};

// ✅ Mark as read
exports.markAsRead = async (id) => {
  const result = await db.query(
    'UPDATE notifications SET read = true WHERE id = $1 RETURNING *',
    [id]
  );
  return result.rows[0];
};

// ✅ Optional: Delete notification
exports.deleteNotification = async (id) => {
  await db.query('DELETE FROM notifications WHERE id = $1', [id]);
};
