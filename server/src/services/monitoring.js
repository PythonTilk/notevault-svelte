import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class MonitoringService extends EventEmitter {
  constructor() {
    super();
    this.metrics = new Map();
    this.alerts = [];
    this.thresholds = {
      memory: {
        warning: 80, // 80% memory usage
        critical: 95  // 95% memory usage
      },
      cpu: {
        warning: 80,  // 80% CPU usage
        critical: 95  // 95% CPU usage
      },
      responseTime: {
        warning: 1000,  // 1 second
        critical: 5000  // 5 seconds
      },
      errorRate: {
        warning: 5,    // 5% error rate
        critical: 15   // 15% error rate
      },
      diskSpace: {
        warning: 80,   // 80% disk usage
        critical: 95   // 95% disk usage
      }
    };
    
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.collectInterval = 30000; // 30 seconds
    
    // Error tracking
    this.errors = [];
    this.errorWindow = 5 * 60 * 1000; // 5 minutes
    
    // Performance tracking
    this.performanceData = {
      requests: [],
      responseTime: [],
      cpuUsage: [],
      memoryUsage: [],
      errorRates: []
    };
    
    this.maxDataPoints = 1000;
    
    // Start monitoring
    this.startMonitoring();
  }

  /**
   * Start system monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('📊 Starting system monitoring...');
    
    // Collect metrics every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, this.collectInterval);
    
    // Clean up old data every hour
    setInterval(() => {
      this.cleanupOldData();
    }, 60 * 60 * 1000);
  }

  /**
   * Stop system monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    console.log('📊 Stopping system monitoring...');
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Collect system metrics
   */
  async collectSystemMetrics() {
    try {
      const timestamp = Date.now();
      
      // Memory metrics
      const memUsage = process.memoryUsage();
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryPercentage = (usedMemory / totalMemory) * 100;
      
      // CPU metrics
      const cpuUsage = await this.getCPUUsage();
      const loadAverage = os.loadavg();
      
      // Disk metrics
      const diskUsage = await this.getDiskUsage();
      
      // Network metrics (basic)
      const networkInterfaces = os.networkInterfaces();
      
      const metrics = {
        timestamp,
        memory: {
          used: usedMemory,
          free: freeMemory,
          total: totalMemory,
          percentage: memoryPercentage,
          heap: {
            used: memUsage.heapUsed,
            total: memUsage.heapTotal
          },
          external: memUsage.external,
          rss: memUsage.rss
        },
        cpu: {
          usage: cpuUsage,
          loadAverage: loadAverage,
          cores: os.cpus().length
        },
        disk: diskUsage,
        network: {
          interfaces: Object.keys(networkInterfaces).length
        },
        uptime: process.uptime(),
        pid: process.pid,
        nodeVersion: process.version,
        platform: os.platform(),
        arch: os.arch()
      };
      
      // Store metrics
      this.storeMetrics('system', metrics);
      
      // Check thresholds and generate alerts
      this.checkThresholds(metrics);
      
      // Emit metrics event
      this.emit('metrics', metrics);
      
    } catch (error) {
      console.error('Error collecting system metrics:', error);
      this.trackError(error, 'system_metrics_collection');
    }
  }

  /**
   * Get CPU usage percentage
   * @returns {Promise<number>} CPU usage percentage
   */
  getCPUUsage() {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = process.hrtime();
      
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const endTime = process.hrtime(startTime);
        
        const totalTime = endTime[0] * 1000000 + endTime[1] / 1000; // microseconds
        const totalUsage = endUsage.user + endUsage.system;
        
        const cpuPercent = (totalUsage / totalTime) * 100;
        resolve(Math.min(100, Math.max(0, cpuPercent)));
      }, 100);
    });
  }

  /**
   * Get disk usage information
   * @returns {Promise<Object>} Disk usage data
   */
  async getDiskUsage() {
    try {
      const stats = await fs.stat(process.cwd());
      
      // This is a simplified version - in production you'd want to use a library
      // like 'diskusage' for accurate disk space information
      return {
        used: 0,
        free: 0,
        total: 0,
        percentage: 0
      };
    } catch (error) {
      return {
        used: 0,
        free: 0,
        total: 0,
        percentage: 0,
        error: error.message
      };
    }
  }

  /**
   * Track HTTP request metrics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {number} responseTime - Response time in milliseconds
   */
  trackRequest(req, res, responseTime) {
    const timestamp = Date.now();
    
    const requestMetrics = {
      timestamp,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.session?.userId || null,
      contentLength: res.get('Content-Length') || 0
    };
    
    // Store request metrics
    this.storeMetrics('requests', requestMetrics);
    
    // Track response time
    this.performanceData.responseTime.push({
      timestamp,
      value: responseTime,
      endpoint: req.path
    });
    
    // Track error rates
    if (res.statusCode >= 400) {
      this.trackError(new Error(`HTTP ${res.statusCode}`), 'http_request', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        responseTime
      });
    }
    
    // Trim data if too large
    if (this.performanceData.responseTime.length > this.maxDataPoints) {
      this.performanceData.responseTime = this.performanceData.responseTime.slice(-this.maxDataPoints);
    }
  }

  /**
   * Track application errors
   * @param {Error} error - Error object
   * @param {string} context - Error context
   * @param {Object} metadata - Additional error metadata
   */
  trackError(error, context, metadata = {}) {
    const timestamp = Date.now();
    
    const errorData = {
      timestamp,
      message: error.message,
      stack: error.stack,
      name: error.name,
      context,
      metadata,
      severity: this.getErrorSeverity(error, context),
      fingerprint: this.generateErrorFingerprint(error)
    };
    
    // Add to errors array
    this.errors.push(errorData);
    
    // Store error metrics
    this.storeMetrics('errors', errorData);
    
    // Emit error event
    this.emit('error', errorData);
    
    // Check if error rate threshold is exceeded
    this.checkErrorRate();
    
    // Clean up old errors
    this.cleanupOldErrors();
  }

  /**
   * Generate error fingerprint for deduplication
   * @param {Error} error - Error object
   * @returns {string} Error fingerprint
   */
  generateErrorFingerprint(error) {
    const crypto = require('crypto');
    const fingerprint = `${error.name}:${error.message}`;
    return crypto.createHash('md5').update(fingerprint).digest('hex');
  }

  /**
   * Get error severity level
   * @param {Error} error - Error object
   * @param {string} context - Error context
   * @returns {string} Severity level
   */
  getErrorSeverity(error, context) {
    // Database errors are critical
    if (context.includes('database') || context.includes('db')) {
      return 'critical';
    }
    
    // Authentication errors are high
    if (context.includes('auth') || context.includes('login')) {
      return 'high';
    }
    
    // HTTP 5xx errors are high
    if (error.message.includes('HTTP 5')) {
      return 'high';
    }
    
    // HTTP 4xx errors are medium (except 401, 403)
    if (error.message.includes('HTTP 4')) {
      if (error.message.includes('401') || error.message.includes('403')) {
        return 'medium';
      }
      return 'low';
    }
    
    return 'medium';
  }

  /**
   * Check error rate and generate alerts if needed
   */
  checkErrorRate() {
    const now = Date.now();
    const recentErrors = this.errors.filter(error => 
      now - error.timestamp < this.errorWindow
    );
    
    const errorRate = recentErrors.length / (this.errorWindow / 60000); // errors per minute
    
    if (errorRate > this.thresholds.errorRate.critical) {
      this.generateAlert('critical', 'error_rate', 
        `Critical error rate: ${errorRate.toFixed(2)} errors/minute`);
    } else if (errorRate > this.thresholds.errorRate.warning) {
      this.generateAlert('warning', 'error_rate',
        `High error rate: ${errorRate.toFixed(2)} errors/minute`);
    }
  }

  /**
   * Store metrics data
   * @param {string} type - Metrics type
   * @param {Object} data - Metrics data
   */
  storeMetrics(type, data) {
    const key = `${type}_${Date.now()}`;
    this.metrics.set(key, data);
    
    // Limit stored metrics to prevent memory issues
    if (this.metrics.size > this.maxDataPoints * 3) {
      const oldestKeys = Array.from(this.metrics.keys()).slice(0, this.maxDataPoints);
      oldestKeys.forEach(key => this.metrics.delete(key));
    }
  }

  /**
   * Check system thresholds and generate alerts
   * @param {Object} metrics - Current system metrics
   */
  checkThresholds(metrics) {
    // Memory usage check
    if (metrics.memory.percentage > this.thresholds.memory.critical) {
      this.generateAlert('critical', 'memory_usage',
        `Critical memory usage: ${metrics.memory.percentage.toFixed(1)}%`);
    } else if (metrics.memory.percentage > this.thresholds.memory.warning) {
      this.generateAlert('warning', 'memory_usage',
        `High memory usage: ${metrics.memory.percentage.toFixed(1)}%`);
    }
    
    // CPU usage check
    if (metrics.cpu.usage > this.thresholds.cpu.critical) {
      this.generateAlert('critical', 'cpu_usage',
        `Critical CPU usage: ${metrics.cpu.usage.toFixed(1)}%`);
    } else if (metrics.cpu.usage > this.thresholds.cpu.warning) {
      this.generateAlert('warning', 'cpu_usage',
        `High CPU usage: ${metrics.cpu.usage.toFixed(1)}%`);
    }
    
    // Disk space check
    if (metrics.disk.percentage > this.thresholds.diskSpace.critical) {
      this.generateAlert('critical', 'disk_space',
        `Critical disk usage: ${metrics.disk.percentage.toFixed(1)}%`);
    } else if (metrics.disk.percentage > this.thresholds.diskSpace.warning) {
      this.generateAlert('warning', 'disk_space',
        `High disk usage: ${metrics.disk.percentage.toFixed(1)}%`);
    }
  }

  /**
   * Generate system alert
   * @param {string} level - Alert level ('info', 'warning', 'critical')
   * @param {string} type - Alert type
   * @param {string} message - Alert message
   * @param {Object} metadata - Additional alert data
   */
  generateAlert(level, type, message, metadata = {}) {
    const alert = {
      id: require('crypto').randomUUID(),
      timestamp: Date.now(),
      level,
      type,
      message,
      metadata,
      resolved: false,
      acknowledgedBy: null,
      acknowledgedAt: null
    };
    
    // Prevent duplicate alerts
    const isDuplicate = this.alerts.some(existingAlert => 
      existingAlert.type === type && 
      existingAlert.level === level && 
      !existingAlert.resolved &&
      Date.now() - existingAlert.timestamp < 5 * 60 * 1000 // 5 minutes
    );
    
    if (!isDuplicate) {
      this.alerts.push(alert);
      
      // Emit alert event
      this.emit('alert', alert);
      
      // Log alert
      console.log(`🚨 [${level.toUpperCase()}] ${type}: ${message}`);
      
      // Limit stored alerts
      if (this.alerts.length > 1000) {
        this.alerts = this.alerts.slice(-1000);
      }
    }
  }

  /**
   * Get current system status
   * @returns {Object} System status
   */
  getSystemStatus() {
    const now = Date.now();
    const recentMetrics = Array.from(this.metrics.values())
      .filter(metric => now - metric.timestamp < 5 * 60 * 1000)
      .filter(metric => metric.memory); // Only system metrics
    
    if (recentMetrics.length === 0) {
      return { status: 'unknown', message: 'No recent metrics available' };
    }
    
    const latest = recentMetrics[recentMetrics.length - 1];
    const activeAlerts = this.alerts.filter(alert => !alert.resolved);
    const criticalAlerts = activeAlerts.filter(alert => alert.level === 'critical');
    
    let status = 'healthy';
    let message = 'All systems operational';
    
    if (criticalAlerts.length > 0) {
      status = 'critical';
      message = `${criticalAlerts.length} critical alerts active`;
    } else if (activeAlerts.length > 0) {
      status = 'warning';
      message = `${activeAlerts.length} warnings active`;
    }
    
    return {
      status,
      message,
      timestamp: now,
      metrics: latest,
      alerts: {
        total: activeAlerts.length,
        critical: criticalAlerts.length,
        warning: activeAlerts.filter(alert => alert.level === 'warning').length
      }
    };
  }

  /**
   * Get performance summary
   * @param {string} timeRange - Time range ('1h', '24h', '7d')
   * @returns {Object} Performance summary
   */
  getPerformanceSummary(timeRange = '1h') {
    const now = Date.now();
    let timeWindow;
    
    switch (timeRange) {
      case '1h':
        timeWindow = 60 * 60 * 1000;
        break;
      case '24h':
        timeWindow = 24 * 60 * 60 * 1000;
        break;
      case '7d':
        timeWindow = 7 * 24 * 60 * 60 * 1000;
        break;
      default:
        timeWindow = 60 * 60 * 1000;
    }
    
    const recentData = this.performanceData.responseTime
      .filter(point => now - point.timestamp < timeWindow);
    
    const recentErrors = this.errors
      .filter(error => now - error.timestamp < timeWindow);
    
    if (recentData.length === 0) {
      return {
        timeRange,
        requests: 0,
        avgResponseTime: 0,
        p95ResponseTime: 0,
        errorRate: 0,
        throughput: 0
      };
    }
    
    const responseTimes = recentData.map(point => point.value).sort((a, b) => a - b);
    const p95Index = Math.ceil(responseTimes.length * 0.95) - 1;
    
    return {
      timeRange,
      requests: recentData.length,
      avgResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      p95ResponseTime: responseTimes[p95Index] || 0,
      errorRate: (recentErrors.length / recentData.length) * 100,
      throughput: recentData.length / (timeWindow / 60000) // requests per minute
    };
  }

  /**
   * Clean up old data to prevent memory leaks
   */
  cleanupOldData() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    // Clean up metrics
    const metricsToDelete = [];
    this.metrics.forEach((value, key) => {
      if (now - value.timestamp > maxAge) {
        metricsToDelete.push(key);
      }
    });
    metricsToDelete.forEach(key => this.metrics.delete(key));
    
    // Clean up performance data
    this.performanceData.responseTime = this.performanceData.responseTime
      .filter(point => now - point.timestamp < maxAge);
    
    // Clean up old resolved alerts
    this.alerts = this.alerts.filter(alert => 
      !alert.resolved || now - alert.timestamp < maxAge
    );
  }

  /**
   * Clean up old errors
   */
  cleanupOldErrors() {
    const now = Date.now();
    this.errors = this.errors.filter(error => 
      now - error.timestamp < this.errorWindow * 4 // Keep 4x error window
    );
  }

  /**
   * Acknowledge an alert
   * @param {string} alertId - Alert ID
   * @param {string} userId - User acknowledging the alert
   */
  acknowledgeAlert(alertId, userId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.acknowledgedBy = userId;
      alert.acknowledgedAt = Date.now();
      
      this.emit('alert_acknowledged', alert);
    }
  }

  /**
   * Resolve an alert
   * @param {string} alertId - Alert ID
   * @param {string} userId - User resolving the alert
   */
  resolveAlert(alertId, userId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedBy = userId;
      alert.resolvedAt = Date.now();
      
      this.emit('alert_resolved', alert);
    }
  }

  /**
   * Get active alerts
   * @returns {Array} Active alerts
   */
  getActiveAlerts() {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Export monitoring data
   * @param {string} format - Export format ('json', 'csv')
   * @param {string} timeRange - Time range
   * @returns {String|Object} Exported data
   */
  exportData(format = 'json', timeRange = '24h') {
    const data = {
      timestamp: Date.now(),
      timeRange,
      systemStatus: this.getSystemStatus(),
      performance: this.getPerformanceSummary(timeRange),
      alerts: this.alerts,
      metrics: Array.from(this.metrics.values()),
      errors: this.errors
    };
    
    if (format === 'csv') {
      return this.convertToCSV(data, timeRange);
    }
    
    return data;
  }

  /**
   * Convert monitoring data to CSV format
   * @param {Object} data - Monitoring data
   * @param {string} timeRange - Time range for the export
   * @returns {string} CSV formatted data
   */
  convertToCSV(data, timeRange) {
    const csvSections = [];
    const dateString = new Date().toISOString();
    
    // Header with metadata
    csvSections.push(`# NoteVault Analytics Export`);
    csvSections.push(`# Generated: ${dateString}`);
    csvSections.push(`# Time Range: ${timeRange}`);
    csvSections.push(`# Export Type: Complete System Analytics`);
    csvSections.push('');

    // System Status section
    csvSections.push('## System Status');
    csvSections.push('Metric,Value,Status');
    Object.entries(data.systemStatus).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        csvSections.push(`${key},${JSON.stringify(value)},${value.status || 'N/A'}`);
      } else {
        csvSections.push(`${key},${value},N/A`);
      }
    });
    csvSections.push('');

    // Performance Metrics section
    if (data.performance && Object.keys(data.performance).length > 0) {
      csvSections.push('## Performance Metrics');
      csvSections.push('Metric,Average,Min,Max,Count,Unit');
      Object.entries(data.performance).forEach(([key, metrics]) => {
        if (typeof metrics === 'object' && metrics.average !== undefined) {
          csvSections.push(
            `${key},${metrics.average || 0},${metrics.min || 0},${metrics.max || 0},${metrics.count || 0},${metrics.unit || 'ms'}`
          );
        } else {
          csvSections.push(`${key},${metrics},0,0,1,N/A`);
        }
      });
      csvSections.push('');
    }

    // Alerts section
    if (data.alerts && data.alerts.length > 0) {
      csvSections.push('## System Alerts');
      csvSections.push('Timestamp,Type,Level,Message,Resolved,Resolved By,Resolved At');
      data.alerts.forEach(alert => {
        const timestamp = new Date(alert.timestamp).toISOString();
        const resolvedAt = alert.resolvedAt ? new Date(alert.resolvedAt).toISOString() : '';
        csvSections.push(
          `"${timestamp}","${alert.type}","${alert.level}","${this.escapeCsvField(alert.message)}","${alert.resolved}","${alert.resolvedBy || ''}","${resolvedAt}"`
        );
      });
      csvSections.push('');
    }

    // Metrics section (detailed time-series data)
    if (data.metrics && data.metrics.length > 0) {
      csvSections.push('## Detailed Metrics');
      csvSections.push('Timestamp,Name,Value,Type,Tags');
      data.metrics.forEach(metric => {
        const timestamp = new Date(metric.timestamp).toISOString();
        const tags = metric.tags ? JSON.stringify(metric.tags) : '';
        csvSections.push(
          `"${timestamp}","${metric.name}","${metric.value}","${metric.type}","${this.escapeCsvField(tags)}"`
        );
      });
      csvSections.push('');
    }

    // Errors section
    if (data.errors && data.errors.length > 0) {
      csvSections.push('## System Errors');
      csvSections.push('Timestamp,Level,Message,Stack,Source,User ID');
      data.errors.forEach(error => {
        const timestamp = new Date(error.timestamp).toISOString();
        csvSections.push(
          `"${timestamp}","${error.level}","${this.escapeCsvField(error.message)}","${this.escapeCsvField(error.stack || '')}","${error.source || ''}","${error.userId || ''}"`
        );
      });
      csvSections.push('');
    }

    // API Usage Statistics (if available)
    const apiStats = this.getAPIUsageStats();
    if (apiStats && Object.keys(apiStats).length > 0) {
      csvSections.push('## API Usage Statistics');
      csvSections.push('Endpoint,Method,Count,Avg Response Time,Error Rate');
      Object.entries(apiStats).forEach(([endpoint, stats]) => {
        csvSections.push(
          `"${endpoint}","${stats.method || 'ALL'}","${stats.count}","${stats.avgResponseTime}","${stats.errorRate}"`
        );
      });
      csvSections.push('');
    }

    // Summary Statistics
    csvSections.push('## Export Summary');
    csvSections.push('Category,Count');
    csvSections.push(`Total Alerts,${data.alerts?.length || 0}`);
    csvSections.push(`Active Alerts,${data.alerts?.filter(a => !a.resolved).length || 0}`);
    csvSections.push(`Total Metrics,${data.metrics?.length || 0}`);
    csvSections.push(`Total Errors,${data.errors?.length || 0}`);
    csvSections.push(`System Uptime,${this.getUptime()}`);

    return csvSections.join('\n');
  }

  /**
   * Escape special characters for CSV
   * @param {string} field - Field to escape
   * @returns {string} Escaped field
   */
  escapeCsvField(field) {
    if (typeof field !== 'string') return field;
    // Escape quotes and wrap in quotes if contains commas, quotes, or newlines
    const needsEscaping = field.includes(',') || field.includes('"') || field.includes('\n') || field.includes('\r');
    if (needsEscaping) {
      return field.replace(/"/g, '""');
    }
    return field;
  }

  /**
   * Get API usage statistics
   * @returns {Object} API usage stats
   */
  getAPIUsageStats() {
    const stats = {};
    
    // Aggregate metrics by endpoint
    this.metrics.forEach(metric => {
      if (metric.type === 'api_request') {
        const endpoint = metric.tags?.endpoint || 'unknown';
        const method = metric.tags?.method || 'GET';
        const key = `${method} ${endpoint}`;
        
        if (!stats[key]) {
          stats[key] = {
            method,
            endpoint,
            count: 0,
            totalResponseTime: 0,
            errors: 0
          };
        }
        
        stats[key].count++;
        stats[key].totalResponseTime += metric.value;
        if (metric.tags?.status >= 400) {
          stats[key].errors++;
        }
      }
    });

    // Calculate averages and error rates
    Object.keys(stats).forEach(key => {
      const stat = stats[key];
      stat.avgResponseTime = (stat.totalResponseTime / stat.count).toFixed(2);
      stat.errorRate = ((stat.errors / stat.count) * 100).toFixed(2) + '%';
      delete stat.totalResponseTime; // Remove internal calculation field
    });

    return stats;
  }

  /**
   * Get system uptime in human readable format
   * @returns {string} Uptime string
   */
  getUptime() {
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }
}

// Export singleton instance
export default new MonitoringService();