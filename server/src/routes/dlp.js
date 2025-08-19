/**
 * Data Loss Prevention (DLP) API Routes
 * 
 * Provides endpoints for DLP management, policy configuration,
 * content scanning, and compliance reporting.
 */

import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import dlpService from '../services/dlp.js';
import { 
  asyncHandler, 
  ValidationError, 
  NotFoundError,
  ForbiddenError 
} from '../utils/errorHandler.js';

const router = express.Router();

// Apply authentication to all DLP routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/dlp/scan:
 *   post:
 *     summary: Scan content for sensitive data
 *     description: Performs DLP scan on provided content
 *     tags: [DLP]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: Content to scan
 *               context:
 *                 type: object
 *                 properties:
 *                   workspaceId:
 *                     type: string
 *                   noteId:
 *                     type: string
 *                   fileId:
 *                     type: string
 *     responses:
 *       200:
 *         description: Scan completed successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.post('/scan', [
  body('content').isString().isLength({ min: 1 }),
  body('context').optional().isObject()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { content, context = {} } = req.body;
  
  // Add user context
  const scanContext = {
    ...context,
    userId: req.user.id,
    userRole: req.user.role,
    timestamp: Date.now()
  };

  const scanResult = await dlpService.scanContent(content, scanContext);
  
  res.json({
    success: true,
    scanResult
  });
}));

/**
 * @swagger
 * /api/dlp/policies:
 *   get:
 *     summary: Get all DLP policies
 *     description: Retrieve list of all DLP policies
 *     tags: [DLP]
 *     security:
 *       - bearerAuth: []
 */
router.get('/policies', requireRole(['admin', 'moderator']), asyncHandler(async (req, res) => {
  const policies = dlpService.getPolicies();
  
  res.json({
    success: true,
    policies
  });
}));

/**
 * @swagger
 * /api/dlp/policies:
 *   post:
 *     summary: Create new DLP policy
 *     description: Add a new data loss prevention policy
 *     tags: [DLP]
 *     security:
 *       - bearerAuth: []
 */
router.post('/policies', requireRole(['admin']), [
  body('name').isString().isLength({ min: 1 }),
  body('description').isString().isLength({ min: 1 }),
  body('dataTypes').isArray().notEmpty(),
  body('actions').isArray().notEmpty(),
  body('severity').isIn(['low', 'medium', 'high', 'critical']),
  body('enabled').isBoolean()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const policyData = {
    id: `policy-${Date.now()}`,
    ...req.body,
    createdBy: req.user.id
  };

  dlpService.addPolicy(policyData);
  
  res.json({
    success: true,
    message: 'Policy created successfully',
    policy: policyData
  });
}));

/**
 * @swagger
 * /api/dlp/policies/{policyId}:
 *   get:
 *     summary: Get DLP policy by ID
 *     description: Retrieve specific DLP policy details
 *     tags: [DLP]
 *     security:
 *       - bearerAuth: []
 */
router.get('/policies/:policyId', requireRole(['admin', 'moderator']), asyncHandler(async (req, res) => {
  const { policyId } = req.params;
  
  const policy = dlpService.getPolicy(policyId);
  if (!policy) {
    throw new NotFoundError(`Policy ${policyId} not found`);
  }

  res.json({
    success: true,
    policy
  });
}));

/**
 * @swagger
 * /api/dlp/policies/{policyId}:
 *   put:
 *     summary: Update DLP policy
 *     description: Update existing DLP policy configuration
 *     tags: [DLP]
 *     security:
 *       - bearerAuth: []
 */
router.put('/policies/:policyId', requireRole(['admin']), [
  body('name').optional().isString().isLength({ min: 1 }),
  body('description').optional().isString().isLength({ min: 1 }),
  body('dataTypes').optional().isArray(),
  body('actions').optional().isArray(),
  body('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('enabled').optional().isBoolean(),
  body('notifications').optional().isArray(),
  body('exemptions').optional().isArray()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { policyId } = req.params;
  const updates = {
    ...req.body,
    updatedBy: req.user.id
  };

  const updatedPolicy = dlpService.updatePolicy(policyId, updates);
  
  res.json({
    success: true,
    message: 'Policy updated successfully',
    policy: updatedPolicy
  });
}));

/**
 * @swagger
 * /api/dlp/violations:
 *   get:
 *     summary: Get DLP violations
 *     description: Retrieve list of DLP policy violations with filtering
 *     tags: [DLP]
 *     security:
 *       - bearerAuth: []
 */
router.get('/violations', requireRole(['admin', 'moderator']), [
  query('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
  query('dataType').optional().isString(),
  query('resolved').optional().isBoolean(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const {
    severity,
    dataType,
    resolved,
    startDate,
    endDate,
    limit = 50,
    offset = 0
  } = req.query;

  const filters = {};
  
  if (severity) filters.severity = severity;
  if (dataType) filters.dataType = dataType;
  if (resolved !== undefined) filters.resolved = resolved === 'true';
  
  if (startDate || endDate) {
    filters.timeRange = {
      start: startDate ? new Date(startDate).getTime() : 0,
      end: endDate ? new Date(endDate).getTime() : Date.now()
    };
  }

  const allViolations = dlpService.getViolations(filters);
  const total = allViolations.length;
  const violations = allViolations.slice(offset, offset + limit);

  res.json({
    success: true,
    violations,
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
 * /api/dlp/violations/{violationId}/resolve:
 *   post:
 *     summary: Resolve DLP violation
 *     description: Mark a DLP violation as resolved
 *     tags: [DLP]
 *     security:
 *       - bearerAuth: []
 */
router.post('/violations/:violationId/resolve', requireRole(['admin', 'moderator']), [
  body('resolution').isString().isLength({ min: 1 }),
  body('notes').optional().isString()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { violationId } = req.params;
  const { resolution, notes } = req.body;

  // Find and update violation
  const violations = dlpService.getViolations();
  const violation = violations.find(v => v.id === violationId);
  
  if (!violation) {
    throw new NotFoundError(`Violation ${violationId} not found`);
  }

  violation.resolved = true;
  violation.resolution = resolution;
  violation.resolvedBy = req.user.id;
  violation.resolvedAt = Date.now();
  violation.resolutionNotes = notes;

  res.json({
    success: true,
    message: 'Violation resolved successfully',
    violation
  });
}));

/**
 * @swagger
 * /api/dlp/quarantine:
 *   get:
 *     summary: Get quarantined content
 *     description: Retrieve list of quarantined content items
 *     tags: [DLP]
 *     security:
 *       - bearerAuth: []
 */
router.get('/quarantine', requireRole(['admin', 'moderator']), asyncHandler(async (req, res) => {
  const quarantinedContent = dlpService.getQuarantinedContent();
  
  res.json({
    success: true,
    quarantinedContent
  });
}));

/**
 * @swagger
 * /api/dlp/quarantine/{quarantineId}/review:
 *   post:
 *     summary: Review quarantined content
 *     description: Review and make decision on quarantined content
 *     tags: [DLP]
 *     security:
 *       - bearerAuth: []
 */
router.post('/quarantine/:quarantineId/review', requireRole(['admin', 'moderator']), [
  body('decision').isIn(['approve', 'reject', 'modify']),
  body('notes').optional().isString()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { quarantineId } = req.params;
  const { decision, notes } = req.body;

  const reviewedItem = dlpService.reviewQuarantinedContent(
    quarantineId, 
    decision, 
    req.user.id, 
    notes
  );

  res.json({
    success: true,
    message: 'Quarantined content reviewed successfully',
    item: reviewedItem
  });
}));

/**
 * @swagger
 * /api/dlp/statistics:
 *   get:
 *     summary: Get DLP statistics
 *     description: Retrieve DLP system statistics and metrics
 *     tags: [DLP]
 *     security:
 *       - bearerAuth: []
 */
router.get('/statistics', requireRole(['admin', 'moderator']), asyncHandler(async (req, res) => {
  const statistics = dlpService.getStatistics();
  
  res.json({
    success: true,
    statistics
  });
}));

/**
 * @swagger
 * /api/dlp/compliance/export:
 *   get:
 *     summary: Export DLP compliance data
 *     description: Generate compliance report with DLP violations and policies
 *     tags: [DLP]
 *     security:
 *       - bearerAuth: []
 */
router.get('/compliance/export', requireRole(['admin']), [
  query('format').optional().isIn(['json', 'csv']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const {
    format = 'json',
    startDate,
    endDate
  } = req.query;

  const options = { format };
  
  if (startDate || endDate) {
    options.timeRange = {
      start: startDate ? new Date(startDate).getTime() : 0,
      end: endDate ? new Date(endDate).getTime() : Date.now()
    };
  }

  const complianceData = dlpService.exportComplianceData(options);

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="dlp-compliance-report.csv"');
    res.send(complianceData);
  } else {
    res.json({
      success: true,
      complianceData
    });
  }
}));

/**
 * @swagger
 * /api/dlp/test:
 *   post:
 *     summary: Test DLP patterns
 *     description: Test DLP detection patterns with sample content
 *     tags: [DLP]
 *     security:
 *       - bearerAuth: []
 */
router.post('/test', requireRole(['admin']), [
  body('content').isString().isLength({ min: 1 }),
  body('patterns').optional().isArray()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { content, patterns } = req.body;
  
  // Perform test scan without applying policies (dry run)
  const testContext = {
    userId: req.user.id,
    testMode: true,
    timestamp: Date.now()
  };

  const scanResult = await dlpService.scanContent(content, testContext);
  
  // Remove policy applications for test mode
  const testResult = {
    ...scanResult,
    testMode: true,
    policyResults: null // Don't apply policies in test mode
  };

  res.json({
    success: true,
    testResult
  });
}));

export default router;