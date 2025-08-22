import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import dbPool from '../config/database-optimized.js';
import { asyncHandler } from '../utils/errorHandler.js';

const router = express.Router();

/**
 * Database Health and Performance Monitoring API
 * 
 * Provides endpoints for monitoring database performance,
 * connection pool status, and optimization metrics.
 */

// Get database health status
router.get('/health', authenticateToken, requireRole(['admin']), asyncHandler(async (req, res) => {
  const healthCheck = await dbPool.healthCheck();
  
  res.json({
    success: true,
    health: healthCheck,
    timestamp: new Date().toISOString()
  });
}));

// Get detailed database metrics
router.get('/metrics', authenticateToken, requireRole(['admin']), asyncHandler(async (req, res) => {
  const metrics = dbPool.getMetrics();
  
  // Additional database statistics
  const stats = await dbPool.query(`
    SELECT 
      name,
      COUNT(*) as record_count
    FROM (
      SELECT 'users' as name FROM users
      UNION ALL SELECT 'workspaces' FROM workspaces  
      UNION ALL SELECT 'notes' FROM notes
      UNION ALL SELECT 'files' FROM files
      UNION ALL SELECT 'api_keys' FROM api_keys
      UNION ALL SELECT 'audit_logs' FROM audit_logs
      UNION ALL SELECT 'webhooks' FROM webhooks
      UNION ALL SELECT 'bots' FROM bots
      UNION ALL SELECT 'calendar_events' FROM calendar_events
      UNION ALL SELECT 'secrets' FROM secrets
    ) 
    GROUP BY name
  `);

  const tableStats = {};
  for (const stat of stats) {
    tableStats[stat.name] = stat.record_count;
  }

  res.json({
    success: true,
    metrics: {
      ...metrics,
      tableStats,
      performanceScore: calculatePerformanceScore(metrics)
    },
    timestamp: new Date().toISOString()
  });
}));

// Get slow query analysis
router.get('/slow-queries', authenticateToken, requireRole(['admin']), asyncHandler(async (req, res) => {
  // This would integrate with query logging if implemented
  const analysis = {
    slowQueryThreshold: dbPool.config?.maxQueryTimeMs || 10000,
    slowQueryCount: dbPool.metrics?.slowQueries || 0,
    recommendations: generatePerformanceRecommendations(dbPool.getMetrics())
  };

  res.json({
    success: true,
    analysis,
    timestamp: new Date().toISOString()
  });
}));

// Database optimization analysis
router.get('/optimization', authenticateToken, requireRole(['admin']), asyncHandler(async (req, res) => {
  // Analyze database for optimization opportunities
  const indexAnalysis = await analyzeIndexUsage();
  const tableAnalysis = await analyzeTableSizes();
  
  res.json({
    success: true,
    optimization: {
      indexAnalysis,
      tableAnalysis,
      recommendations: generateOptimizationRecommendations(indexAnalysis, tableAnalysis)
    },
    timestamp: new Date().toISOString()
  });
}));

// Force database optimization
router.post('/optimize', authenticateToken, requireRole(['admin']), asyncHandler(async (req, res) => {
  const startTime = Date.now();
  
  try {
    await dbPool.transaction(async (connection) => {
      // Run SQLite optimizations
      await connection.exec('PRAGMA optimize');
      await connection.exec('PRAGMA incremental_vacuum(5000)');
      await connection.exec('ANALYZE');
    });

    const duration = Date.now() - startTime;
    
    res.json({
      success: true,
      message: 'Database optimization completed successfully',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Database optimization failed',
      message: error.message
    });
  }
}));

// Connection pool management
router.get('/pool/status', authenticateToken, requireRole(['admin']), asyncHandler(async (req, res) => {
  const poolStatus = {
    totalConnections: dbPool.pool?.length || 0,
    activeConnections: dbPool.activeConnections?.size || 0,
    queueLength: dbPool.waitingQueue?.length || 0,
    maxConnections: dbPool.config?.maxConnections || 10,
    healthStatus: 'unknown'
  };

  // Calculate health status
  const utilization = poolStatus.activeConnections / poolStatus.maxConnections;
  if (utilization < 0.7) poolStatus.healthStatus = 'healthy';
  else if (utilization < 0.9) poolStatus.healthStatus = 'warning';
  else poolStatus.healthStatus = 'critical';

  res.json({
    success: true,
    poolStatus,
    timestamp: new Date().toISOString()
  });
}));

// Helper functions
function calculatePerformanceScore(metrics) {
  let score = 100;
  
  // Deduct points for high error rate
  const errorRate = metrics.errors / Math.max(metrics.totalQueries, 1);
  score -= errorRate * 100;
  
  // Deduct points for slow average query time
  if (metrics.avgQueryTime > 1000) score -= 20;
  else if (metrics.avgQueryTime > 500) score -= 10;
  else if (metrics.avgQueryTime > 100) score -= 5;
  
  // Deduct points for high queue length
  if (metrics.queueLength > 10) score -= 15;
  else if (metrics.queueLength > 5) score -= 10;
  
  // Deduct points for high connection utilization
  const utilization = metrics.activeConnectionsCount / metrics.maxConnections;
  if (utilization > 0.9) score -= 20;
  else if (utilization > 0.7) score -= 10;
  
  return Math.max(0, Math.round(score));
}

function generatePerformanceRecommendations(metrics) {
  const recommendations = [];
  
  if (metrics.avgQueryTime > 1000) {
    recommendations.push({
      type: 'performance',
      priority: 'high',
      message: 'Average query time is high. Consider adding indexes or optimizing queries.',
      action: 'analyze_slow_queries'
    });
  }
  
  if (metrics.queueLength > 5) {
    recommendations.push({
      type: 'capacity',
      priority: 'medium',
      message: 'Connection queue is building up. Consider increasing pool size.',
      action: 'increase_pool_size'
    });
  }
  
  if (metrics.slowQueries > metrics.totalQueries * 0.1) {
    recommendations.push({
      type: 'optimization',
      priority: 'high',
      message: 'High number of slow queries detected. Database optimization needed.',
      action: 'run_optimization'
    });
  }
  
  const utilization = metrics.activeConnectionsCount / metrics.maxConnections;
  if (utilization > 0.8) {
    recommendations.push({
      type: 'scaling',
      priority: 'medium',
      message: 'High connection pool utilization. Monitor for capacity issues.',
      action: 'monitor_scaling'
    });
  }
  
  return recommendations;
}

async function analyzeIndexUsage() {
  try {
    // Get list of all indexes
    const indexes = await dbPool.query(`
      SELECT name, sql, tbl_name 
      FROM sqlite_master 
      WHERE type = 'index' AND name NOT LIKE 'sqlite_%'
      ORDER BY tbl_name, name
    `);

    return {
      totalIndexes: indexes.length,
      indexesByTable: indexes.reduce((acc, idx) => {
        if (!acc[idx.tbl_name]) acc[idx.tbl_name] = [];
        acc[idx.tbl_name].push(idx.name);
        return acc;
      }, {}),
      recommendations: indexes.length < 20 ? 
        ['Consider adding more indexes for frequently queried columns'] : 
        ['Good index coverage detected']
    };
  } catch (error) {
    return {
      error: error.message,
      recommendations: ['Unable to analyze index usage']
    };
  }
}

async function analyzeTableSizes() {
  try {
    // Analyze table sizes and record counts
    const tables = [
      'users', 'workspaces', 'notes', 'files', 'api_keys', 
      'audit_logs', 'webhooks', 'bots', 'calendar_events', 'secrets'
    ];
    
    const analysis = {};
    
    for (const table of tables) {
      try {
        const count = await dbPool.get(`SELECT COUNT(*) as count FROM ${table}`);
        analysis[table] = {
          recordCount: count.count,
          size: 'unknown' // SQLite doesn't easily provide table size
        };
      } catch (error) {
        analysis[table] = { error: error.message };
      }
    }
    
    return analysis;
  } catch (error) {
    return {
      error: error.message
    };
  }
}

function generateOptimizationRecommendations(indexAnalysis, tableAnalysis) {
  const recommendations = [];
  
  // Check for large tables that might benefit from partitioning
  Object.entries(tableAnalysis).forEach(([table, data]) => {
    if (data.recordCount > 100000) {
      recommendations.push({
        type: 'scaling',
        priority: 'medium',
        message: `Table ${table} has ${data.recordCount} records. Consider archiving old data.`,
        action: 'archive_old_data'
      });
    }
  });
  
  // Check for missing indexes on large tables
  if (tableAnalysis.audit_logs?.recordCount > 10000 && 
      (!indexAnalysis.indexesByTable?.audit_logs || 
       indexAnalysis.indexesByTable.audit_logs.length < 3)) {
    recommendations.push({
      type: 'performance',
      priority: 'high',
      message: 'Audit logs table is large but may lack sufficient indexes.',
      action: 'add_audit_indexes'
    });
  }
  
  return recommendations;
}

export default router;