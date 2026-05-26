const pool = require('../config/db');
const { createNotification } = require('./notificationController');

async function getConversationAccess(client, conversationId, userId) {
  const result = await client.query(
    `SELECT c.*, r.title AS room_title, COALESCE(r.documentation_urls[1], '') AS main_photo_url,
            s.name AS student_name, p.name AS provider_name
     FROM conversations c
     JOIN rooms r ON r.id = c.room_id
     JOIN users s ON s.id = c.student_id
     JOIN users p ON p.id = c.provider_id
     WHERE c.id = $1 AND ($2 IN (c.student_id, c.provider_id))`,
    [conversationId, userId]
  );
  return result.rows[0] || null;
}

async function listConversations(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT c.id, c.room_id, c.student_id, c.provider_id, c.created_at, c.updated_at,
              r.title AS room_title, r.location AS room_location, COALESCE(r.documentation_urls[1], '') AS main_photo_url,
              s.name AS student_name, s.email AS student_email, COALESCE(s.profile_image_url, '') AS student_profile_image_url,
              p.name AS provider_name, p.email AS provider_email, COALESCE(p.profile_image_url, '') AS provider_profile_image_url,
              latest.body AS last_message, latest.created_at AS last_message_at, latest.sender_id AS last_sender_id,
              COALESCE(unread.unread_count, 0) AS unread_count
       FROM conversations c
       JOIN rooms r ON r.id = c.room_id
       JOIN users s ON s.id = c.student_id
       JOIN users p ON p.id = c.provider_id
       LEFT JOIN LATERAL (
         SELECT m.body, m.created_at, m.sender_id FROM messages m
         WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1
       ) latest ON TRUE
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::INTEGER AS unread_count FROM messages m
         WHERE m.conversation_id = c.id AND m.sender_id <> $1 AND m.is_read = false
       ) unread ON TRUE
       WHERE $1 IN (c.student_id, c.provider_id)
       ORDER BY COALESCE(latest.created_at, c.updated_at) DESC`,
      [req.user.id]
    );
    return res.json({ conversations: result.rows });
  } catch (error) {
    return next(error);
  }
}

async function createOrOpenConversation(req, res, next) {
  const client = await pool.connect();
  try {
    const roomId = Number(req.body.roomId || req.body.room_id);
    const firstMessage = String(req.body.message || req.body.body || '').trim();
    if (!Number.isInteger(roomId)) return res.status(400).json({ error: 'A valid room ID is required' });

    await client.query('BEGIN');
    const roomResult = await client.query(`SELECT id, provider_id, title FROM rooms WHERE id = $1`, [roomId]);
    if (roomResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Room not found' });
    }
    const room = roomResult.rows[0];
    if (req.user.role !== 'student') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Only students can start a chat from a room listing' });
    }
    if (room.provider_id === req.user.id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Providers cannot start a student chat for their own room' });
    }

    const conversationResult = await client.query(
      `INSERT INTO conversations (room_id, student_id, provider_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (room_id, student_id, provider_id)
       DO UPDATE SET updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [roomId, req.user.id, room.provider_id]
    );
    const conversation = conversationResult.rows[0];

    if (firstMessage) {
      await client.query(`INSERT INTO messages (conversation_id, sender_id, body) VALUES ($1, $2, $3)`, [conversation.id, req.user.id, firstMessage]);
      await createNotification(client, {
        userId: room.provider_id,
        title: 'New Message',
        message: `${req.user.name || 'A student'} sent a message about ${room.title}`,
        type: 'message',
        relatedRoomId: room.id,
        relatedConversationId: conversation.id,
      });
    }

    await client.query('COMMIT');
    return res.status(201).json({ message: 'Conversation ready', conversation });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
}

async function listMessages(req, res, next) {
  const client = await pool.connect();
  try {
    const conversationId = Number(req.params.id);
    if (!Number.isInteger(conversationId)) return res.status(400).json({ error: 'A valid conversation ID is required' });
    const conversation = await getConversationAccess(client, conversationId, req.user.id);
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    await client.query(`UPDATE messages SET is_read = true WHERE conversation_id = $1 AND sender_id <> $2 AND is_read = false`, [conversationId, req.user.id]);
    const result = await client.query(
      `SELECT m.id, m.conversation_id, m.sender_id, m.body, m.is_read, m.created_at,
              u.name AS sender_name, u.role AS sender_role, COALESCE(u.profile_image_url, '') AS sender_profile_image_url
       FROM messages m JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = $1 ORDER BY m.created_at ASC`,
      [conversationId]
    );
    return res.json({ conversation, messages: result.rows });
  } catch (error) {
    return next(error);
  } finally {
    client.release();
  }
}

async function sendMessage(req, res, next) {
  const client = await pool.connect();
  try {
    const conversationId = Number(req.params.id);
    const body = String(req.body.body || req.body.message || '').trim();
    if (!Number.isInteger(conversationId)) return res.status(400).json({ error: 'A valid conversation ID is required' });
    if (!body) return res.status(400).json({ error: 'Message cannot be empty' });

    await client.query('BEGIN');
    const conversation = await getConversationAccess(client, conversationId, req.user.id);
    if (!conversation) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Conversation not found' });
    }
    const messageResult = await client.query(
      `INSERT INTO messages (conversation_id, sender_id, body) VALUES ($1, $2, $3) RETURNING *`,
      [conversationId, req.user.id, body]
    );
    await client.query(`UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [conversationId]);
    const recipientId = req.user.id === conversation.student_id ? conversation.provider_id : conversation.student_id;
    await createNotification(client, {
      userId: recipientId,
      title: 'New Message',
      message: `${req.user.name || 'Someone'} replied about ${conversation.room_title}`,
      type: 'message',
      relatedRoomId: conversation.room_id,
      relatedConversationId: conversation.id,
    });
    await client.query('COMMIT');
    return res.status(201).json({ message: messageResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
}

async function markConversationRead(req, res, next) {
  const client = await pool.connect();
  try {
    const conversationId = Number(req.params.id);
    if (!Number.isInteger(conversationId)) return res.status(400).json({ error: 'A valid conversation ID is required' });
    const conversation = await getConversationAccess(client, conversationId, req.user.id);
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    await client.query(`UPDATE messages SET is_read = true WHERE conversation_id = $1 AND sender_id <> $2`, [conversationId, req.user.id]);
    return res.json({ message: 'Conversation marked as read' });
  } catch (error) {
    return next(error);
  } finally {
    client.release();
  }
}

module.exports = { listConversations, createOrOpenConversation, listMessages, sendMessage, markConversationRead };
