import express from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get user notifications
router.get('/', authenticateToken, (req, res) => {
  const { limit = 20, offset = 0, unreadOnly } = req.query;
  
  let query = `
    SELECT * FROM notifications 
    WHERE user_id = ?
  `;
  
  const params = [req.user.id];
  
  if (unreadOnly === 'true') {
    query += ' AND is_read = FALSE';
  }
  
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  db.all(query, params, (err, notifications) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }

    const formattedNotifications = notifications.map(notification => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      isRead: notification.is_read === 1,
      createdAt: notification.created_at,
      updatedAt: notification.updated_at,
      actionUrl: notification.action_url,
      userId: notification.user_id,
      metadata: notification.metadata ? JSON.parse(notification.metadata) : null
    }));

    res.json(formattedNotifications);
  });
});

// Get notification count
router.get('/count', authenticateToken, (req, res) => {
  db.all(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN is_read = FALSE THEN 1 END) as unread
    FROM notifications 
    WHERE user_id = ?
  `, [req.user.id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch notification count' });
    }
    
    res.json(result[0] || { total: 0, unread: 0 });
  });
});

// Mark notification as read
router.put('/:id/read', authenticateToken, (req, res) => {
  const notificationId = req.params.id;
  
  db.run(`
    UPDATE notifications 
    SET is_read = TRUE, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ? AND user_id = ?
  `, [notificationId, req.user.id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to mark notification as read' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ success: true, message: 'Notification marked as read' });
  });
});

// Mark all notifications as read
router.put('/mark-all-read', authenticateToken, (req, res) => {
  db.run(`
    UPDATE notifications 
    SET is_read = TRUE, updated_at = CURRENT_TIMESTAMP 
    WHERE user_id = ? AND is_read = FALSE
  `, [req.user.id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to mark notifications as read' });
    }
    
    res.json({ 
      success: true, 
      message: 'All notifications marked as read',
      updated: this.changes
    });
  });
});

// Delete notification
router.delete('/:id', authenticateToken, (req, res) => {
  const notificationId = req.params.id;
  
  db.run(`
    DELETE FROM notifications 
    WHERE id = ? AND user_id = ?
  `, [notificationId, req.user.id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete notification' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ success: true, message: 'Notification deleted' });
  });
});

// Create notification (admin/system use)
router.post('/', authenticateToken, [
  body('title').isLength({ min: 1 }).trim(),
  body('message').isLength({ min: 1 }).trim(),
  body('type').isIn(['info', 'success', 'warning', 'error']),
  body('userId').optional().isUUID(),
  body('actionUrl').optional().isString(),
  body('metadata').optional().isObject()
], (req, res) => {
  // Only allow admins or the system to create notifications
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, message, type, userId, actionUrl, metadata } = req.body;
  const notificationId = uuidv4();
  const targetUserId = userId || req.user.id;

  db.run(`
    INSERT INTO notifications (id, title, message, type, user_id, action_url, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    notificationId, 
    title, 
    message, 
    type, 
    targetUserId, 
    actionUrl, 
    metadata ? JSON.stringify(metadata) : null
  ], function(err) {
    if (err) {
      console.error('Failed to create notification:', err);
      return res.status(500).json({ error: 'Failed to create notification' });
    }

    const notification = {
      id: notificationId,
      title,
      message,
      type,
      isRead: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      actionUrl,
      userId: targetUserId,
      metadata
    };

    res.status(201).json(notification);
  });
});

export default router;