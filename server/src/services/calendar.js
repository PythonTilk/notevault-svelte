import { google } from 'googleapis';
import fetch from 'node-fetch';
import crypto from 'crypto';

class CalendarIntegrationService {
  constructor() {
    this.googleConfig = {
      enabled: process.env.GOOGLE_CALENDAR_ENABLED === 'true',
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
      scopes: ['https://www.googleapis.com/auth/calendar']
    };

    this.outlookConfig = {
      enabled: process.env.OUTLOOK_CALENDAR_ENABLED === 'true',
      clientId: process.env.OUTLOOK_CLIENT_ID,
      clientSecret: process.env.OUTLOOK_CLIENT_SECRET,
      redirectUri: process.env.OUTLOOK_REDIRECT_URI,
      scopes: ['https://graph.microsoft.com/calendars.readwrite']
    };

    this.userTokens = new Map(); // In production, store in database
  }

  /**
   * Get Google Calendar authorization URL
   */
  getGoogleAuthUrl(userId, state = null) {
    if (!this.googleConfig.enabled) {
      throw new Error('Google Calendar integration is disabled');
    }

    const oauth2Client = new google.auth.OAuth2(
      this.googleConfig.clientId,
      this.googleConfig.clientSecret,
      this.googleConfig.redirectUri
    );

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.googleConfig.scopes,
      state: state || userId,
      prompt: 'consent'
    });

    return authUrl;
  }

  /**
   * Get Outlook Calendar authorization URL
   */
  getOutlookAuthUrl(userId, state = null) {
    if (!this.outlookConfig.enabled) {
      throw new Error('Outlook Calendar integration is disabled');
    }

    const params = new URLSearchParams({
      client_id: this.outlookConfig.clientId,
      response_type: 'code',
      redirect_uri: this.outlookConfig.redirectUri,
      scope: this.outlookConfig.scopes.join(' '),
      state: state || userId,
      response_mode: 'query'
    });

    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
  }

  /**
   * Exchange Google authorization code for tokens
   */
  async exchangeGoogleCode(code, userId) {
    try {
      const oauth2Client = new google.auth.OAuth2(
        this.googleConfig.clientId,
        this.googleConfig.clientSecret,
        this.googleConfig.redirectUri
      );

      const { tokens } = await oauth2Client.getToken(code);
      
      // Store tokens for user
      this.userTokens.set(`google_${userId}`, tokens);
      
      return tokens;
    } catch (error) {
      console.error('Google token exchange error:', error);
      throw new Error('Failed to exchange Google authorization code');
    }
  }

  /**
   * Exchange Outlook authorization code for tokens
   */
  async exchangeOutlookCode(code, userId) {
    try {
      const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.outlookConfig.clientId,
          client_secret: this.outlookConfig.clientSecret,
          code: code,
          redirect_uri: this.outlookConfig.redirectUri,
          grant_type: 'authorization_code'
        })
      });

      const tokens = await response.json();
      
      if (!response.ok) {
        throw new Error(tokens.error_description || 'Token exchange failed');
      }

      // Store tokens for user
      this.userTokens.set(`outlook_${userId}`, tokens);
      
      return tokens;
    } catch (error) {
      console.error('Outlook token exchange error:', error);
      throw new Error('Failed to exchange Outlook authorization code');
    }
  }

  /**
   * Get Google Calendar client for user
   */
  getGoogleCalendarClient(userId) {
    const tokens = this.userTokens.get(`google_${userId}`);
    if (!tokens) {
      throw new Error('Google Calendar not connected for this user');
    }

    const oauth2Client = new google.auth.OAuth2(
      this.googleConfig.clientId,
      this.googleConfig.clientSecret,
      this.googleConfig.redirectUri
    );

    oauth2Client.setCredentials(tokens);
    return google.calendar({ version: 'v3', auth: oauth2Client });
  }

  /**
   * Get Outlook API headers for user
   */
  getOutlookHeaders(userId) {
    const tokens = this.userTokens.get(`outlook_${userId}`);
    if (!tokens) {
      throw new Error('Outlook Calendar not connected for this user');
    }

    return {
      'Authorization': `Bearer ${tokens.access_token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * List Google Calendar events
   */
  async listGoogleEvents(userId, options = {}) {
    try {
      const calendar = this.getGoogleCalendarClient(userId);
      
      const {
        calendarId = 'primary',
        timeMin = new Date().toISOString(),
        timeMax,
        maxResults = 50,
        singleEvents = true,
        orderBy = 'startTime'
      } = options;

      const response = await calendar.events.list({
        calendarId,
        timeMin,
        timeMax,
        maxResults,
        singleEvents,
        orderBy
      });

      return response.data.items.map(event => this.formatGoogleEvent(event));
    } catch (error) {
      console.error('Google Calendar list error:', error);
      throw new Error('Failed to fetch Google Calendar events');
    }
  }

  /**
   * List Outlook Calendar events
   */
  async listOutlookEvents(userId, options = {}) {
    try {
      const headers = this.getOutlookHeaders(userId);
      
      const {
        startTime = new Date().toISOString(),
        endTime,
        top = 50
      } = options;

      let url = `https://graph.microsoft.com/v1.0/me/events?$top=${top}&$orderby=start/dateTime`;
      
      if (startTime) {
        url += `&$filter=start/dateTime ge '${startTime}'`;
      }
      if (endTime) {
        url += ` and end/dateTime le '${endTime}'`;
      }

      const response = await fetch(url, { headers });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch events');
      }

      return data.value.map(event => this.formatOutlookEvent(event));
    } catch (error) {
      console.error('Outlook Calendar list error:', error);
      throw new Error('Failed to fetch Outlook Calendar events');
    }
  }

  /**
   * Create Google Calendar event
   */
  async createGoogleEvent(userId, eventData) {
    try {
      const calendar = this.getGoogleCalendarClient(userId);
      
      const event = {
        summary: eventData.title,
        description: eventData.description,
        start: {
          dateTime: eventData.startTime,
          timeZone: eventData.timeZone || 'UTC'
        },
        end: {
          dateTime: eventData.endTime,
          timeZone: eventData.timeZone || 'UTC'
        },
        attendees: eventData.attendees?.map(email => ({ email })),
        reminders: {
          useDefault: false,
          overrides: eventData.reminders || [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 10 }
          ]
        }
      };

      const response = await calendar.events.insert({
        calendarId: eventData.calendarId || 'primary',
        resource: event
      });

      return this.formatGoogleEvent(response.data);
    } catch (error) {
      console.error('Google Calendar create error:', error);
      throw new Error('Failed to create Google Calendar event');
    }
  }

  /**
   * Create Outlook Calendar event
   */
  async createOutlookEvent(userId, eventData) {
    try {
      const headers = this.getOutlookHeaders(userId);
      
      const event = {
        subject: eventData.title,
        body: {
          contentType: 'HTML',
          content: eventData.description || ''
        },
        start: {
          dateTime: eventData.startTime,
          timeZone: eventData.timeZone || 'UTC'
        },
        end: {
          dateTime: eventData.endTime,
          timeZone: eventData.timeZone || 'UTC'
        },
        attendees: eventData.attendees?.map(email => ({
          emailAddress: { address: email, name: email }
        }))
      };

      const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
        method: 'POST',
        headers,
        body: JSON.stringify(event)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create event');
      }

      return this.formatOutlookEvent(data);
    } catch (error) {
      console.error('Outlook Calendar create error:', error);
      throw new Error('Failed to create Outlook Calendar event');
    }
  }

  /**
   * Create meeting from workspace
   */
  async createMeetingFromWorkspace(userId, workspaceId, meetingData) {
    const {
      title,
      description,
      startTime,
      endTime,
      attendees = [],
      provider = 'google' // 'google' or 'outlook'
    } = meetingData;

    const eventData = {
      title: title || `NoteVault Workspace Meeting: ${workspaceId}`,
      description: description || `Meeting for NoteVault workspace: ${workspaceId}\n\nJoin at: ${process.env.BASE_URL}/workspaces/${workspaceId}`,
      startTime,
      endTime,
      attendees,
      reminders: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 15 }
      ]
    };

    if (provider === 'google') {
      return this.createGoogleEvent(userId, eventData);
    } else if (provider === 'outlook') {
      return this.createOutlookEvent(userId, eventData);
    } else {
      throw new Error('Invalid calendar provider');
    }
  }

  /**
   * Sync workspace events with calendar
   */
  async syncWorkspaceEvents(userId, workspaceId, provider = 'google') {
    try {
      // This would typically fetch workspace events from database
      const workspaceEvents = [
        {
          id: 'event1',
          title: 'Team Standup',
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
          description: 'Daily team standup meeting'
        }
      ];

      const syncedEvents = [];

      for (const event of workspaceEvents) {
        const calendarEvent = await (provider === 'google' 
          ? this.createGoogleEvent(userId, event)
          : this.createOutlookEvent(userId, event));
        
        syncedEvents.push(calendarEvent);
      }

      return syncedEvents;
    } catch (error) {
      console.error('Workspace sync error:', error);
      throw new Error('Failed to sync workspace events');
    }
  }

  /**
   * Get user's calendars
   */
  async getUserCalendars(userId, provider = 'google') {
    try {
      if (provider === 'google') {
        const calendar = this.getGoogleCalendarClient(userId);
        const response = await calendar.calendarList.list();
        
        return response.data.items.map(cal => ({
          id: cal.id,
          name: cal.summary,
          description: cal.description,
          primary: cal.primary,
          accessRole: cal.accessRole,
          backgroundColor: cal.backgroundColor
        }));
      } else if (provider === 'outlook') {
        const headers = this.getOutlookHeaders(userId);
        const response = await fetch('https://graph.microsoft.com/v1.0/me/calendars', { headers });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || 'Failed to fetch calendars');
        }

        return data.value.map(cal => ({
          id: cal.id,
          name: cal.name,
          description: cal.description,
          canEdit: cal.canEdit,
          canShare: cal.canShare,
          color: cal.color
        }));
      }
    } catch (error) {
      console.error('Get calendars error:', error);
      throw new Error('Failed to fetch user calendars');
    }
  }

  /**
   * Format Google Calendar event
   */
  formatGoogleEvent(event) {
    return {
      id: event.id,
      title: event.summary,
      description: event.description,
      startTime: event.start?.dateTime || event.start?.date,
      endTime: event.end?.dateTime || event.end?.date,
      location: event.location,
      attendees: event.attendees?.map(a => a.email) || [],
      status: event.status,
      htmlLink: event.htmlLink,
      provider: 'google'
    };
  }

  /**
   * Format Outlook Calendar event
   */
  formatOutlookEvent(event) {
    return {
      id: event.id,
      title: event.subject,
      description: event.body?.content,
      startTime: event.start?.dateTime,
      endTime: event.end?.dateTime,
      location: event.location?.displayName,
      attendees: event.attendees?.map(a => a.emailAddress?.address) || [],
      status: event.showAs,
      webLink: event.webLink,
      provider: 'outlook'
    };
  }

  /**
   * Check if user has calendar connected
   */
  hasCalendarConnected(userId, provider = null) {
    if (provider) {
      return this.userTokens.has(`${provider}_${userId}`);
    }
    
    return this.userTokens.has(`google_${userId}`) || this.userTokens.has(`outlook_${userId}`);
  }

  /**
   * Disconnect calendar for user
   */
  disconnectCalendar(userId, provider) {
    return this.userTokens.delete(`${provider}_${userId}`);
  }

  /**
   * Get integration status
   */
  getIntegrationStatus() {
    return {
      google: {
        enabled: this.googleConfig.enabled,
        configured: !!(this.googleConfig.clientId && this.googleConfig.clientSecret)
      },
      outlook: {
        enabled: this.outlookConfig.enabled,
        configured: !!(this.outlookConfig.clientId && this.outlookConfig.clientSecret)
      }
    };
  }

  /**
   * Create calendar webhook (for real-time updates)
   */
  async createCalendarWebhook(userId, provider, webhookUrl) {
    try {
      if (provider === 'google') {
        const calendar = this.getGoogleCalendarClient(userId);
        
        const channel = {
          id: crypto.randomUUID(),
          type: 'web_hook',
          address: webhookUrl,
          token: crypto.randomBytes(32).toString('hex')
        };

        const response = await calendar.events.watch({
          calendarId: 'primary',
          resource: channel
        });

        return response.data;
      } else if (provider === 'outlook') {
        const headers = this.getOutlookHeaders(userId);
        
        const subscription = {
          changeType: 'created,updated,deleted',
          notificationUrl: webhookUrl,
          resource: '/me/events',
          expirationDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          clientState: crypto.randomBytes(32).toString('hex')
        };

        const response = await fetch('https://graph.microsoft.com/v1.0/subscriptions', {
          method: 'POST',
          headers,
          body: JSON.stringify(subscription)
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || 'Failed to create webhook');
        }

        return data;
      }
    } catch (error) {
      console.error('Create webhook error:', error);
      throw new Error('Failed to create calendar webhook');
    }
  }
}

export default new CalendarIntegrationService();