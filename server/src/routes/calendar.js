import express from 'express';
import calendarService from '../services/calendar.js';

const router = express.Router();

/**
 * @swagger
 * /api/calendar/auth/{provider}:
 *   get:
 *     tags: [Calendar Integration]
 *     summary: Get calendar authorization URL
 *     description: Get authorization URL for calendar provider (Google or Outlook)
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, outlook]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Authorization URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authUrl:
 *                   type: string
 *                 provider:
 *                   type: string
 *       400:
 *         description: Invalid provider or configuration error
 *       401:
 *         description: Unauthorized
 */
router.get('/auth/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const userId = req.user?.id || 'user123'; // Mock user ID
    
    let authUrl;
    
    if (provider === 'google') {
      authUrl = calendarService.getGoogleAuthUrl(userId);
    } else if (provider === 'outlook') {
      authUrl = calendarService.getOutlookAuthUrl(userId);
    } else {
      return res.status(400).json({ error: 'Invalid provider. Use "google" or "outlook"' });
    }

    res.json({ authUrl, provider });
  } catch (error) {
    console.error('Calendar auth error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/calendar/callback/{provider}:
 *   post:
 *     tags: [Calendar Integration]
 *     summary: Handle calendar authorization callback
 *     description: Exchange authorization code for access tokens
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, outlook]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: Authorization code from provider
 *               state:
 *                 type: string
 *                 description: State parameter (usually user ID)
 *     responses:
 *       200:
 *         description: Calendar connected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 provider:
 *                   type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request or authorization failed
 */
router.post('/callback/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const { code, state } = req.body;
    const userId = state || req.user?.id || 'user123'; // Mock user ID

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    let tokens;
    
    if (provider === 'google') {
      tokens = await calendarService.exchangeGoogleCode(code, userId);
    } else if (provider === 'outlook') {
      tokens = await calendarService.exchangeOutlookCode(code, userId);
    } else {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    res.json({
      success: true,
      provider,
      message: `${provider} Calendar connected successfully`
    });
  } catch (error) {
    console.error('Calendar callback error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/calendar/events/{provider}:
 *   get:
 *     tags: [Calendar Integration]
 *     summary: List calendar events
 *     description: Get list of events from connected calendar
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, outlook]
 *       - in: query
 *         name: timeMin
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Lower bound for event start time
 *       - in: query
 *         name: timeMax
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Upper bound for event start time
 *       - in: query
 *         name: maxResults
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of events to return
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Events retrieved successfully
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
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       startTime:
 *                         type: string
 *                         format: date-time
 *                       endTime:
 *                         type: string
 *                         format: date-time
 *                       location:
 *                         type: string
 *                       attendees:
 *                         type: array
 *                         items:
 *                           type: string
 *                       provider:
 *                         type: string
 *                 provider:
 *                   type: string
 *       400:
 *         description: Invalid request or calendar not connected
 *       401:
 *         description: Unauthorized
 */
router.get('/events/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const userId = req.user?.id || 'user123'; // Mock user ID
    
    const options = {
      timeMin: req.query.timeMin,
      timeMax: req.query.timeMax,
      maxResults: parseInt(req.query.maxResults) || 50
    };

    let events;
    
    if (provider === 'google') {
      events = await calendarService.listGoogleEvents(userId, options);
    } else if (provider === 'outlook') {
      events = await calendarService.listOutlookEvents(userId, {
        startTime: options.timeMin,
        endTime: options.timeMax,
        top: options.maxResults
      });
    } else {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    res.json({ events, provider });
  } catch (error) {
    console.error('Calendar events error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/calendar/events/{provider}:
 *   post:
 *     tags: [Calendar Integration]
 *     summary: Create calendar event
 *     description: Create a new event in connected calendar
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, outlook]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - startTime
 *               - endTime
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               timeZone:
 *                 type: string
 *                 default: UTC
 *               attendees:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: email
 *               calendarId:
 *                 type: string
 *                 description: Calendar ID (Google only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Event created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 event:
 *                   type: object
 *                 provider:
 *                   type: string
 *       400:
 *         description: Invalid request data or calendar not connected
 *       401:
 *         description: Unauthorized
 */
router.post('/events/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const userId = req.user?.id || 'user123'; // Mock user ID
    const eventData = req.body;

    if (!eventData.title || !eventData.startTime || !eventData.endTime) {
      return res.status(400).json({ 
        error: 'Title, startTime, and endTime are required' 
      });
    }

    let event;
    
    if (provider === 'google') {
      event = await calendarService.createGoogleEvent(userId, eventData);
    } else if (provider === 'outlook') {
      event = await calendarService.createOutlookEvent(userId, eventData);
    } else {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    res.status(201).json({ event, provider });
  } catch (error) {
    console.error('Calendar create event error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/calendar/workspace-meeting:
 *   post:
 *     tags: [Calendar Integration]
 *     summary: Create meeting from workspace
 *     description: Create a calendar meeting for a workspace
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - workspaceId
 *               - startTime
 *               - endTime
 *             properties:
 *               workspaceId:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               attendees:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: email
 *               provider:
 *                 type: string
 *                 enum: [google, outlook]
 *                 default: google
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Meeting created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 event:
 *                   type: object
 *                 workspaceId:
 *                   type: string
 *                 provider:
 *                   type: string
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/workspace-meeting', async (req, res) => {
  try {
    const userId = req.user?.id || 'user123'; // Mock user ID
    const { workspaceId, ...meetingData } = req.body;

    if (!workspaceId || !meetingData.startTime || !meetingData.endTime) {
      return res.status(400).json({ 
        error: 'WorkspaceId, startTime, and endTime are required' 
      });
    }

    const event = await calendarService.createMeetingFromWorkspace(
      userId, 
      workspaceId, 
      meetingData
    );

    res.status(201).json({ 
      event, 
      workspaceId, 
      provider: meetingData.provider || 'google' 
    });
  } catch (error) {
    console.error('Workspace meeting error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/calendar/calendars/{provider}:
 *   get:
 *     tags: [Calendar Integration]
 *     summary: Get user's calendars
 *     description: Get list of calendars for connected provider
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, outlook]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Calendars retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 calendars:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       primary:
 *                         type: boolean
 *                 provider:
 *                   type: string
 *       400:
 *         description: Invalid provider or calendar not connected
 *       401:
 *         description: Unauthorized
 */
router.get('/calendars/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const userId = req.user?.id || 'user123'; // Mock user ID

    const calendars = await calendarService.getUserCalendars(userId, provider);

    res.json({ calendars, provider });
  } catch (error) {
    console.error('Get calendars error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/calendar/sync/{workspaceId}:
 *   post:
 *     tags: [Calendar Integration]
 *     summary: Sync workspace events with calendar
 *     description: Sync workspace events to connected calendar
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [google, outlook]
 *                 default: google
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Events synced successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 syncedEvents:
 *                   type: array
 *                 workspaceId:
 *                   type: string
 *                 provider:
 *                   type: string
 *       400:
 *         description: Invalid request or sync failed
 *       401:
 *         description: Unauthorized
 */
router.post('/sync/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { provider = 'google' } = req.body;
    const userId = req.user?.id || 'user123'; // Mock user ID

    const syncedEvents = await calendarService.syncWorkspaceEvents(
      userId, 
      workspaceId, 
      provider
    );

    res.json({ syncedEvents, workspaceId, provider });
  } catch (error) {
    console.error('Calendar sync error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/calendar/disconnect/{provider}:
 *   delete:
 *     tags: [Calendar Integration]
 *     summary: Disconnect calendar integration
 *     description: Remove calendar integration for user
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, outlook]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Calendar disconnected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 provider:
 *                   type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid provider
 *       401:
 *         description: Unauthorized
 */
router.delete('/disconnect/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const userId = req.user?.id || 'user123'; // Mock user ID

    const success = calendarService.disconnectCalendar(userId, provider);

    res.json({
      success,
      provider,
      message: `${provider} Calendar disconnected successfully`
    });
  } catch (error) {
    console.error('Calendar disconnect error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/calendar/status:
 *   get:
 *     tags: [Calendar Integration]
 *     summary: Get calendar integration status
 *     description: Check which calendar integrations are enabled and connected
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
 *                 integrations:
 *                   type: object
 *                 userConnections:
 *                   type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/status', async (req, res) => {
  try {
    const userId = req.user?.id || 'user123'; // Mock user ID
    
    const integrations = calendarService.getIntegrationStatus();
    const userConnections = {
      google: calendarService.hasCalendarConnected(userId, 'google'),
      outlook: calendarService.hasCalendarConnected(userId, 'outlook')
    };

    res.json({ integrations, userConnections });
  } catch (error) {
    console.error('Calendar status error:', error);
    res.status(500).json({ error: 'Failed to get calendar status' });
  }
});

export default router;