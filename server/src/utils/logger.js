import winston, { createLogger, format, transports } from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import db from '../config/database.js';
import { DatabaseWrapper } from './errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbWrapper = new DatabaseWrapper(db);

// Define log levels
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};

// Define colors for console output
const LOG_COLORS = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'cyan',
  debug: 'blue',
  silly: 'grey'
};

// Custom format for structured logging
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.json(),
  format.prettyPrint()
);

// Console format for development
const consoleFormat = format.combine(
  format.colorize({ all: true }),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += `\n${JSON.stringify(meta, null, 2)}`;
    }
    return msg;
  })
);

// Create winston logger
const logger = createLogger({
  levels: LOG_LEVELS,
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'notevault-server' },
  transports: [
    // Console transport for development
    new transports.Console({
      format: consoleFormat,
      silent: process.env.NODE_ENV === 'test'
    }),
    
    // File transports for production
    new transports.File({
      filename: path.join(__dirname, '../../../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    new transports.File({
      filename: path.join(__dirname, '../../../logs/combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10
    }),
    
    // Security-specific log file
    new transports.File({
      filename: path.join(__dirname, '../../../logs/security.log'),
      level: 'warn',
      maxsize: 5242880, // 5MB
      maxFiles: 10
    })
  ]
});

// Add colors to winston
winston.addColors(LOG_COLORS);

// Security event types
export const SECURITY_EVENTS = {
  // Authentication events
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  ACCOUNT_CREATED: 'ACCOUNT_CREATED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  
  // Authorization events
  ACCESS_DENIED: 'ACCESS_DENIED',
  PERMISSION_ESCALATION: 'PERMISSION_ESCALATION',
  UNAUTHORIZED_ACCESS_ATTEMPT: 'UNAUTHORIZED_ACCESS_ATTEMPT',
  
  // Data events
  DATA_EXPORT: 'DATA_EXPORT',
  DATA_DELETION: 'DATA_DELETION',
  SENSITIVE_DATA_ACCESS: 'SENSITIVE_DATA_ACCESS',
  
  // System events
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  SECURITY_CONFIG_CHANGE: 'SECURITY_CONFIG_CHANGE',
  
  // File events
  FILE_UPLOAD: 'FILE_UPLOAD',
  FILE_DOWNLOAD: 'FILE_DOWNLOAD',
  FILE_DELETION: 'FILE_DELETION',
  DIRECTORY_TRAVERSAL_ATTEMPT: 'DIRECTORY_TRAVERSAL_ATTEMPT',
  
  // Admin events
  ADMIN_ACTION: 'ADMIN_ACTION',
  USER_IMPERSONATION: 'USER_IMPERSONATION',
  SYSTEM_MAINTENANCE: 'SYSTEM_MAINTENANCE',

  // DLP (Data Loss Prevention) events
  DLP_SCAN_COMPLETED: 'DLP_SCAN_COMPLETED',
  DLP_SCAN_FAILED: 'DLP_SCAN_FAILED',
  DLP_VIOLATION: 'DLP_VIOLATION',
  DLP_CONTENT_BLOCKED: 'DLP_CONTENT_BLOCKED',
  DLP_CONTENT_REDACTED: 'DLP_CONTENT_REDACTED',
  DLP_CONTENT_QUARANTINED: 'DLP_CONTENT_QUARANTINED',
  DLP_CONTENT_PROCESSED: 'DLP_CONTENT_PROCESSED',
  DLP_POLICY_CREATED: 'DLP_POLICY_CREATED',
  DLP_POLICY_UPDATED: 'DLP_POLICY_UPDATED',
  DLP_POLICY_DELETED: 'DLP_POLICY_DELETED',
  DLP_VIOLATION_RESOLVED: 'DLP_VIOLATION_RESOLVED',
  DLP_QUARANTINE_REVIEWED: 'DLP_QUARANTINE_REVIEWED',
  DLP_AUDIT: 'DLP_AUDIT',
  
  // Search events
  SEARCH_PERFORMED: 'SEARCH_PERFORMED',
  SEARCH_ERROR: 'SEARCH_ERROR',
  
  // AI events
  AI_SUGGESTION_GENERATED: 'AI_SUGGESTION_GENERATED',
  AI_SUGGESTION_ERROR: 'AI_SUGGESTION_ERROR',
  AI_TAGS_GENERATED: 'AI_TAGS_GENERATED',
  AI_CONTENT_ANALYZED: 'AI_CONTENT_ANALYZED'
};

// Audit log class for database logging
class AuditLogger {
  constructor() {
    this.dbWrapper = dbWrapper;
  }

  /**
   * Log security event to database
   */
  async logSecurityEvent(event, details = {}) {
    try {
      const eventId = this.generateId();
      const timestamp = new Date().toISOString();
      
      await this.dbWrapper.run(`
        INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details, ip_address, user_agent, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        eventId,
        details.userId || null,
        event,
        details.targetType || 'system',
        details.targetId || 'unknown',
        JSON.stringify({
          ...details,
          timestamp,
          severity: this.getEventSeverity(event)
        }),
        details.ipAddress || null,
        details.userAgent || null,
        timestamp
      ]);

      // Also log to winston for immediate analysis
      const logLevel = this.getLogLevel(event);
      logger[logLevel]('Security Event', {
        event,
        eventId,
        userId: details.userId,
        ipAddress: details.ipAddress,
        details: details
      });

      return eventId;
    } catch (error) {
      // Silently fail for database write issues to avoid spam
      // Still log to winston for analysis
      logger.warn('Security event logged to file only (DB unavailable)', {
        event,
        eventId: this.generateId(),
        userId: details.userId,
        ipAddress: details.ipAddress,
        error: error.message
      });
    }
  }

  /**
   * Log application event (non-security)
   */
  async logApplicationEvent(action, details = {}) {
    try {
      const eventId = this.generateId();
      const timestamp = new Date().toISOString();
      
      await this.dbWrapper.run(`
        INSERT INTO audit_logs (id, user_id, action, details, ip_address, user_agent, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        eventId,
        details.userId || null,
        action,
        JSON.stringify({
          ...details,
          timestamp,
          type: 'application'
        }),
        details.ipAddress || null,
        details.userAgent || null,
        timestamp
      ]);

      logger.info('Application Event', {
        action,
        eventId,
        userId: details.userId,
        details
      });

      return eventId;
    } catch (error) {
      logger.error('Failed to log application event', {
        action,
        error: error.message,
        details
      });
    }
  }

  /**
   * Get event severity level
   */
  getEventSeverity(event) {
    const criticalEvents = [
      SECURITY_EVENTS.PERMISSION_ESCALATION,
      SECURITY_EVENTS.UNAUTHORIZED_ACCESS_ATTEMPT,
      SECURITY_EVENTS.DIRECTORY_TRAVERSAL_ATTEMPT,
      SECURITY_EVENTS.DATA_DELETION,
      SECURITY_EVENTS.ACCOUNT_LOCKED
    ];

    const highEvents = [
      SECURITY_EVENTS.LOGIN_FAILURE,
      SECURITY_EVENTS.ACCESS_DENIED,
      SECURITY_EVENTS.RATE_LIMIT_EXCEEDED,
      SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
      SECURITY_EVENTS.PASSWORD_CHANGE
    ];

    const mediumEvents = [
      SECURITY_EVENTS.LOGIN_SUCCESS,
      SECURITY_EVENTS.DATA_EXPORT,
      SECURITY_EVENTS.FILE_UPLOAD,
      SECURITY_EVENTS.FILE_DOWNLOAD,
      SECURITY_EVENTS.ADMIN_ACTION
    ];

    if (criticalEvents.includes(event)) return 'CRITICAL';
    if (highEvents.includes(event)) return 'HIGH';
    if (mediumEvents.includes(event)) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Get winston log level for event
   */
  getLogLevel(event) {
    const severity = this.getEventSeverity(event);
    switch (severity) {
      case 'CRITICAL': return 'error';
      case 'HIGH': return 'warn';
      case 'MEDIUM': return 'info';
      default: return 'debug';
    }
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get recent security events
   */
  async getRecentSecurityEvents(limit = 100, userId = null) {
    try {
      let query = `
        SELECT al.*, u.username, u.display_name
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE JSON_EXTRACT(al.details, '$.severity') IN ('CRITICAL', 'HIGH')
      `;
      let params = [];

      if (userId) {
        query += ' AND al.user_id = ?';
        params.push(userId);
      }

      query += ' ORDER BY al.created_at DESC LIMIT ?';
      params.push(limit);

      return await this.dbWrapper.query(query, params);
    } catch (error) {
      logger.error('Failed to get recent security events', { error: error.message });
      return [];
    }
  }

  /**
   * Get audit log statistics
   */
  async getAuditStats(timeframe = '24 HOURS') {
    try {
      const stats = await this.dbWrapper.get(`
        SELECT 
          COUNT(*) as total_events,
          COUNT(CASE WHEN JSON_EXTRACT(details, '$.severity') = 'CRITICAL' THEN 1 END) as critical_events,
          COUNT(CASE WHEN JSON_EXTRACT(details, '$.severity') = 'HIGH' THEN 1 END) as high_events,
          COUNT(CASE WHEN JSON_EXTRACT(details, '$.severity') = 'MEDIUM' THEN 1 END) as medium_events,
          COUNT(CASE WHEN JSON_EXTRACT(details, '$.severity') = 'LOW' THEN 1 END) as low_events,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT ip_address) as unique_ips
        FROM audit_logs
        WHERE created_at >= datetime('now', '-${timeframe}')
      `);

      return stats;
    } catch (error) {
      logger.error('Failed to get audit statistics', { error: error.message });
      throw error;
    }
  }
}

// Create global audit logger instance
export const auditLogger = new AuditLogger();

// Express middleware for request logging
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request start
  logger.http('Request started', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    
    logger.http('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user?.id
    });

    // Log security-relevant status codes
    if (res.statusCode === 401 || res.statusCode === 403) {
      auditLogger.logSecurityEvent(SECURITY_EVENTS.ACCESS_DENIED, {
        userId: req.user?.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        method: req.method,
        statusCode: res.statusCode
      });
    }

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Helper functions for common logging scenarios
export const logUserAction = (action, userId, details = {}) => {
  auditLogger.logApplicationEvent(action, {
    userId,
    ...details
  });
};

export const logSecurityEvent = (event, details = {}) => {
  auditLogger.logSecurityEvent(event, details);
};

export const logError = (error, context = {}) => {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    ...context
  });
};

export const logWarning = (message, context = {}) => {
  logger.warn(message, context);
};

export const logInfo = (message, context = {}) => {
  logger.info(message, context);
};

export const logDebug = (message, context = {}) => {
  logger.debug(message, context);
};

// Create logs directory if it doesn't exist
import fs from 'fs';
const logsDir = path.join(__dirname, '../../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  logger.info('Created logs directory', { path: logsDir });
}

export default logger;