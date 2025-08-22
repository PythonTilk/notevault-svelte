import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { 
  DatabaseWrapper, 
  asyncHandler, 
  ValidationError, 
  AuthenticationError, 
  ConflictError, 
  NotFoundError 
} from '../utils/errorHandler.js';
import { SECURITY_EVENTS, logSecurityEvent } from '../utils/logger.js';

const router = express.Router();
const dbWrapper = new DatabaseWrapper(db);

// Register
router.post('/register', [
  body('username').isLength({ min: 3 }).trim().escape(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('displayName').isLength({ min: 1 }).trim().escape()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { username, email, password, displayName } = req.body;

  // Check if user already exists
  const existingUser = await dbWrapper.get(
    'SELECT id FROM users WHERE username = ? OR email = ?', 
    [username, email]
  );

  if (existingUser) {
    throw new ConflictError('Username or email already exists');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);
  const userId = uuidv4();
  const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

  // Create user
  await dbWrapper.run(`
    INSERT INTO users (id, username, email, password_hash, display_name, avatar)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [userId, username, email, passwordHash, displayName, avatar]);

  // Generate JWT token
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

  // Log successful account creation
  await logSecurityEvent(SECURITY_EVENTS.ACCOUNT_CREATED, {
    userId,
    username,
    email,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(201).json({
    success: true,
    token,
    user: {
      id: userId,
      username,
      email,
      displayName,
      avatar,
      role: 'user'
    }
  });
}));

// Login
router.post('/login', [
  body('identifier').exists().trim(),
  body('password').exists()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { identifier, password } = req.body;

  // Get user by email or username
  const user = await dbWrapper.get(
    'SELECT * FROM users WHERE email = ? OR username = ?', 
    [identifier, identifier]
  );

  if (!user) {
    // Log failed login attempt
    await logSecurityEvent(SECURITY_EVENTS.LOGIN_FAILURE, {
      identifier,
      reason: 'User not found',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    throw new AuthenticationError('Invalid credentials');
  }

  // Check password
  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    // Log failed password attempt
    await logSecurityEvent(SECURITY_EVENTS.LOGIN_FAILURE, {
      userId: user.id,
      username: user.username,
      email: user.email,
      reason: 'Invalid password',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    throw new AuthenticationError('Invalid credentials');
  }

  // Update last active
  await dbWrapper.run(
    'UPDATE users SET last_active = CURRENT_TIMESTAMP, is_online = TRUE WHERE id = ?', 
    [user.id]
  );

  // Generate JWT token
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

  // Log successful login
  await logSecurityEvent(SECURITY_EVENTS.LOGIN_SUCCESS, {
    userId: user.id,
    username: user.username,
    email: user.email,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    forcePasswordChange: user.force_password_change === 1
  });

  res.json({
    success: true,
    token,
    forcePasswordChange: user.force_password_change === 1,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.display_name,
      avatar: user.avatar,
      role: user.role,
      createdAt: user.created_at,
      lastActive: user.last_active,
      isOnline: true,
      forcePasswordChange: user.force_password_change === 1
    }
  });
}));

// Get current user
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  const user = await dbWrapper.get('SELECT * FROM users WHERE id = ?', [req.user.id]);

  if (!user) {
    throw new NotFoundError('User');
  }

  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.display_name,
    avatar: user.avatar,
    role: user.role,
    createdAt: user.created_at,
    lastActive: user.last_active,
    isOnline: user.is_online,
    forcePasswordChange: user.force_password_change === 1
  });
}));

// Logout
router.post('/logout', authenticateToken, asyncHandler(async (req, res) => {
  // Update user online status
  await dbWrapper.run('UPDATE users SET is_online = FALSE WHERE id = ?', [req.user.id]);
  
  // Log logout
  await logSecurityEvent(SECURITY_EVENTS.LOGOUT, {
    userId: req.user.id,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.json({ success: true, message: 'Logged out successfully' });
}));

// Update profile
router.put('/profile', authenticateToken, [
  body('displayName').optional().isLength({ min: 1 }).trim().escape(),
  body('avatar').optional().isURL()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { displayName, avatar } = req.body;
  const updates = [];
  const values = [];

  if (displayName) {
    updates.push('display_name = ?');
    values.push(displayName);
  }

  if (avatar) {
    updates.push('avatar = ?');
    values.push(avatar);
  }

  if (updates.length === 0) {
    throw new ValidationError('No valid fields to update');
  }

  values.push(req.user.id);

  // Update user profile
  await dbWrapper.run(
    `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, 
    values
  );

  // Get updated user data
  const user = await dbWrapper.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
  
  if (!user) {
    throw new NotFoundError('User');
  }

  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.display_name,
    avatar: user.avatar,
    role: user.role,
    createdAt: user.created_at,
    lastActive: user.last_active,
    isOnline: user.is_online
  });
}));

// Change password
router.post('/change-password', authenticateToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  console.log(`Change password request for user: ${req.user.id}`);
  
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  // Get current user data
  db.get('SELECT * FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) {
      console.error('Database error getting user:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // For forced password changes, skip current password check for default accounts
    let skipCurrentPasswordCheck = false;
    if (user.force_password_change === 1 && 
        (user.username === 'admin' || user.username === 'demo')) {
      skipCurrentPasswordCheck = true;
      console.log(`Allowing password change without current password for: ${user.username}`);
    }

    // Function to continue with password change
    const changePassword = async () => {
      try {
        // Hash new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // Update password and clear force_password_change flag
        db.run(`
          UPDATE users 
          SET password_hash = ?, force_password_change = 0, last_active = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [hashedNewPassword, req.user.id], (err) => {
          if (err) {
            console.error('Error updating password:', err);
            return res.status(500).json({ error: 'Failed to update password' });
          }

          console.log(`Password changed for user: ${user.username} (${user.id})`);
          res.json({ 
            success: true, 
            message: 'Password updated successfully',
            forcePasswordChange: false
          });
        });
      } catch (error) {
        console.error('Password hashing error:', error);
        res.status(500).json({ error: 'Password hashing failed' });
      }
    };

    // Verify current password (unless skipping for forced change)
    if (!skipCurrentPasswordCheck) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required' });
      }
      
      bcrypt.compare(currentPassword, user.password_hash, (err, passwordMatch) => {
        if (err) {
          console.error('Password comparison error:', err);
          return res.status(500).json({ error: 'Password verification failed' });
        }
        
        if (!passwordMatch) {
          return res.status(400).json({ error: 'Current password is incorrect' });
        }
        
        changePassword();
      });
    } else {
      changePassword();
    }
  });
});

// Update notification settings
router.put('/notification-settings', authenticateToken, [
  body('emailNotifications').optional().isBoolean(),
  body('pushNotifications').optional().isBoolean(),
  body('workspaceInvites').optional().isBoolean(),
  body('chatMentions').optional().isBoolean()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { emailNotifications, pushNotifications, workspaceInvites, chatMentions } = req.body;
  const updates = [];
  const values = [];

  if (emailNotifications !== undefined) {
    updates.push('email_notifications = ?');
    values.push(emailNotifications ? 1 : 0);
  }
  if (pushNotifications !== undefined) {
    updates.push('push_notifications = ?');
    values.push(pushNotifications ? 1 : 0);
  }
  if (workspaceInvites !== undefined) {
    updates.push('workspace_invites = ?');
    values.push(workspaceInvites ? 1 : 0);
  }
  if (chatMentions !== undefined) {
    updates.push('chat_mentions = ?');
    values.push(chatMentions ? 1 : 0);
  }

  if (updates.length === 0) {
    throw new ValidationError('No valid notification settings to update');
  }

  values.push(req.user.id);

  await dbWrapper.run(
    `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    values
  );

  res.json({ success: true, message: 'Notification settings updated successfully' });
}));

// Update preferences
router.put('/preferences', authenticateToken, [
  body('theme').optional().isIn(['dark', 'light', 'auto']),
  body('language').optional().isIn(['en', 'es', 'fr', 'de'])
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { theme, language } = req.body;
  const updates = [];
  const values = [];

  if (theme) {
    updates.push('theme = ?');
    values.push(theme);
  }
  if (language) {
    updates.push('language = ?');
    values.push(language);
  }

  if (updates.length === 0) {
    throw new ValidationError('No valid preferences to update');
  }

  values.push(req.user.id);

  await dbWrapper.run(
    `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    values
  );

  res.json({ success: true, message: 'Preferences updated successfully' });
}));

// Export user data
router.get('/export-data', authenticateToken, asyncHandler(async (req, res) => {
  // Get user data
  const user = await dbWrapper.get(
    'SELECT id, username, email, display_name, avatar, role, created_at, last_active FROM users WHERE id = ?',
    [req.user.id]
  );

  // Get user's workspaces
  const workspaces = await dbWrapper.query(`
    SELECT w.id, w.name, w.description, w.color, w.created_at, w.updated_at, w.is_public,
           CASE WHEN w.owner_id = ? THEN 'owner' ELSE wm.role END as role
    FROM workspaces w
    LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = ?
    WHERE w.owner_id = ? OR wm.user_id = ?
  `, [req.user.id, req.user.id, req.user.id, req.user.id]);

  // Get user's notes
  const notes = await dbWrapper.query(`
    SELECT n.id, n.title, n.content, n.type, n.color, n.position, n.size, n.tags, 
           n.created_at, n.updated_at, n.is_public, w.name as workspace_name
    FROM notes n
    JOIN workspaces w ON n.workspace_id = w.id
    WHERE n.author_id = ?
    ORDER BY n.created_at DESC
  `, [req.user.id]);

  // Get user's files
  const files = await dbWrapper.query(`
    SELECT f.id, f.filename, f.original_name, f.mime_type, f.size, f.created_at, 
           w.name as workspace_name
    FROM files f
    LEFT JOIN workspaces w ON f.workspace_id = w.id
    WHERE f.uploaded_by = ?
    ORDER BY f.created_at DESC
  `, [req.user.id]);

  const exportData = {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.display_name,
      avatar: user.avatar,
      role: user.role,
      createdAt: user.created_at,
      lastActive: user.last_active
    },
    workspaces,
    notes,
    files,
    exportDate: new Date().toISOString(),
    exportVersion: '1.0'
  };

  res.json(exportData);
}));

// Delete account
router.delete('/delete-account', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Log account deletion attempt
  await logSecurityEvent(SECURITY_EVENTS.ACCOUNT_DELETED, {
    userId,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Delete user account and related data
  // Note: This will cascade delete due to foreign key constraints
  await dbWrapper.run('DELETE FROM users WHERE id = ?', [userId]);

  res.json({ success: true, message: 'Account deleted successfully' });
}));

// Get current user profile with all settings
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  const user = await dbWrapper.get(`
    SELECT 
      id, username, email, display_name, avatar, role, 
      email_notifications, push_notifications, workspace_invites, chat_mentions,
      theme, language, created_at, last_active
    FROM users 
    WHERE id = ?
  `, [req.user.id]);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.display_name,
    avatar: user.avatar,
    role: user.role,
    emailNotifications: !!user.email_notifications,
    pushNotifications: !!user.push_notifications,
    workspaceInvites: !!user.workspace_invites,
    chatMentions: !!user.chat_mentions,
    theme: user.theme || 'dark',
    language: user.language || 'en',
    createdAt: user.created_at,
    lastActive: user.last_active
  });
}));

// Test endpoint to debug auth middleware
router.get('/test-auth', authenticateToken, asyncHandler(async (req, res) => {
  res.json({ 
    message: 'Auth working', 
    user: req.user,
    timestamp: new Date().toISOString()
  });
}));

export default router;