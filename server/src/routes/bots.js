import express from 'express';
import botService from '../services/bots.js';

const router = express.Router();

/**
 * @swagger
 * /api/bots/slack/commands:
 *   post:
 *     tags: [Bot Integration]
 *     summary: Handle Slack slash commands
 *     description: Endpoint for Slack slash commands integration
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *               team_id:
 *                 type: string
 *               team_domain:
 *                 type: string
 *               channel_id:
 *                 type: string
 *               channel_name:
 *                 type: string
 *               user_id:
 *                 type: string
 *               user_name:
 *                 type: string
 *               command:
 *                 type: string
 *               text:
 *                 type: string
 *               response_url:
 *                 type: string
 *     responses:
 *       200:
 *         description: Command processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 response_type:
 *                   type: string
 *                   enum: [in_channel, ephemeral]
 *                 text:
 *                   type: string
 *                 attachments:
 *                   type: array
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized - invalid signature
 */
router.post('/slack/commands', async (req, res) => {
  try {
    // Verify Slack request signature
    const timestamp = req.headers['x-slack-request-timestamp'];
    const signature = req.headers['x-slack-signature'];
    const requestBody = JSON.stringify(req.body);

    if (!botService.verifySlackRequest(requestBody, timestamp, signature)) {
      return res.status(401).json({ error: 'Invalid request signature' });
    }

    // Check if request is too old (replay attack protection)
    const currentTime = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTime - timestamp) > 300) { // 5 minutes
      return res.status(401).json({ error: 'Request too old' });
    }

    const response = await botService.handleSlackCommand(req.body);
    res.json(response);
  } catch (error) {
    console.error('Slack command error:', error);
    res.status(500).json({
      response_type: 'ephemeral',
      text: 'Internal server error. Please try again later.'
    });
  }
});

/**
 * @swagger
 * /api/bots/discord/interactions:
 *   post:
 *     tags: [Bot Integration]
 *     summary: Handle Discord interactions
 *     description: Endpoint for Discord slash commands and interactions
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: integer
 *                 description: Interaction type
 *               data:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   options:
 *                     type: array
 *               member:
 *                 type: object
 *               channel_id:
 *                 type: string
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Interaction processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 type:
 *                   type: integer
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid request
 */
router.post('/discord/interactions', async (req, res) => {
  try {
    const interaction = req.body;

    // Handle ping interaction
    if (interaction.type === 1) {
      return res.json({ type: 1 }); // PONG
    }

    // Handle application command
    if (interaction.type === 2) {
      const response = await botService.handleDiscordCommand(interaction);
      return res.json(response);
    }

    res.status(400).json({ error: 'Unknown interaction type' });
  } catch (error) {
    console.error('Discord interaction error:', error);
    res.status(500).json({
      type: 4,
      data: {
        content: 'Internal server error. Please try again later.',
        flags: 64 // EPHEMERAL
      }
    });
  }
});

/**
 * @swagger
 * /api/bots/send-notification:
 *   post:
 *     tags: [Bot Integration]
 *     summary: Send notification to configured platforms
 *     description: Send a notification message to Slack and/or Discord
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 description: Message to send
 *               platforms:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [slack, discord]
 *                 description: "Target platforms (default: all configured)"
 *               slackOptions:
 *                 type: object
 *                 properties:
 *                   channel:
 *                     type: string
 *                   attachments:
 *                     type: array
 *               discordOptions:
 *                 type: object
 *                 properties:
 *                   embeds:
 *                     type: array
 *     responses:
 *       200:
 *         description: Notification sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 results:
 *                   type: object
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/send-notification', async (req, res) => {
  try {
    const { message, platforms, slackOptions, discordOptions } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const options = {};
    if (slackOptions) {
      options.slackChannel = slackOptions.channel;
      options.slackAttachments = slackOptions.attachments;
    }
    if (discordOptions) {
      options.discordEmbeds = discordOptions.embeds;
    }

    const results = await botService.sendNotification(message, options);

    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

/**
 * @swagger
 * /api/bots/workspace-notification:
 *   post:
 *     tags: [Bot Integration]
 *     summary: Send workspace update notification
 *     description: Send notification about workspace changes
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - workspaceId
 *               - action
 *             properties:
 *               workspaceId:
 *                 type: string
 *               action:
 *                 type: string
 *                 enum: [created, updated, deleted, shared]
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Notification sent successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/workspace-notification', async (req, res) => {
  try {
    const { workspaceId, action, userId } = req.body;

    if (!workspaceId || !action) {
      return res.status(400).json({ error: 'Workspace ID and action are required' });
    }

    // Mock workspace and user data - in real implementation, fetch from database
    const workspace = {
      id: workspaceId,
      name: 'Sample Workspace'
    };

    const user = {
      id: userId,
      username: 'user123',
      displayName: 'John Doe'
    };

    const results = await botService.notifyWorkspaceUpdate(workspace, action, user);

    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Workspace notification error:', error);
    res.status(500).json({ error: 'Failed to send workspace notification' });
  }
});

/**
 * @swagger
 * /api/bots/note-notification:
 *   post:
 *     tags: [Bot Integration]
 *     summary: Send note update notification
 *     description: Send notification about note changes
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - noteId
 *               - action
 *             properties:
 *               noteId:
 *                 type: string
 *               action:
 *                 type: string
 *                 enum: [created, updated, deleted, shared]
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Notification sent successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/note-notification', async (req, res) => {
  try {
    const { noteId, action, userId } = req.body;

    if (!noteId || !action) {
      return res.status(400).json({ error: 'Note ID and action are required' });
    }

    // Mock note and user data - in real implementation, fetch from database
    const note = {
      id: noteId,
      title: 'Sample Note'
    };

    const user = {
      id: userId,
      username: 'user123',
      displayName: 'John Doe'
    };

    const results = await botService.notifyNoteUpdate(note, action, user);

    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Note notification error:', error);
    res.status(500).json({ error: 'Failed to send note notification' });
  }
});

/**
 * @swagger
 * /api/bots/system-alert:
 *   post:
 *     tags: [Bot Integration]
 *     summary: Send system alert
 *     description: Send system alert to configured platforms
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - level
 *               - message
 *             properties:
 *               level:
 *                 type: string
 *                 enum: [info, warning, error, critical]
 *               message:
 *                 type: string
 *               component:
 *                 type: string
 *                 description: System component that generated the alert
 *     responses:
 *       200:
 *         description: Alert sent successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/system-alert', async (req, res) => {
  try {
    const { level, message, component } = req.body;

    if (!level || !message) {
      return res.status(400).json({ error: 'Level and message are required' });
    }

    const alert = { level, message, component };
    const results = await botService.sendSystemAlert(alert);

    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('System alert error:', error);
    res.status(500).json({ error: 'Failed to send system alert' });
  }
});

/**
 * @swagger
 * /api/bots/status:
 *   get:
 *     tags: [Bot Integration]
 *     summary: Get bot integration status
 *     description: Check which bot integrations are enabled and configured
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bot status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 slack:
 *                   type: object
 *                   properties:
 *                     enabled:
 *                       type: boolean
 *                     configured:
 *                       type: boolean
 *                 discord:
 *                   type: object
 *                   properties:
 *                     enabled:
 *                       type: boolean
 *                     configured:
 *                       type: boolean
 *                 commands:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/status', async (req, res) => {
  try {
    const slackConfigured = !!(botService.slackConfig.botToken || botService.slackConfig.webhookUrl);
    const discordConfigured = !!botService.discordConfig.webhookUrl;

    const commands = Array.from(botService.commands.entries()).map(([name, cmd]) => ({
      name,
      description: cmd.description
    }));

    res.json({
      slack: {
        enabled: botService.slackConfig.enabled,
        configured: slackConfigured
      },
      discord: {
        enabled: botService.discordConfig.enabled,
        configured: discordConfigured
      },
      commands
    });
  } catch (error) {
    console.error('Bot status error:', error);
    res.status(500).json({ error: 'Failed to get bot status' });
  }
});

export default router;