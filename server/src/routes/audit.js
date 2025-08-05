import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import { auditLogger, SECURITY_EVENTS, logSecurityEvent } from '../utils/logger.js';
import { 
  asyncHandler, 
  ValidationError, 
  AuthorizationError,
  DatabaseWrapper 
} from '../utils/errorHandler.js';
import db from '../config/database.js';

const router = express.Router();
const dbWrapper = new DatabaseWrapper(db);

// Middleware to check admin role
const requireAdmin = asyncHandler(async (req, res, next) => {
  if (req.user.role !== 'admin') {
    await logSecurityEvent(SECURITY_EVENTS.ACCESS_DENIED, {
      userId: req.user.id,
      action: 'admin_access_attempt',
      resource: req.url,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    throw new AuthorizationError('Admin access required');
  }
  next();
});

// Get audit log statistics
router.get('/stats', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { timeframe = '24 HOURS' } = req.query;
  
  const stats = await auditLogger.getAuditStats(timeframe);
  
  // Log admin access to audit stats
  await logSecurityEvent(SECURITY_EVENTS.ADMIN_ACTION, {
    userId: req.user.id,
    action: 'view_audit_stats',
    timeframe,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.json({
    success: true,
    timeframe,
    stats
  });
}));

// Get recent security events
router.get('/security-events', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { limit = 100, userId } = req.query;
  
  const events = await auditLogger.getRecentSecurityEvents(parseInt(limit), userId);
  
  // Log admin access to security events
  await logSecurityEvent(SECURITY_EVENTS.ADMIN_ACTION, {
    userId: req.user.id,
    action: 'view_security_events',
    filters: { limit, targetUserId: userId },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.json({
    success: true,
    events,
    totalCount: events.length
  });
}));

// Get detailed audit logs with filtering
router.get('/logs', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { 
    limit = 50,
    offset = 0,
    userId,
    action,
    severity,
    startDate,
    endDate,
    ipAddress
  } = req.query;

  let query = `
    SELECT al.*, u.username, u.display_name, u.email
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE 1=1
  `;
  let params = [];
  let paramIndex = 1;

  // Build dynamic query based on filters
  if (userId) {
    query += ` AND al.user_id = ?`;
    params.push(userId);
  }

  if (action) {
    query += ` AND al.action = ?`;
    params.push(action);
  }

  if (severity) {
    query += ` AND JSON_EXTRACT(al.details, '$.severity') = ?`;
    params.push(severity.toUpperCase());
  }

  if (startDate) {
    query += ` AND al.created_at >= ?`;
    params.push(new Date(startDate).toISOString());
  }

  if (endDate) {
    query += ` AND al.created_at <= ?`;
    params.push(new Date(endDate).toISOString());
  }

  if (ipAddress) {
    query += ` AND al.ip_address = ?`;
    params.push(ipAddress);
  }

  query += ` ORDER BY al.created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));

  // Get filtered logs
  const logs = await dbWrapper.query(query, params);
  
  // Get total count for pagination
  let countQuery = `
    SELECT COUNT(*) as total
    FROM audit_logs al
    WHERE 1=1
  `;
  let countParams = params.slice(0, -2); // Remove limit and offset
  
  // Rebuild count query with same filters
  let countParamIndex = 0;
  if (userId) {
    countQuery += ` AND al.user_id = ?`;
    countParamIndex++;
  }
  if (action) {
    countQuery += ` AND al.action = ?`;
    countParamIndex++;
  }
  if (severity) {
    countQuery += ` AND JSON_EXTRACT(al.details, '$.severity') = ?`;
    countParamIndex++;
  }
  if (startDate) {
    countQuery += ` AND al.created_at >= ?`;
    countParamIndex++;
  }
  if (endDate) {
    countQuery += ` AND al.created_at <= ?`;
    countParamIndex++;
  }
  if (ipAddress) {
    countQuery += ` AND al.ip_address = ?`;
    countParamIndex++;
  }

  const countResult = await dbWrapper.get(countQuery, countParams);
  
  // Log admin access to detailed audit logs
  await logSecurityEvent(SECURITY_EVENTS.ADMIN_ACTION, {
    userId: req.user.id,
    action: 'view_audit_logs',
    filters: { userId, action, severity, startDate, endDate, ipAddress, limit, offset },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.json({
    success: true,
    logs: logs.map(log => ({
      ...log,
      details: JSON.parse(log.details || '{}')
    })),
    pagination: {
      total: countResult.total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: parseInt(offset) + parseInt(limit) < countResult.total
    }
  });
}));

// Get audit log summary by action type
router.get('/summary', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { timeframe = '24 HOURS' } = req.query;
  
  const summary = await dbWrapper.query(`
    SELECT 
      action,
      COUNT(*) as count,
      JSON_EXTRACT(details, '$.severity') as severity,
      COUNT(DISTINCT user_id) as unique_users,
      COUNT(DISTINCT ip_address) as unique_ips,
      MIN(created_at) as first_occurrence,
      MAX(created_at) as last_occurrence
    FROM audit_logs
    WHERE created_at >= datetime('now', '-${timeframe}')
    GROUP BY action, JSON_EXTRACT(details, '$.severity')
    ORDER BY count DESC, severity ASC
  `);
  
  // Log admin access to audit summary
  await logSecurityEvent(SECURITY_EVENTS.ADMIN_ACTION, {
    userId: req.user.id,
    action: 'view_audit_summary',
    timeframe,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.json({
    success: true,
    timeframe,
    summary
  });
}));

// Get failed login attempts (security analysis)
router.get('/failed-logins', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { timeframe = '24 HOURS', limit = 50 } = req.query;
  
  const failedLogins = await dbWrapper.query(`
    SELECT 
      al.*,
      u.username,
      u.email,
      u.display_name,
      COUNT(*) OVER (PARTITION BY al.ip_address) as attempts_from_ip,
      COUNT(*) OVER (PARTITION BY al.user_id) as attempts_for_user
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE al.action = '${SECURITY_EVENTS.LOGIN_FAILURE}'
      AND al.created_at >= datetime('now', '-${timeframe}')
    ORDER BY al.created_at DESC
    LIMIT ?
  `, [parseInt(limit)]);
  
  // Log admin access to failed login analysis
  await logSecurityEvent(SECURITY_EVENTS.ADMIN_ACTION, {
    userId: req.user.id,
    action: 'view_failed_logins',
    timeframe,
    limit,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.json({
    success: true,
    timeframe,
    failedLogins: failedLogins.map(login => ({
      ...login,
      details: JSON.parse(login.details || '{}')
    }))
  });
}));

// Get suspicious activity patterns
router.get('/suspicious-activity', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { timeframe = '24 HOURS' } = req.query;
  
  // Get IPs with multiple failed login attempts
  const suspiciousIPs = await dbWrapper.query(`
    SELECT 
      ip_address,
      COUNT(*) as failed_attempts,
      COUNT(DISTINCT user_id) as targeted_users,
      GROUP_CONCAT(DISTINCT JSON_EXTRACT(details, '$.reason')) as failure_reasons,
      MIN(created_at) as first_attempt,
      MAX(created_at) as last_attempt
    FROM audit_logs
    WHERE action = '${SECURITY_EVENTS.LOGIN_FAILURE}'
      AND created_at >= datetime('now', '-${timeframe}')
      AND ip_address IS NOT NULL
    GROUP BY ip_address
    HAVING failed_attempts >= 3
    ORDER BY failed_attempts DESC, targeted_users DESC
  `);
  
  // Get users with multiple failed attempts
  const suspiciousUsers = await dbWrapper.query(`
    SELECT 
      al.user_id,
      u.username,
      u.email,
      COUNT(*) as failed_attempts,
      COUNT(DISTINCT al.ip_address) as source_ips,
      MIN(al.created_at) as first_attempt,
      MAX(al.created_at) as last_attempt
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE al.action = '${SECURITY_EVENTS.LOGIN_FAILURE}'
      AND al.created_at >= datetime('now', '-${timeframe}')
      AND al.user_id IS NOT NULL
    GROUP BY al.user_id
    HAVING failed_attempts >= 3
    ORDER BY failed_attempts DESC
  `);
  
  // Log admin access to suspicious activity analysis
  await logSecurityEvent(SECURITY_EVENTS.ADMIN_ACTION, {
    userId: req.user.id,
    action: 'view_suspicious_activity',
    timeframe,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.json({
    success: true,
    timeframe,
    analysis: {
      suspiciousIPs,
      suspiciousUsers,
      summary: {
        flaggedIPs: suspiciousIPs.length,
        flaggedUsers: suspiciousUsers.length,
        totalFailedAttempts: suspiciousIPs.reduce((sum, ip) => sum + ip.failed_attempts, 0)
      }
    }
  });
}));

export default router;