import session from 'express-session';
import RedisStore from 'connect-redis';
import { createClient } from 'redis';
import crypto from 'crypto';

// Initialize Redis client (optional - falls back to memory store)
let redisClient = null;
let redisStore = null;

const initializeRedis = async () => {
  if (process.env.REDIS_URL || process.env.REDIS_HOST) {
    try {
      const redisConfig = process.env.REDIS_URL ? 
        { url: process.env.REDIS_URL } : 
        {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD
        };

      redisClient = createClient(redisConfig);
      
      redisClient.on('error', (err) => {
        console.error('Redis connection error:', err);
        redisClient = null;
        redisStore = null;
      });

      redisClient.on('connect', () => {
        console.log('Connected to Redis for session storage');
      });

      await redisClient.connect();
      redisStore = new RedisStore({ client: redisClient });
    } catch (error) {
      console.warn('Failed to connect to Redis, falling back to memory store:', error.message);
      redisClient = null;
      redisStore = null;
    }
  }
};

// Initialize Redis connection
await initializeRedis();

// Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
  name: 'notevault.sid',
  resave: false,
  saveUninitialized: false,
  store: redisStore, // Will be null if Redis is not available, Express will use memory store
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS attacks
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict' // CSRF protection
  },
  rolling: true // Reset expiry on activity
};

// Warn if using memory store in production
if (!redisStore && process.env.NODE_ENV === 'production') {
  console.warn('⚠️  WARNING: Using memory store for sessions in production. Consider using Redis for scalability.');
}

export const sessionMiddleware = session(sessionConfig);

// Session-based authentication middleware
export const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'UNAUTHORIZED'
    });
  }
  next();
};

// Role-based authorization middleware
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    if (!roles.includes(req.session.userRole)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN'
      });
    }

    next();
  };
};

// Admin authorization middleware
export const requireAdmin = requireRole(['admin']);

// Moderator or admin authorization middleware
export const requireModerator = requireRole(['admin', 'moderator']);

// Session cleanup utility (for graceful shutdown)
export const cleanupSessions = async () => {
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log('Redis session store disconnected');
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    }
  }
};

// Session activity tracking
export const trackActivity = (req, res, next) => {
  if (req.session && req.session.userId) {
    req.session.lastActivity = new Date().toISOString();
    
    // Update user's last_active timestamp in database
    // This would need to be imported from your database module
    // db.run('UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?', [req.session.userId]);
  }
  next();
};

// Generate CSRF token for session
export const generateCSRFToken = (req, res, next) => {
  if (req.session && !req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  next();
};

// Provide CSRF token endpoint
export const csrfTokenEndpoint = (req, res) => {
  if (!req.session) {
    return res.status(500).json({ error: 'Session not initialized' });
  }

  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }

  res.json({ csrfToken: req.session.csrfToken });
};

export { redisClient };