/**
 * Advanced Search API Routes
 * 
 * Provides comprehensive search functionality with full-text search,
 * faceted filtering, search analytics, and real-time suggestions.
 */

import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { body, query, validationResult } from 'express-validator';
import { asyncHandler } from '../utils/errorHandler.js';
import searchService from '../services/search.js';
import { SECURITY_EVENTS, logSecurityEvent } from '../utils/logger.js';

const router = express.Router();

/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: Perform advanced search across all content types
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: Search query
 *       - in: query
 *         name: contentTypes
 *         schema:
 *           type: string
 *         description: Comma-separated list of content types (notes,workspaces,files,users,chat)
 *       - in: query
 *         name: workspaceId
 *         schema:
 *           type: string
 *         description: Limit search to specific workspace
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of results to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of results to skip
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [relevance, date]
 *           default: relevance
 *         description: Sort order for results
 *       - in: query
 *         name: includeHighlights
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include search result highlights
 *       - in: query
 *         name: dateStart
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter results from this date
 *       - in: query
 *         name: dateEnd
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter results until this date
 *       - in: query
 *         name: author
 *         schema:
 *           type: string
 *         description: Filter by author ID (for notes)
 *     responses:
 *       200:
 *         description: Search results with metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 query:
 *                   type: string
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                 totalResults:
 *                   type: integer
 *                 hasMore:
 *                   type: boolean
 *                 responseTime:
 *                   type: integer
 *                 facets:
 *                   type: object
 *                 suggestions:
 *                   type: array
 *                   items:
 *                     type: string
 *                 searchId:
 *                   type: string
 *       400:
 *         description: Invalid search parameters
 *       429:
 *         description: Too many search requests
 */
router.get('/', 
  authenticateToken,
  [
    query('q')
      .notEmpty()
      .withMessage('Search query is required')
      .isLength({ min: 2, max: 200 })
      .withMessage('Query must be between 2 and 200 characters'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be non-negative'),
    query('sortBy')
      .optional()
      .isIn(['relevance', 'date'])
      .withMessage('Sort must be either relevance or date'),
    query('contentTypes')
      .optional()
      .custom((value) => {
        if (value) {
          const types = value.split(',');
          const validTypes = ['notes', 'workspaces', 'files', 'users', 'chat'];
          return types.every(type => validTypes.includes(type.trim()));
        }
        return true;
      })
      .withMessage('Invalid content types')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid search parameters',
        details: errors.array()
      });
    }

    const {
      q: query,
      contentTypes,
      workspaceId,
      limit = 20,
      offset = 0,
      sortBy = 'relevance',
      includeHighlights = true,
      dateStart,
      dateEnd,
      author
    } = req.query;

    // Parse content types
    const parsedContentTypes = contentTypes ? 
      contentTypes.split(',').map(type => type.trim()) : 
      undefined;

    // Build filters
    const filters = {};
    if (dateStart && dateEnd) {
      filters.dateRange = { start: dateStart, end: dateEnd };
    }
    if (author) {
      filters.author = author;
    }

    const searchOptions = {
      userId: req.user.id,
      contentTypes: parsedContentTypes,
      filters,
      limit: parseInt(limit),
      offset: parseInt(offset),
      sortBy,
      includeHighlights: includeHighlights === 'true',
      workspaceId,
      sessionId: req.sessionID,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    try {
      const searchResult = await searchService.search(query, searchOptions);
      
      res.json({
        success: true,
        data: searchResult
      });

      // Log successful search for analytics
      await logSecurityEvent(SECURITY_EVENTS.SEARCH_PERFORMED, {
        userId: req.user.id,
        query,
        resultsCount: searchResult.totalResults,
        responseTime: searchResult.responseTime,
        searchId: searchResult.searchId
      });

    } catch (error) {
      console.error('Search error:', error);
      
      await logSecurityEvent(SECURITY_EVENTS.SEARCH_ERROR, {
        userId: req.user.id,
        query,
        error: error.message
      });

      if (error.message.includes('Access denied')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to workspace'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Search operation failed',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  })
);

/**
 * @swagger
 * /api/search/suggestions:
 *   get:
 *     summary: Get search suggestions based on query
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: Partial search query
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of suggestions to return
 *     responses:
 *       200:
 *         description: Search suggestions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 suggestions:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.get('/suggestions',
  authenticateToken,
  [
    query('q')
      .notEmpty()
      .withMessage('Query is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Query must be between 2 and 100 characters'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('Limit must be between 1 and 20')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid parameters',
        details: errors.array()
      });
    }

    const { q: query, limit = 10 } = req.query;

    try {
      const suggestions = await searchService.generateSuggestions(query);
      
      res.json({
        success: true,
        data: {
          suggestions: suggestions.slice(0, parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Search suggestions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate suggestions'
      });
    }
  })
);

/**
 * @swagger
 * /api/search/analytics:
 *   get:
 *     summary: Get search analytics (admin only)
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Search analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalSearches:
 *                   type: integer
 *                 popularQueries:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       query:
 *                         type: string
 *                       count:
 *                         type: integer
 *                 avgResponseTime:
 *                   type: integer
 *                 noResultsQueries:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/analytics',
  authenticateToken,
  requireRole(['admin']),
  asyncHandler(async (req, res) => {
    try {
      const analytics = searchService.getAnalytics();
      
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Search analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve search analytics'
      });
    }
  })
);

/**
 * @swagger
 * /api/search/click:
 *   post:
 *     summary: Log search result click for analytics
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               searchId:
 *                 type: string
 *               resultId:
 *                 type: string
 *               resultType:
 *                 type: string
 *                 enum: [notes, workspaces, files, users, chat]
 *             required:
 *               - searchId
 *               - resultId
 *               - resultType
 *     responses:
 *       200:
 *         description: Click logged successfully
 *       400:
 *         description: Invalid click data
 */
router.post('/click',
  authenticateToken,
  [
    body('searchId')
      .notEmpty()
      .withMessage('Search ID is required'),
    body('resultId')
      .notEmpty()
      .withMessage('Result ID is required'),
    body('resultType')
      .isIn(['notes', 'workspaces', 'files', 'users', 'chat'])
      .withMessage('Invalid result type')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid click data',
        details: errors.array()
      });
    }

    const { searchId, resultId, resultType } = req.body;

    try {
      await searchService.logSearchClick(searchId, resultId, resultType);
      
      res.json({
        success: true,
        message: 'Click logged successfully'
      });
    } catch (error) {
      console.error('Search click logging error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to log search click'
      });
    }
  })
);

/**
 * @swagger
 * /api/search/facets:
 *   get:
 *     summary: Get available search facets for filtering
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: workspaceId
 *         schema:
 *           type: string
 *         description: Get facets for specific workspace
 *     responses:
 *       200:
 *         description: Available search facets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 contentTypes:
 *                   type: array
 *                   items:
 *                     type: string
 *                 authors:
 *                   type: array
 *                   items:
 *                     type: object
 *                 workspaces:
 *                   type: array
 *                   items:
 *                     type: object
 *                 dateRanges:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.get('/facets',
  authenticateToken,
  asyncHandler(async (req, res) => {
    try {
      // For facets, we'll perform an empty search to get the structure
      const searchResult = await searchService.search('', {
        userId: req.user.id,
        workspaceId: req.query.workspaceId,
        limit: 0  // Don't return actual results, just facets
      });
      
      res.json({
        success: true,
        data: {
          facets: searchResult.facets,
          contentTypes: ['notes', 'workspaces', 'files', 'users', 'chat']
        }
      });
    } catch (error) {
      console.error('Search facets error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve search facets'
      });
    }
  })
);

/**
 * @swagger
 * /api/search/export:
 *   get:
 *     summary: Export search analytics data (admin only)
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *         description: Export format
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, all]
 *           default: 30d
 *         description: Time range for export
 *     responses:
 *       200:
 *         description: Search analytics export
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *           text/csv:
 *             schema:
 *               type: string
 */
router.get('/export',
  authenticateToken,
  requireRole(['admin']),
  [
    query('format')
      .optional()
      .isIn(['json', 'csv'])
      .withMessage('Format must be json or csv'),
    query('timeRange')
      .optional()
      .isIn(['7d', '30d', '90d', 'all'])
      .withMessage('Invalid time range')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid export parameters',
        details: errors.array()
      });
    }

    const { format = 'json', timeRange = '30d' } = req.query;

    try {
      const analytics = searchService.getAnalytics();
      
      if (format === 'csv') {
        const csvData = [
          ['Query', 'Count', 'Last Searched'],
          ...analytics.popularQueries.map(item => [
            item.query,
            item.count,
            new Date().toISOString()
          ])
        ].map(row => row.join(',')).join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="search-analytics-${timeRange}.csv"`);
        res.send(csvData);
      } else {
        res.json({
          success: true,
          data: {
            ...analytics,
            exportedAt: new Date().toISOString(),
            timeRange
          }
        });
      }
    } catch (error) {
      console.error('Search export error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export search analytics'
      });
    }
  })
);

export default router;