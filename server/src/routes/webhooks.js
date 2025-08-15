import express from 'express';
import webhooksService from '../services/webhooks.js';

const router = express.Router();

/**
 * @swagger
 * /api/webhooks:
 *   get:
 *     tags: [Webhooks]
 *     summary: Get user's webhooks
 *     description: Retrieve all webhooks configured by the user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Webhooks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 webhooks:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       url:
 *                         type: string
 *                       events:
 *                         type: array
 *                         items:
 *                           type: string
 *                       active:
 *                         type: boolean
 *                       description:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       successCount:
 *                         type: integer
 *                       failureCount:
 *                         type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id || 'user123'; // Mock user ID
    const webhooks = webhooksService.getUserWebhooks(userId);

    res.json({ webhooks });
  } catch (error) {
    console.error('Get webhooks error:', error);
    res.status(500).json({ error: 'Failed to retrieve webhooks' });
  }
});

/**
 * @swagger
 * /api/webhooks:
 *   post:
 *     tags: [Webhooks]
 *     summary: Create a new webhook
 *     description: Register a new webhook endpoint
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: Webhook endpoint URL
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Event types to subscribe to (* for all)
 *                 default: ["*"]
 *               secret:
 *                 type: string
 *                 description: Secret for HMAC signature verification
 *               description:
 *                 type: string
 *                 description: Human-readable description of the webhook
 *               metadata:
 *                 type: object
 *                 description: Additional metadata for the webhook
 *     responses:
 *       201:
 *         description: Webhook created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 webhook:
 *                   type: object
 *       400:
 *         description: Invalid webhook data
 *       401:
 *         description: Unauthorized
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id || 'user123'; // Mock user ID
    const webhookData = req.body;

    if (!webhookData.url) {
      return res.status(400).json({ error: 'Webhook URL is required' });
    }

    const webhook = webhooksService.registerWebhook(userId, webhookData);

    res.status(201).json({ webhook });
  } catch (error) {
    console.error('Create webhook error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/webhooks/{webhookId}:
 *   get:
 *     tags: [Webhooks]
 *     summary: Get webhook details
 *     description: Retrieve details of a specific webhook
 *     parameters:
 *       - in: path
 *         name: webhookId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Webhook details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 webhook:
 *                   type: object
 *       404:
 *         description: Webhook not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:webhookId', async (req, res) => {
  try {
    const { webhookId } = req.params;
    const webhook = webhooksService.getWebhook(webhookId);

    res.json({ webhook });
  } catch (error) {
    console.error('Get webhook error:', error);
    if (error.message === 'Webhook not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to retrieve webhook' });
    }
  }
});

/**
 * @swagger
 * /api/webhooks/{webhookId}:
 *   put:
 *     tags: [Webhooks]
 *     summary: Update webhook
 *     description: Update webhook configuration
 *     parameters:
 *       - in: path
 *         name: webhookId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *               secret:
 *                 type: string
 *               active:
 *                 type: boolean
 *               description:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Webhook updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 webhook:
 *                   type: object
 *       400:
 *         description: Invalid update data
 *       404:
 *         description: Webhook not found
 *       401:
 *         description: Unauthorized
 */
router.put('/:webhookId', async (req, res) => {
  try {
    const { webhookId } = req.params;
    const updates = req.body;

    const webhook = webhooksService.updateWebhook(webhookId, updates);

    res.json({ webhook });
  } catch (error) {
    console.error('Update webhook error:', error);
    if (error.message === 'Webhook not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

/**
 * @swagger
 * /api/webhooks/{webhookId}:
 *   delete:
 *     tags: [Webhooks]
 *     summary: Delete webhook
 *     description: Remove a webhook endpoint
 *     parameters:
 *       - in: path
 *         name: webhookId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Webhook deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Webhook not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:webhookId', async (req, res) => {
  try {
    const { webhookId } = req.params;
    
    webhooksService.deleteWebhook(webhookId);

    res.json({
      success: true,
      message: 'Webhook deleted successfully'
    });
  } catch (error) {
    console.error('Delete webhook error:', error);
    if (error.message === 'Webhook not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to delete webhook' });
    }
  }
});

/**
 * @swagger
 * /api/webhooks/{webhookId}/test:
 *   post:
 *     tags: [Webhooks]
 *     summary: Test webhook
 *     description: Send a test payload to the webhook endpoint
 *     parameters:
 *       - in: path
 *         name: webhookId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Test completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 statusCode:
 *                   type: integer
 *                 duration:
 *                   type: integer
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Webhook not found
 *       401:
 *         description: Unauthorized
 */
router.post('/:webhookId/test', async (req, res) => {
  try {
    const { webhookId } = req.params;
    
    const result = await webhooksService.testWebhook(webhookId);

    res.json(result);
  } catch (error) {
    console.error('Test webhook error:', error);
    if (error.message === 'Webhook not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to test webhook' });
    }
  }
});

/**
 * @swagger
 * /api/webhooks/{webhookId}/logs:
 *   get:
 *     tags: [Webhooks]
 *     summary: Get webhook delivery logs
 *     description: Retrieve delivery history for a webhook
 *     parameters:
 *       - in: path
 *         name: webhookId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of logs to return
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 logs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       eventType:
 *                         type: string
 *                       success:
 *                         type: boolean
 *                       statusCode:
 *                         type: integer
 *                       duration:
 *                         type: integer
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *       404:
 *         description: Webhook not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:webhookId/logs', async (req, res) => {
  try {
    const { webhookId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const logs = webhooksService.getWebhookLogs(webhookId, limit);

    res.json({ logs });
  } catch (error) {
    console.error('Get webhook logs error:', error);
    if (error.message === 'Webhook not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to retrieve webhook logs' });
    }
  }
});

/**
 * @swagger
 * /api/webhooks/{webhookId}/stats:
 *   get:
 *     tags: [Webhooks]
 *     summary: Get webhook statistics
 *     description: Get delivery statistics and performance metrics
 *     parameters:
 *       - in: path
 *         name: webhookId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalDeliveries:
 *                       type: integer
 *                     successCount:
 *                       type: integer
 *                     failureCount:
 *                       type: integer
 *                     successRate:
 *                       type: number
 *                     lastTriggered:
 *                       type: string
 *                       format: date-time
 *                     recentActivity:
 *                       type: object
 *       404:
 *         description: Webhook not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:webhookId/stats', async (req, res) => {
  try {
    const { webhookId } = req.params;

    const stats = webhooksService.getWebhookStats(webhookId);

    res.json({ stats });
  } catch (error) {
    console.error('Get webhook stats error:', error);
    if (error.message === 'Webhook not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to retrieve webhook statistics' });
    }
  }
});

/**
 * @swagger
 * /api/webhooks/trigger:
 *   post:
 *     tags: [Webhooks]
 *     summary: Trigger webhook event (Admin only)
 *     description: Manually trigger a webhook event for testing
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventType
 *               - eventData
 *             properties:
 *               eventType:
 *                 type: string
 *                 description: Type of event to trigger
 *               eventData:
 *                 type: object
 *                 description: Event payload data
 *               userId:
 *                 type: string
 *                 description: Filter to specific user's webhooks
 *     responses:
 *       200:
 *         description: Event triggered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 eventId:
 *                   type: string
 *                 triggered:
 *                   type: integer
 *                 results:
 *                   type: array
 *       400:
 *         description: Invalid event data
 *       401:
 *         description: Unauthorized
 */
router.post('/trigger', async (req, res) => {
  try {
    const { eventType, eventData, userId } = req.body;

    if (!eventType || !eventData) {
      return res.status(400).json({ error: 'Event type and data are required' });
    }

    const result = await webhooksService.triggerEvent(eventType, eventData, userId);

    res.json(result);
  } catch (error) {
    console.error('Trigger event error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/webhooks/events:
 *   get:
 *     tags: [Webhooks]
 *     summary: Get supported events
 *     description: List all supported webhook event types
 *     responses:
 *       200:
 *         description: Supported events retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 events:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                       description:
 *                         type: string
 */
router.get('/events', async (req, res) => {
  try {
    const events = webhooksService.getSupportedEvents();

    res.json({ events });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to retrieve supported events' });
  }
});

/**
 * @swagger
 * /api/webhooks/zapier/samples:
 *   get:
 *     tags: [Webhooks]
 *     summary: Get Zapier sample payloads
 *     description: Get sample webhook payloads for Zapier integration
 *     responses:
 *       200:
 *         description: Sample payloads retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 samples:
 *                   type: object
 */
router.get('/zapier/samples', async (req, res) => {
  try {
    const samples = webhooksService.getZapierSamples();

    res.json({ samples });
  } catch (error) {
    console.error('Get Zapier samples error:', error);
    res.status(500).json({ error: 'Failed to retrieve Zapier samples' });
  }
});

/**
 * @swagger
 * /api/webhooks/status:
 *   get:
 *     tags: [Webhooks]
 *     summary: Get webhooks integration status
 *     description: Get overall status of webhooks system
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: object
 *                   properties:
 *                     enabled:
 *                       type: boolean
 *                     totalWebhooks:
 *                       type: integer
 *                     activeWebhooks:
 *                       type: integer
 *                     retryQueueSize:
 *                       type: integer
 *                     supportedEvents:
 *                       type: integer
 *                     features:
 *                       type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/status', async (req, res) => {
  try {
    const status = webhooksService.getIntegrationStatus();

    res.json({ status });
  } catch (error) {
    console.error('Get webhooks status error:', error);
    res.status(500).json({ error: 'Failed to get webhooks status' });
  }
});

export default router;