import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';
import logger from '../utils/logger.js';

class NotificationService {
  constructor() {
    this.io = null; // Will be set by server.js
  }

  // Set the Socket.IO instance for real-time notifications
  setSocketIO(io) {
    this.io = io;
  }

  // Create a new notification
  async createNotification({
    userId,
    title,
    message,
    type = 'info',
    actionUrl = null,
    metadata = null
  }) {
    const notificationId = uuidv4();
    
    return new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO notifications (id, title, message, type, user_id, action_url, metadata, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [
        notificationId,
        title,
        message,
        type,
        userId,
        actionUrl,
        metadata ? JSON.stringify(metadata) : null
      ], function(err) {
        if (err) {
          logger.error('Failed to create notification:', err);
          reject(err);
          return;
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
          userId,
          metadata
        };

        // Send real-time notification via Socket.IO if available
        if (this.io) {
          this.io.emit('new-notification', notification);
        }

        logger.info(`Notification created for user ${userId}: ${title}`);
        resolve(notification);
      });
    });
  }

  // Create notifications for workspace events
  async notifyWorkspaceCreated(userId, workspaceName, workspaceId) {
    return this.createNotification({
      userId,
      title: 'Workspace Created',
      message: `Your workspace "${workspaceName}" has been created successfully.`,
      type: 'success',
      actionUrl: `/workspaces/${workspaceId}`
    });
  }

  async notifyWorkspaceMemberAdded(userId, workspaceName, memberName, workspaceId) {
    return this.createNotification({
      userId,
      title: 'New Team Member',
      message: `${memberName} has joined your workspace "${workspaceName}".`,
      type: 'info',
      actionUrl: `/workspaces/${workspaceId}`
    });
  }

  async notifyWorkspaceMemberRemoved(userId, workspaceName, memberName) {
    return this.createNotification({
      userId,
      title: 'Member Left Workspace',
      message: `${memberName} has left your workspace "${workspaceName}".`,
      type: 'info'
    });
  }

  // Create notifications for note events
  async notifyNoteShared(userId, noteTitle, sharedByName, workspaceId) {
    return this.createNotification({
      userId,
      title: 'Note Shared With You',
      message: `${sharedByName} shared the note "${noteTitle}" with you.`,
      type: 'info',
      actionUrl: `/workspaces/${workspaceId}`
    });
  }

  async notifyNoteCommented(userId, noteTitle, commenterName, workspaceId) {
    return this.createNotification({
      userId,
      title: 'New Comment',
      message: `${commenterName} commented on your note "${noteTitle}".`,
      type: 'info',
      actionUrl: `/workspaces/${workspaceId}`
    });
  }

  // Create notifications for meeting events
  async notifyMeetingScheduled(userId, meetingTitle, scheduledTime, meetingId) {
    return this.createNotification({
      userId,
      title: 'Meeting Scheduled',
      message: `A meeting "${meetingTitle}" has been scheduled for ${new Date(scheduledTime).toLocaleString()}.`,
      type: 'info',
      actionUrl: `/calendar?meeting=${meetingId}`
    });
  }

  async notifyMeetingReminder(userId, meetingTitle, meetingTime) {
    return this.createNotification({
      userId,
      title: 'Meeting Reminder',
      message: `Your meeting "${meetingTitle}" starts in 15 minutes.`,
      type: 'warning',
      actionUrl: '/calendar'
    });
  }

  // Create system notifications
  async notifySystemUpdate(userId, updateTitle, updateMessage) {
    return this.createNotification({
      userId,
      title: updateTitle,
      message: updateMessage,
      type: 'info'
    });
  }

  async notifySecurityAlert(userId, alertMessage) {
    return this.createNotification({
      userId,
      title: 'Security Alert',
      message: alertMessage,
      type: 'warning'
    });
  }

  // Broadcast notification to all users
  async broadcastToAllUsers(title, message, type = 'info', actionUrl = null) {
    return new Promise((resolve, reject) => {
      // Get all user IDs
      db.all('SELECT id FROM users', [], async (err, users) => {
        if (err) {
          reject(err);
          return;
        }

        const notifications = [];
        for (const user of users) {
          try {
            const notification = await this.createNotification({
              userId: user.id,
              title,
              message,
              type,
              actionUrl
            });
            notifications.push(notification);
          } catch (error) {
            logger.error(`Failed to create notification for user ${user.id}:`, error);
          }
        }

        resolve(notifications);
      });
    });
  }

  // Send announcement as notification to all users
  async notifyAnnouncementCreated(announcementId, title, content, priority = 'medium') {
    // Determine notification type based on announcement priority
    let notificationType = 'info';
    if (priority === 'urgent' || priority === 'high') {
      notificationType = 'warning';
    }

    const actionUrl = '/'; // Could link to announcements page

    return this.broadcastToAllUsers(
      `📢 ${title}`,
      content.length > 150 ? content.substring(0, 147) + '...' : content,
      notificationType,
      actionUrl
    );
  }

  // Clean up old notifications (called periodically)
  async cleanupOldNotifications(daysOld = 30) {
    return new Promise((resolve, reject) => {
      db.run(`
        DELETE FROM notifications 
        WHERE created_at < datetime('now', '-${daysOld} days')
        AND is_read = 1
      `, [], function(err) {
        if (err) {
          reject(err);
          return;
        }
        
        logger.info(`Cleaned up ${this.changes} old notifications`);
        resolve(this.changes);
      });
    });
  }

  // Get notification statistics
  async getNotificationStats(userId) {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN is_read = 0 THEN 1 END) as unread,
          COUNT(CASE WHEN created_at > datetime('now', '-24 hours') THEN 1 END) as recent
        FROM notifications 
        WHERE user_id = ?
      `, [userId], (err, stats) => {
        if (err) {
          reject(err);
          return;
        }
        
        resolve(stats || { total: 0, unread: 0, recent: 0 });
      });
    });
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;