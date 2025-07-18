import jwt from 'jsonwebtoken';
import db from '../config/database.js';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // Get fresh user data from database
    db.get('SELECT * FROM users WHERE id = ?', [user.id], (err, dbUser) => {
      if (err || !dbUser) {
        return res.status(403).json({ error: 'User not found' });
      }

      req.user = {
        id: dbUser.id,
        username: dbUser.username,
        email: dbUser.email,
        displayName: dbUser.display_name,
        avatar: dbUser.avatar,
        role: dbUser.role
      };
      next();
    });
  });
};

export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      req.user = null;
    } else {
      // Get fresh user data from database
      db.get('SELECT * FROM users WHERE id = ?', [user.id], (err, dbUser) => {
        if (err || !dbUser) {
          req.user = null;
        } else {
          req.user = {
            id: dbUser.id,
            username: dbUser.username,
            email: dbUser.email,
            displayName: dbUser.display_name,
            avatar: dbUser.avatar,
            role: dbUser.role
          };
        }
        next();
      });
      return;
    }
    next();
  });
};