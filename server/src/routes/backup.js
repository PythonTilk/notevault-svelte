/**
 * Database Backup and Recovery API Routes
 * 
 * Provides endpoints for backup management, recovery operations,
 * and backup monitoring.
 */

import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { body, query, validationResult } from 'express-validator';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import backupService from '../services/backup.js';
import dbPool from '../config/database-optimized.js';
import { 
  asyncHandler, 
  ValidationError, 
  NotFoundError 
} from '../utils/errorHandler.js';

const router = express.Router();

// Apply authentication to all backup routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/backup/create:
 *   post:
 *     summary: Create database backup
 *     description: Creates a new database backup with optional compression and encryption
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [manual, scheduled]
 *                 default: manual
 *               compress:
 *                 type: boolean
 *                 default: true
 *               encrypt:
 *                 type: boolean
 *                 default: false
 */
router.post('/create', requireRole(['admin']), [
  body('type').optional().isIn(['manual', 'scheduled']),
  body('compress').optional().isBoolean(),
  body('encrypt').optional().isBoolean()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { type = 'manual', compress = true, encrypt = false } = req.body;

  const backup = await backupService.createBackup({
    type,
    compress,
    encrypt,
    requestedBy: req.user.id
  });

  res.json({
    success: true,
    message: 'Backup created successfully',
    backup
  });
}));

/**
 * @swagger
 * /api/backup/history:
 *   get:
 *     summary: Get backup history
 *     description: Retrieve list of all database backups
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 */
router.get('/history', requireRole(['admin', 'moderator']), [
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { limit = 50, offset = 0 } = req.query;

  const allBackups = backupService.getBackupHistory();
  const total = allBackups.length;
  const backups = allBackups.slice(offset, offset + limit);

  res.json({
    success: true,
    backups,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    }
  });
}));

/**
 * @swagger
 * /api/backup/{backupId}/restore:
 *   post:
 *     summary: Restore from backup
 *     description: Restore database from a specific backup
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:backupId/restore', requireRole(['admin']), [
  body('confirm').isBoolean().custom(value => {
    if (!value) {
      throw new Error('Confirmation required for restore operation');
    }
    return true;
  }),
  body('dryRun').optional().isBoolean()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { backupId } = req.params;
  const { dryRun = false } = req.body;

  const result = await backupService.restoreBackup(backupId, {
    dryRun,
    requestedBy: req.user.id
  });

  res.json({
    success: true,
    message: dryRun ? 'Restore validation completed' : 'Database restored successfully',
    result
  });
}));

/**
 * @swagger
 * /api/backup/{backupId}/verify:
 *   get:
 *     summary: Verify backup integrity
 *     description: Check backup file integrity and validity
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:backupId/verify', requireRole(['admin', 'moderator']), asyncHandler(async (req, res) => {
  const { backupId } = req.params;

  const verification = await backupService.verifyBackup(backupId);

  res.json({
    success: true,
    verification
  });
}));

/**
 * @swagger
 * /api/backup/{backupId}/download:
 *   get:
 *     summary: Download backup file
 *     description: Download a specific backup file
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:backupId/download', requireRole(['admin']), asyncHandler(async (req, res) => {
  const { backupId } = req.params;

  const backup = backupService.getBackupHistory().find(b => b.id === backupId);
  if (!backup) {
    throw new NotFoundError(`Backup ${backupId} not found`);
  }

  const filePath = path.join(backupService.config.backupDir, backup.filename);
  
  // Check if file exists
  try {
    await fs.access(filePath);
  } catch (error) {
    throw new NotFoundError('Backup file not found on disk');
  }

  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${backup.filename}"`);
  res.sendFile(filePath);
}));

/**
 * @swagger
 * /api/backup/statistics:
 *   get:
 *     summary: Get backup statistics
 *     description: Retrieve backup system statistics and metrics
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 */
router.get('/statistics', requireRole(['admin', 'moderator']), asyncHandler(async (req, res) => {
  const statistics = backupService.getStatistics();

  res.json({
    success: true,
    statistics
  });
}));

/**
 * @swagger
 * /api/backup/schedule:
 *   get:
 *     summary: Get backup schedule status
 *     description: Get current backup schedule configuration and status
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 */
router.get('/schedule', requireRole(['admin', 'moderator']), asyncHandler(async (req, res) => {
  const schedule = {
    enabled: backupService.config.scheduleEnabled,
    interval: backupService.config.scheduleInterval,
    nextBackup: backupService.scheduledBackupTimer ? 'Active' : 'Inactive',
    retentionPolicy: backupService.config.retentionPolicy
  };

  res.json({
    success: true,
    schedule
  });
}));

/**
 * @swagger
 * /api/backup/schedule:
 *   put:
 *     summary: Update backup schedule
 *     description: Configure backup schedule settings
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 */
router.put('/schedule', requireRole(['admin']), [
  body('enabled').isBoolean(),
  body('interval').optional().matches(/^\d+[hmd]$/),
  body('retentionPolicy').optional().isObject()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { enabled, interval, retentionPolicy } = req.body;

  if (enabled && interval) {
    backupService.config.scheduleInterval = interval;
    backupService.startScheduledBackups();
  } else if (!enabled) {
    backupService.stopScheduledBackups();
  }

  if (retentionPolicy) {
    Object.assign(backupService.config.retentionPolicy, retentionPolicy);
  }

  backupService.config.scheduleEnabled = enabled;

  res.json({
    success: true,
    message: 'Backup schedule updated successfully',
    schedule: {
      enabled: backupService.config.scheduleEnabled,
      interval: backupService.config.scheduleInterval,
      retentionPolicy: backupService.config.retentionPolicy
    }
  });
}));

/**
 * @swagger
 * /api/backup/cleanup:
 *   post:
 *     summary: Manual backup cleanup
 *     description: Manually trigger cleanup of old backups
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 */
router.post('/cleanup', requireRole(['admin']), asyncHandler(async (req, res) => {
  await backupService.cleanupOldBackups();

  res.json({
    success: true,
    message: 'Backup cleanup completed'
  });
}));

/**
 * @swagger
 * /api/backup/database/health:
 *   get:
 *     summary: Get database health
 *     description: Check database connection pool health and performance metrics
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 */
router.get('/database/health', requireRole(['admin', 'moderator']), asyncHandler(async (req, res) => {
  const health = await dbPool.healthCheck();
  
  res.json({
    success: true,
    health
  });
}));

/**
 * @swagger
 * /api/backup/database/metrics:
 *   get:
 *     summary: Get database metrics
 *     description: Retrieve database performance metrics and connection pool status
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 */
router.get('/database/metrics', requireRole(['admin', 'moderator']), asyncHandler(async (req, res) => {
  const metrics = dbPool.getMetrics();
  
  res.json({
    success: true,
    metrics
  });
}));

/**
 * @swagger
 * /api/backup/database/optimize:
 *   post:
 *     summary: Optimize database
 *     description: Run database optimization operations (VACUUM, ANALYZE, etc.)
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 */
router.post('/database/optimize', requireRole(['admin']), asyncHandler(async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Run optimization commands
    await dbPool.run('PRAGMA optimize');
    await dbPool.run('PRAGMA incremental_vacuum(1000)');
    await dbPool.run('ANALYZE');
    
    const duration = Date.now() - startTime;
    
    res.json({
      success: true,
      message: 'Database optimization completed',
      duration: `${duration}ms`
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Database optimization failed',
      message: error.message
    });
  }
}));

/**
 * @swagger
 * /api/backup/database/backup-wal:
 *   post:
 *     summary: Checkpoint WAL file
 *     description: Force WAL checkpoint to ensure data consistency
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 */
router.post('/database/checkpoint-wal', requireRole(['admin']), asyncHandler(async (req, res) => {
  try {
    const result = await dbPool.run('PRAGMA wal_checkpoint(TRUNCATE)');
    
    res.json({
      success: true,
      message: 'WAL checkpoint completed',
      result
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'WAL checkpoint failed',
      message: error.message
    });
  }
}));

export default router;