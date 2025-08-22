/**
 * AI-Powered Features API Routes
 * 
 * Provides endpoints for AI-powered content suggestions, smart tags,
 * content analysis, and intelligent auto-completion.
 */

import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { body, query, validationResult } from 'express-validator';
import { asyncHandler } from '../utils/errorHandler.js';
import aiService from '../services/aiService.js';
import { SECURITY_EVENTS, logSecurityEvent } from '../utils/logger.js';

const router = express.Router();

/**
 * @swagger
 * /api/ai/suggestions:
 *   post:
 *     summary: Get AI-powered content suggestions
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentContent:
 *                 type: string
 *                 description: Current note content
 *               cursorPosition:
 *                 type: integer
 *                 description: Current cursor position
 *               title:
 *                 type: string
 *                 description: Note title
 *               noteId:
 *                 type: string
 *                 description: Note ID
 *               workspaceId:
 *                 type: string
 *                 description: Workspace ID
 *             required:
 *               - currentContent
 *     responses:
 *       200:
 *         description: Content suggestions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 suggestions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                       text:
 *                         type: string
 *                       confidence:
 *                         type: number
 *                       category:
 *                         type: string
 *                 responseTime:
 *                   type: integer
 */
router.post('/suggestions',
  authenticateToken,
  [
    body('currentContent')
      .isString()
      .withMessage('Content must be a string')
      .isLength({ max: 50000 })
      .withMessage('Content too long'),
    body('cursorPosition')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Cursor position must be non-negative integer'),
    body('title')
      .optional()
      .isString()
      .isLength({ max: 200 })
      .withMessage('Title too long'),
    body('noteId')
      .optional()
      .isString()
      .withMessage('Note ID must be a string'),
    body('workspaceId')
      .optional()
      .isString()
      .withMessage('Workspace ID must be a string')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: errors.array()
      });
    }

    const startTime = Date.now();
    
    try {
      const context = {
        ...req.body,
        userId: req.user.id,
        cursorPosition: req.body.cursorPosition || req.body.currentContent.length
      };

      const suggestions = await aiService.getContentSuggestions(context);
      
      const responseTime = Date.now() - startTime;
      
      res.json({
        success: true,
        data: {
          suggestions,
          responseTime,
          requestId: `ai_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
        }
      });

    } catch (error) {
      console.error('AI suggestions error:', error);
      
      await logSecurityEvent(SECURITY_EVENTS.AI_SUGGESTION_ERROR, {
        userId: req.user.id,
        error: error.message,
        noteId: req.body.noteId
      });

      res.status(500).json({
        success: false,
        error: 'Failed to generate suggestions',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  })
);

/**
 * @swagger
 * /api/ai/tags:
 *   post:
 *     summary: Generate smart tags for content
 *     tags: [AI]
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
 *                 description: Content to analyze
 *               title:
 *                 type: string
 *                 description: Content title
 *             required:
 *               - content
 *     responses:
 *       200:
 *         description: Generated tags
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tags:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.post('/tags',
  authenticateToken,
  [
    body('content')
      .isString()
      .withMessage('Content must be a string')
      .isLength({ min: 10, max: 50000 })
      .withMessage('Content must be between 10 and 50000 characters'),
    body('title')
      .optional()
      .isString()
      .isLength({ max: 200 })
      .withMessage('Title too long')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: errors.array()
      });
    }

    try {
      const { content, title = '' } = req.body;
      const tags = await aiService.generateSmartTags(content, title);
      
      res.json({
        success: true,
        data: {
          tags,
          generatedAt: new Date().toISOString()
        }
      });

      // Log tag generation
      await logSecurityEvent(SECURITY_EVENTS.AI_TAGS_GENERATED, {
        userId: req.user.id,
        tagsCount: tags.length,
        contentLength: content.length
      });

    } catch (error) {
      console.error('Smart tags error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate tags'
      });
    }
  })
);

/**
 * @swagger
 * /api/ai/analyze:
 *   post:
 *     summary: Analyze content for insights and improvements
 *     tags: [AI]
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
 *                 description: Content to analyze
 *             required:
 *               - content
 *     responses:
 *       200:
 *         description: Content analysis results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 analysis:
 *                   type: object
 *                   properties:
 *                     readability:
 *                       type: object
 *                     structure:
 *                       type: object
 *                     suggestions:
 *                       type: array
 *                     insights:
 *                       type: array
 */
router.post('/analyze',
  authenticateToken,
  [
    body('content')
      .isString()
      .withMessage('Content must be a string')
      .isLength({ min: 50, max: 50000 })
      .withMessage('Content must be between 50 and 50000 characters')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: errors.array()
      });
    }

    try {
      const { content } = req.body;
      const analysis = await aiService.analyzeContent(content);
      
      if (!analysis) {
        return res.status(503).json({
          success: false,
          error: 'Content analysis is not available'
        });
      }
      
      res.json({
        success: true,
        data: {
          analysis,
          analyzedAt: new Date().toISOString()
        }
      });

      // Log content analysis
      await logSecurityEvent(SECURITY_EVENTS.AI_CONTENT_ANALYZED, {
        userId: req.user.id,
        contentLength: content.length,
        suggestionsCount: analysis.suggestions?.length || 0
      });

    } catch (error) {
      console.error('Content analysis error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to analyze content'
      });
    }
  })
);

/**
 * @swagger
 * /api/ai/templates:
 *   get:
 *     summary: Get available content templates
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter templates by type
 *     responses:
 *       200:
 *         description: Available templates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 templates:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/templates',
  authenticateToken,
  [
    query('type')
      .optional()
      .isString()
      .withMessage('Type must be a string')
  ],
  asyncHandler(async (req, res) => {
    try {
      const { type } = req.query;
      
      // Get common templates from AI service
      const allTemplates = [
        {
          id: 'meeting',
          name: 'Meeting Notes',
          description: 'Structure for meeting notes with agenda and action items',
          template: '# Meeting Notes - {date}\n\n## Attendees\n- \n\n## Agenda\n1. \n\n## Discussion\n\n\n## Action Items\n- [ ] \n\n## Next Steps\n',
          category: 'business'
        },
        {
          id: 'project',
          name: 'Project Planning',
          description: 'Template for project planning and tracking',
          template: '# Project: {title}\n\n## Overview\n\n\n## Goals\n- \n\n## Tasks\n- [ ] \n\n## Timeline\n\n\n## Resources\n- \n\n## Notes\n',
          category: 'planning'
        },
        {
          id: 'daily',
          name: 'Daily Notes',
          description: 'Daily reflection and planning template',
          template: '# Daily Notes - {date}\n\n## Today\'s Goals\n- [ ] \n\n## Completed\n- \n\n## Notes & Observations\n\n\n## Tomorrow\n- [ ] \n\n## Reflection\n',
          category: 'personal'
        },
        {
          id: 'brainstorm',
          name: 'Brainstorming Session',
          description: 'Structure for brainstorming and idea generation',
          template: '# Brainstorming - {topic}\n\n## Problem Statement\n\n\n## Ideas\n- \n\n## Key Insights\n\n\n## Next Actions\n- [ ] \n\n## Follow-up Questions\n- ',
          category: 'creative'
        },
        {
          id: 'research',
          name: 'Research Notes',
          description: 'Template for research and study notes',
          template: '# Research: {topic}\n\n## Research Question\n\n\n## Key Sources\n- \n\n## Findings\n\n\n## Analysis\n\n\n## Conclusions\n\n\n## References\n- ',
          category: 'academic'
        }
      ];

      const templates = type 
        ? allTemplates.filter(t => t.category === type || t.id === type)
        : allTemplates;

      res.json({
        success: true,
        data: {
          templates,
          categories: [...new Set(allTemplates.map(t => t.category))]
        }
      });

    } catch (error) {
      console.error('Templates error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get templates'
      });
    }
  })
);

/**
 * @swagger
 * /api/ai/statistics:
 *   get:
 *     summary: Get AI service statistics (admin only)
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: AI service statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statistics:
 *                   type: object
 */
router.get('/statistics',
  authenticateToken,
  requireRole(['admin']),
  asyncHandler(async (req, res) => {
    try {
      const statistics = aiService.getStatistics();
      
      res.json({
        success: true,
        data: {
          statistics,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('AI statistics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get statistics'
      });
    }
  })
);

/**
 * @swagger
 * /api/ai/cleanup:
 *   post:
 *     summary: Clean up AI service caches (admin only)
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cleanup completed
 */
router.post('/cleanup',
  authenticateToken,
  requireRole(['admin']),
  asyncHandler(async (req, res) => {
    try {
      await aiService.cleanupCaches();
      
      res.json({
        success: true,
        message: 'AI service caches cleaned up successfully'
      });

    } catch (error) {
      console.error('AI cleanup error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cleanup caches'
      });
    }
  })
);

export default router;