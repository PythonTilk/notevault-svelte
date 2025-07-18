import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Register
router.post('/register', [
  body('username').isLength({ min: 3 }).trim().escape(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('displayName').isLength({ min: 1 }).trim().escape()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password, displayName } = req.body;

  try {
    // Check if user already exists
    db.get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email], async (err, existingUser) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (existingUser) {
        return res.status(400).json({ error: 'Username or email already exists' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      const userId = uuidv4();
      const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

      // Create user
      db.run(`
        INSERT INTO users (id, username, email, password_hash, display_name, avatar)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [userId, username, email, passwordHash, displayName, avatar], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to create user' });
        }

        // Generate JWT token
        const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

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
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    db.get('SELECT * FROM users WHERE email = ? OR username = ?', [email, email], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      // Update last active
      db.run('UPDATE users SET last_active = CURRENT_TIMESTAMP, is_online = TRUE WHERE id = ?', [user.id]);

      // Generate JWT token
      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.display_name,
          avatar: user.avatar,
          role: user.role,
          createdAt: user.created_at,
          lastActive: user.last_active,
          isOnline: true
        }
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  db.get('SELECT * FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: 'User not found' });
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
  });
});

// Logout
router.post('/logout', authenticateToken, (req, res) => {
  // Update user online status
  db.run('UPDATE users SET is_online = FALSE WHERE id = ?', [req.user.id]);
  
  res.json({ success: true, message: 'Logged out successfully' });
});

// Update profile
router.put('/profile', authenticateToken, [
  body('displayName').optional().isLength({ min: 1 }).trim().escape(),
  body('avatar').optional().isURL()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
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
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  values.push(req.user.id);

  db.run(`UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values, function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    // Get updated user data
    db.get('SELECT * FROM users WHERE id = ?', [req.user.id], (err, user) => {
      if (err || !user) {
        return res.status(500).json({ error: 'Failed to fetch updated user' });
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
    });
  });
});

export default router;