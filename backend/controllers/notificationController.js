const pool = require('../config/db');

async function createNotification(clientOrPool, {
  userId,
  title,
  message,
  type = 'general',
  relatedBookingId = null,
  relatedRoomId = null,
  relatedConversationId = null,
}) {
  if (!userId || !title || !message) return null;
  const executor = clientOrPool || pool;
  const result = await executor.query(
    `INSERT INTO notifications (user_id, title, message, type, related_booking_id, related_room_id, related_conversation_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [userId, title, message, type, relatedBookingId, relatedRoomId, relatedConversationId]
  );
  return result.rows[0];
}

async function listNotifications(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT id, user_id, title, message, type, related_booking_id, related_room_id, related_conversation_id, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 80`,
      [req.user.id]
    );
    return res.json({ notifications: result.rows });
  } catch (error) {
    return next(error);
  }
}

async function getUnreadCount(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT COUNT(*)::INTEGER AS unread_count FROM notifications WHERE user_id = $1 AND is_read = false`,
      [req.user.id]
    );
    return res.json({ unreadCount: result.rows[0]?.unread_count || 0 });
  } catch (error) {
    return next(error);
  }
}

async function markNotificationRead(req, res, next) {
  try {
    const notificationId = Number(req.params.id);
    if (!Number.isInteger(notificationId)) return res.status(400).json({ error: 'A valid notification ID is required' });
    const result = await pool.query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *`,
      [notificationId, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Notification not found' });
    return res.json({ message: 'Notification marked as read', notification: result.rows[0] });
  } catch (error) {
    return next(error);
  }
}

async function markAllNotificationsRead(req, res, next) {
  try {
    await pool.query(`UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`, [req.user.id]);
    return res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    return next(error);
  }
}

module.exports = { createNotification, listNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead };
