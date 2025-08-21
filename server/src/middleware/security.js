import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import crypto from 'crypto';
import { auditLogger, SECURITY_EVENTS } from '../utils/logger.js';

// Enhanced rate limiting with different limits for different endpoints
export const createRateLimiter = (options = {}) => {
  const defaults = {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(options.windowMs / 1000) || 900
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      // Log rate limit exceeded event
      auditLogger.logSecurityEvent(SECURITY_EVENTS.RATE_LIMIT_EXCEEDED, {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        method: req.method,
        userId: req.user?.id,
        limit: options.max || 100,
        window: options.windowMs || 15 * 60 * 1000
      });

      res.status(429).json({
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil((options.windowMs || 15 * 60 * 1000) / 1000)
      });
    }
  };

  return rateLimit({ ...defaults, ...options });
};

// Different rate limits for different endpoints
export const generalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // 100 requests per 15 minutes per IP
});

export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 auth attempts per 15 minutes per IP
  skipSuccessfulRequests: true,
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 900
  }
});

export const strictLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10 // 10 requests per minute per IP
});

export const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50 // 50 uploads per hour per IP
});

// CSRF Protection Middleware (JWT-compatible)
export const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF for webhook endpoints and auth endpoints (login/register)
  if (req.path.startsWith('/api/webhooks/') || 
      req.path === '/api/auth/login' ||
      req.path === '/api/auth/register' ||
      req.path.startsWith('/api/auth/')) {
    return next();
  }

  // For JWT-based auth, check origin/referer for CSRF protection
  const origin = req.headers.origin;
  const referer = req.headers.referer;

  // Basic origin/referer check as CSRF protection
  const allowedOrigins = process.env.CORS_ORIGIN ? 
    process.env.CORS_ORIGIN.split(',').map(o => o.trim()) : 
    ['http://localhost:5173', 'http://localhost:50063', 'http://localhost:56770'];

  const hasValidOrigin = origin && allowedOrigins.includes(origin);
  const hasValidReferer = referer && allowedOrigins.some(allowed => referer.startsWith(allowed));

  if (!hasValidOrigin && !hasValidReferer) {
    return res.status(403).json({
      error: 'Invalid origin - possible CSRF attack',
      code: 'CSRF_INVALID_ORIGIN'
    });
  }

  next();
};

// Generate CSRF token
export const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Enhanced Helmet configuration
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:", "http://localhost:3001", "http://localhost:50063", "http://localhost:5173"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
});

// Request sanitization middleware
export const sanitizeRequest = (req, res, next) => {
  // Remove potentially dangerous characters from query parameters
  for (const key in req.query) {
    if (typeof req.query[key] === 'string') {
      req.query[key] = req.query[key].replace(/[<>]/g, '');
    }
  }

  // Basic XSS protection for request body
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }

  next();
};

// Recursive function to sanitize object properties
const sanitizeObject = (obj) => {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      // Basic XSS protection - remove script tags and javascript: URLs
      obj[key] = obj[key]
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
};

// IP-based security middleware
export const ipSecurity = (req, res, next) => {
  // Get real IP address
  const ip = req.headers['x-forwarded-for'] || 
             req.headers['x-real-ip'] || 
             req.connection.remoteAddress || 
             req.socket.remoteAddress ||
             (req.connection.socket ? req.connection.socket.remoteAddress : null);

  req.clientIP = ip;

  // Add IP to request for logging
  req.ipAddress = ip;

  next();
};

// Security logging middleware
export const securityLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Log security-relevant requests
    if (req.path.startsWith('/api/auth') || 
        req.path.startsWith('/api/admin') ||
        res.statusCode >= 400) {
      
      console.log(`[SECURITY] ${req.method} ${req.path} - ${res.statusCode} - ${req.clientIP} - ${duration}ms - ${req.headers['user-agent'] || 'Unknown'}`);
    }
  });

  next();
};