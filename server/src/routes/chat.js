import express from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get chat messages
router.get('/messages', authenticateToken, (req, res) => {
  const { limit = 50, offset = 0, channel } = req.query;

  let query = `
    SELECT cm.*, u.display_name, u.avatar, u.username
    FROM chat_messages cm
    JOIN users u ON cm.author_id = u.id
  `;
  
  const params = [];

  if (channel) {
    query += ' WHERE cm.channel_id = ?';
    params.push(channel);
  }

  query += ' ORDER BY cm.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  db.all(query, params, (err, messages) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Get reactions for each message
    const messageIds = messages.map(m => m.id);
    if (messageIds.length === 0) {
      return res.json([]);
    }

    const reactionsQuery = `
      SELECT mr.message_id, mr.emoji, COUNT(*) as count,
             GROUP_CONCAT(u.username) as users
      FROM message_reactions mr
      JOIN users u ON mr.user_id = u.id
      WHERE mr.message_id IN (${messageIds.map(() => '?').join(',')})
      GROUP BY mr.message_id, mr.emoji
    `;

    db.all(reactionsQuery, messageIds, (err, reactions) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // Group reactions by message
      const reactionsByMessage = {};
      reactions.forEach(reaction => {
        if (!reactionsByMessage[reaction.message_id]) {
          reactionsByMessage[reaction.message_id] = [];
        }
        reactionsByMessage[reaction.message_id].push({
          emoji: reaction.emoji,
          count: reaction.count,
          users: reaction.users ? reaction.users.split(',') : []
        });
      });

      const formattedMessages = messages.map(message => ({
        id: message.id,
        content: message.content,
        authorId: message.author_id,
        author: {
          id: message.author_id,
          displayName: message.display_name,
          avatar: message.avatar,
          username: message.username
        },
        channelId: message.channel_id,
        replyToId: message.reply_to_id,
        createdAt: message.created_at,
        editedAt: message.edited_at,
        reactions: reactionsByMessage[message.id] || []
      })).reverse(); // Reverse to get chronological order

      res.json(formattedMessages);
    });
  });
});

// Send message
router.post('/messages', authenticateToken, [
  body('content').isLength({ min: 1 }).trim(),
  body('channelId').optional().isString(),
  body('replyToId').optional().isUUID()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { content, channelId, replyToId } = req.body;
  const messageId = uuidv4();

  db.run(`
    INSERT INTO chat_messages (id, content, author_id, channel_id, reply_to_id)
    VALUES (?, ?, ?, ?, ?)
  `, [messageId, content, req.user.id, channelId, replyToId], function(err) {
    if (err) {
      console.error('Chat message database error:', err);
      return res.status(500).json({ error: 'Failed to send message', details: err.message });
    }

    // Get the created message with author info
    const query = `
      SELECT cm.*, u.display_name, u.avatar, u.username
      FROM chat_messages cm
      JOIN users u ON cm.author_id = u.id
      WHERE cm.id = ?
    `;

    db.get(query, [messageId], (err, message) => {
      if (err || !message) {
        return res.status(500).json({ error: 'Failed to fetch created message' });
      }

      const formattedMessage = {
        id: message.id,
        content: message.content,
        authorId: message.author_id,
        author: {
          id: message.author_id,
          displayName: message.display_name,
          avatar: message.avatar,
          username: message.username
        },
        channelId: message.channel_id,
        replyToId: message.reply_to_id,
        createdAt: message.created_at,
        editedAt: message.edited_at,
        reactions: []
      };

      res.status(201).json(formattedMessage);
    });
  });
});

// Edit message
router.put('/messages/:id', authenticateToken, [
  body('content').isLength({ min: 1 }).trim()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const messageId = req.params.id;
  const { content } = req.body;

  // Check if user owns the message
  db.get('SELECT author_id FROM chat_messages WHERE id = ?', [messageId], (err, message) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Can only edit your own messages' });
    }

    db.run(`
      UPDATE chat_messages 
      SET content = ?, edited_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [content, messageId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to edit message' });
      }

      res.json({ success: true, message: 'Message updated successfully' });
    });
  });
});

// Delete message
router.delete('/messages/:id', authenticateToken, (req, res) => {
  const messageId = req.params.id;

  // Check if user owns the message or is admin
  db.get(`
    SELECT cm.author_id, u.role
    FROM chat_messages cm
    JOIN users u ON u.id = ?
    WHERE cm.id = ?
  `, [req.user.id, messageId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!result) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (result.author_id !== req.user.id && !['admin', 'moderator'].includes(result.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    db.run('DELETE FROM chat_messages WHERE id = ?', [messageId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete message' });
      }

      res.json({ success: true, message: 'Message deleted successfully' });
    });
  });
});

// Add reaction to message
router.post('/messages/:id/reactions', authenticateToken, [
  body('emoji').isLength({ min: 1, max: 10 }).trim()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const messageId = req.params.id;
  const { emoji } = req.body;
  const reactionId = uuidv4();

  // Check if message exists
  db.get('SELECT id FROM chat_messages WHERE id = ?', [messageId], (err, message) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    db.run(`
      INSERT INTO message_reactions (id, message_id, user_id, emoji)
      VALUES (?, ?, ?, ?)
    `, [reactionId, messageId, req.user.id, emoji], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'You have already reacted with this emoji' });
        }
        return res.status(500).json({ error: 'Failed to add reaction' });
      }

      res.status(201).json({ success: true, message: 'Reaction added successfully' });
    });
  });
});

// Remove reaction from message
router.delete('/messages/:id/reactions/:emoji', authenticateToken, (req, res) => {
  const messageId = req.params.id;
  const emoji = req.params.emoji;

  db.run(`
    DELETE FROM message_reactions 
    WHERE message_id = ? AND user_id = ? AND emoji = ?
  `, [messageId, req.user.id, emoji], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to remove reaction' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Reaction not found' });
    }

    res.json({ success: true, message: 'Reaction removed successfully' });
  });
});

export default router;