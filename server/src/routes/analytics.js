import express from 'express';
import { body, query, validationResult } from 'express-validator';
import analyticsService from '../services/analytics.js';
import monitoringService from '../services/monitoring.js';
import { requireAdmin, requireAuth } from '../middleware/session.js';
import { generalLimiter } from '../middleware/security.js';

const router = express.Router();

// Apply authentication and rate limiting
router.use(requireAuth);
router.use(generalLimiter);

// Dashboard data endpoint
router.get('/dashboard',
  requireAdmin,
  [
    query('timeRange').optional().isIn(['24h', '7d', '30d', '90d']).withMessage('Invalid time range'),
    query('filters').optional().isJSON().withMessage('Filters must be valid JSON')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { timeRange = '24h', filters = '{}' } = req.query;
      const parsedFilters = JSON.parse(filters);

      const dashboardData = await analyticsService.getDashboardData(timeRange, parsedFilters);
      
      res.json({
        success: true,
        data: dashboardData
      });

    } catch (error) {
      console.error('Dashboard data error:', error);
      res.status(500).json({
        error: 'Failed to fetch dashboard data',
        message: error.message
      });
    }
  }
);

// User analytics endpoint
router.get('/users',
  requireAdmin,
  [
    query('timeRange').optional().isIn(['24h', '7d', '30d', '90d']),
    query('includeInactive').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const { timeRange = '7d', includeInactive = false } = req.query;
      
      // Get user analytics data
      const timeFilter = analyticsService.getTimeFilter(timeRange);
      const userStats = await analyticsService.getUserStats(timeFilter, {
        includeInactive: includeInactive === 'true'
      });

      res.json({
        success: true,
        data: userStats,
        timeRange
      });

    } catch (error) {
      console.error('User analytics error:', error);
      res.status(500).json({
        error: 'Failed to fetch user analytics',
        message: error.message
      });
    }
  }
);

// Performance metrics endpoint
router.get('/performance',
  requireAdmin,
  [
    query('timeRange').optional().isIn(['1h', '24h', '7d']),
    query('includeDetails').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const { timeRange = '24h', includeDetails = false } = req.query;
      
      const performanceSummary = monitoringService.getPerformanceSummary(timeRange);
      const systemStatus = monitoringService.getSystemStatus();
      
      let detailedMetrics = null;
      if (includeDetails === 'true') {
        const timeFilter = analyticsService.getTimeFilter(timeRange);
        detailedMetrics = await analyticsService.getPerformanceStats(timeFilter);
      }

      res.json({
        success: true,
        data: {
          summary: performanceSummary,
          systemStatus,
          detailed: detailedMetrics
        },
        timeRange
      });

    } catch (error) {
      console.error('Performance metrics error:', error);
      res.status(500).json({
        error: 'Failed to fetch performance metrics',
        message: error.message
      });
    }
  }
);

// Error tracking endpoint
router.get('/errors',
  requireAdmin,
  [
    query('timeRange').optional().isIn(['1h', '24h', '7d']),
    query('level').optional().isIn(['low', 'medium', 'high', 'critical']),
    query('limit').optional().isInt({ min: 1, max: 1000 }).toInt()
  ],
  async (req, res) => {
    try {
      const { timeRange = '24h', level, limit = 100 } = req.query;
      
      const timeFilter = analyticsService.getTimeFilter(timeRange);
      const errorStats = await analyticsService.getErrorStats(timeFilter, {
        level,
        limit
      });

      // Get recent errors from monitoring service
      const recentErrors = monitoringService.errors
        .filter(error => {
          const errorTime = new Date(error.timestamp);
          const startTime = new Date(timeFilter.start);
          return errorTime >= startTime;
        })
        .filter(error => !level || error.severity === level)
        .slice(0, limit);

      res.json({
        success: true,
        data: {
          stats: errorStats,
          recentErrors,
          total: recentErrors.length
        },
        timeRange
      });

    } catch (error) {
      console.error('Error tracking error:', error);
      res.status(500).json({
        error: 'Failed to fetch error data',
        message: error.message
      });
    }
  }
);

// System health endpoint
router.get('/health',
  requireAdmin,
  async (req, res) => {
    try {
      const systemStatus = monitoringService.getSystemStatus();
      const activeAlerts = monitoringService.getActiveAlerts();
      
      res.json({
        success: true,
        data: {
          status: systemStatus,
          alerts: activeAlerts,
          timestamp: Date.now()
        }
      });

    } catch (error) {
      console.error('System health error:', error);
      res.status(500).json({
        error: 'Failed to fetch system health',
        message: error.message
      });
    }
  }
);

// Alerts management
router.get('/alerts',
  requireAdmin,
  [
    query('status').optional().isIn(['active', 'resolved', 'all']),
    query('level').optional().isIn(['info', 'warning', 'critical']),
    query('limit').optional().isInt({ min: 1, max: 1000 }).toInt()
  ],
  async (req, res) => {
    try {
      const { status = 'active', level, limit = 50 } = req.query;
      
      let alerts = monitoringService.alerts;
      
      // Filter by status
      if (status === 'active') {
        alerts = alerts.filter(alert => !alert.resolved);
      } else if (status === 'resolved') {
        alerts = alerts.filter(alert => alert.resolved);
      }
      
      // Filter by level
      if (level) {
        alerts = alerts.filter(alert => alert.level === level);
      }
      
      // Sort by timestamp (newest first)
      alerts = alerts
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);

      res.json({
        success: true,
        data: {
          alerts,
          total: alerts.length,
          summary: {
            active: monitoringService.alerts.filter(a => !a.resolved).length,
            resolved: monitoringService.alerts.filter(a => a.resolved).length,
            critical: monitoringService.alerts.filter(a => !a.resolved && a.level === 'critical').length
          }
        }
      });

    } catch (error) {
      console.error('Alerts fetch error:', error);
      res.status(500).json({
        error: 'Failed to fetch alerts',
        message: error.message
      });
    }
  }
);

// Acknowledge alert
router.post('/alerts/:alertId/acknowledge',
  requireAdmin,
  async (req, res) => {
    try {
      const { alertId } = req.params;
      const userId = req.session.userId;
      
      monitoringService.acknowledgeAlert(alertId, userId);
      
      res.json({
        success: true,
        message: 'Alert acknowledged successfully'
      });

    } catch (error) {
      console.error('Alert acknowledge error:', error);
      res.status(500).json({
        error: 'Failed to acknowledge alert',
        message: error.message
      });
    }
  }
);

// Resolve alert
router.post('/alerts/:alertId/resolve',
  requireAdmin,
  async (req, res) => {
    try {
      const { alertId } = req.params;
      const userId = req.session.userId;
      
      monitoringService.resolveAlert(alertId, userId);
      
      res.json({
        success: true,
        message: 'Alert resolved successfully'
      });

    } catch (error) {
      console.error('Alert resolve error:', error);
      res.status(500).json({
        error: 'Failed to resolve alert',
        message: error.message
      });
    }
  }
);

// API usage statistics
router.get('/api-usage',
  requireAdmin,
  [
    query('timeRange').optional().isIn(['1h', '24h', '7d', '30d']),
    query('endpoint').optional().isString(),
    query('method').optional().isIn(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
  ],
  async (req, res) => {
    try {
      const { timeRange = '24h', endpoint, method } = req.query;
      
      const timeFilter = analyticsService.getTimeFilter(timeRange);
      const apiStats = await analyticsService.getAPIStats(timeFilter, {
        endpoint,
        method
      });

      res.json({
        success: true,
        data: apiStats,
        timeRange
      });

    } catch (error) {
      console.error('API usage error:', error);
      res.status(500).json({
        error: 'Failed to fetch API usage statistics',
        message: error.message
      });
    }
  }
);

// Content statistics
router.get('/content',
  requireAdmin,
  [
    query('timeRange').optional().isIn(['24h', '7d', '30d', '90d']),
    query('type').optional().isIn(['notes', 'workspaces', 'files', 'messages'])
  ],
  async (req, res) => {
    try {
      const { timeRange = '7d', type } = req.query;
      
      const timeFilter = analyticsService.getTimeFilter(timeRange);
      const contentStats = await analyticsService.getContentStats(timeFilter, {
        type
      });

      res.json({
        success: true,
        data: contentStats,
        timeRange
      });

    } catch (error) {
      console.error('Content statistics error:', error);
      res.status(500).json({
        error: 'Failed to fetch content statistics',
        message: error.message
      });
    }
  }
);

// Export analytics data
router.get('/export',
  requireAdmin,
  [
    query('timeRange').optional().isIn(['24h', '7d', '30d', '90d']),
    query('format').optional().isIn(['json', 'csv']),
    query('type').optional().isIn(['dashboard', 'users', 'performance', 'errors', 'api', 'content'])
  ],
  async (req, res) => {
    try {
      const { timeRange = '7d', format = 'json', type = 'dashboard' } = req.query;
      
      let data;
      
      switch (type) {
        case 'users': {
          const timeFilter = analyticsService.getTimeFilter(timeRange);
          data = await analyticsService.getUserStats(timeFilter);
          break;
        }
        case 'performance':
          data = monitoringService.getPerformanceSummary(timeRange);
          break;
        case 'errors':
          data = await analyticsService.getErrorStats(analyticsService.getTimeFilter(timeRange));
          break;
        case 'api':
          data = await analyticsService.getAPIStats(analyticsService.getTimeFilter(timeRange));
          break;
        case 'content':
          data = await analyticsService.getContentStats(analyticsService.getTimeFilter(timeRange));
          break;
        default:
          data = await analyticsService.getDashboardData(timeRange);
      }
      
      if (format === 'csv') {
        const csvData = analyticsService.convertToCSV(data);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="analytics-${type}-${timeRange}.csv"`);
        res.send(csvData);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="analytics-${type}-${timeRange}.json"`);
        res.json({
          exportedAt: new Date().toISOString(),
          timeRange,
          type,
          data
        });
      }

    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({
        error: 'Failed to export analytics data',
        message: error.message
      });
    }
  }
);

// Real-time metrics endpoint (for WebSocket alternative)
router.get('/realtime',
  requireAdmin,
  async (req, res) => {
    try {
      const systemStatus = monitoringService.getSystemStatus();
      const performanceSummary = monitoringService.getPerformanceSummary('1h');
      const activeAlerts = monitoringService.getActiveAlerts();
      
      // Get recent activity
      const recentEvents = Array.from(analyticsService.metricsBuffer)
        .slice(-50)
        .map(event => ({
          id: event.id,
          action: event.action,
          timestamp: event.timestamp,
          userId: event.userId
        }));

      res.json({
        success: true,
        data: {
          system: systemStatus,
          performance: performanceSummary,
          alerts: activeAlerts.slice(0, 10), // Latest 10 alerts
          recentActivity: recentEvents,
          timestamp: Date.now()
        }
      });

    } catch (error) {
      console.error('Real-time metrics error:', error);
      res.status(500).json({
        error: 'Failed to fetch real-time metrics',
        message: error.message
      });
    }
  }
);

// Track custom event (for client-side analytics)
router.post('/track',
  [
    body('action').notEmpty().withMessage('Action is required'),
    body('metadata').optional().isObject().withMessage('Metadata must be an object')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { action, metadata = {} } = req.body;
      const userId = req.session.userId;
      
      // Add request context to metadata
      const eventMetadata = {
        ...metadata,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionID,
        source: 'client'
      };
      
      const eventId = analyticsService.trackEvent(userId, action, eventMetadata);
      
      res.json({
        success: true,
        eventId,
        message: 'Event tracked successfully'
      });

    } catch (error) {
      console.error('Event tracking error:', error);
      res.status(500).json({
        error: 'Failed to track event',
        message: error.message
      });
    }
  }
);

export default router;