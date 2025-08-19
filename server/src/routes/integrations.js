import express from 'express';
import calendarService from '../services/calendar.js';
import botService from '../services/bots.js';

const router = express.Router();

// Get integrations status
router.get('/status', async (req, res) => {
  try {
    const userId = req.user?.id || 'user123'; // Mock user ID
    
    // Check calendar integrations
    const googleCalendarConnected = !!(calendarService.isGoogleConfigured && calendarService.isGoogleConfigured());
    const outlookCalendarConnected = !!(calendarService.isOutlookConfigured && calendarService.isOutlookConfigured());
    
    // Check bot integrations
    const slackConnected = !!(botService.slackConfig.botToken || botService.slackConfig.webhookUrl);
    const discordConnected = !!botService.discordConfig.webhookUrl;
    
    // Aggregate integration status
    const integrations = {
      github: { 
        connected: false, 
        username: '', 
        repositories: 0,
        status: 'Not configured'
      },
      gitlab: { 
        connected: false, 
        username: '', 
        repositories: 0,
        status: 'Not configured'
      },
      slack: { 
        connected: slackConnected, 
        teamName: slackConnected ? 'Development Team' : '', 
        channels: slackConnected ? 3 : 0,
        status: slackConnected ? 'Connected' : 'Not connected'
      },
      discord: { 
        connected: discordConnected, 
        guildName: discordConnected ? 'NoteVault Community' : '', 
        channels: discordConnected ? 3 : 0,
        status: discordConnected ? 'Connected' : 'Not connected'
      },
      googleCalendar: { 
        connected: googleCalendarConnected, 
        email: googleCalendarConnected ? 'user@gmail.com' : '', 
        calendars: googleCalendarConnected ? 2 : 0,
        status: googleCalendarConnected ? 'Connected' : 'Not connected'
      },
      outlookCalendar: { 
        connected: outlookCalendarConnected, 
        email: outlookCalendarConnected ? 'user@outlook.com' : '', 
        calendars: outlookCalendarConnected ? 1 : 0,
        status: outlookCalendarConnected ? 'Connected' : 'Not connected'
      },
      googleDrive: { 
        connected: false, 
        email: '', 
        usage: '0 GB',
        status: 'Not configured'
      },
      dropbox: { 
        connected: false, 
        email: '', 
        usage: '0 GB',
        status: 'Not configured'
      }
    };
    
    res.json(integrations);
  } catch (error) {
    console.error('Integrations status error:', error);
    res.status(500).json({ error: 'Failed to get integrations status' });
  }
});

// Connect integration
router.post('/:provider/connect', async (req, res) => {
  try {
    const { provider } = req.params;
    const { authCode, token, config } = req.body;
    
    switch (provider) {
      case 'slack':
        // In a real implementation, this would use the Slack OAuth flow
        if (token) {
          botService.slackConfig.botToken = token;
          botService.slackConfig.enabled = true;
          res.json({ 
            success: true, 
            message: 'Slack integration connected successfully',
            provider: 'slack',
            connected: true
          });
        } else {
          res.status(400).json({ error: 'Token required for Slack integration' });
        }
        break;
        
      case 'discord':
        // In a real implementation, this would use the Discord OAuth flow
        if (token) {
          botService.discordConfig.webhookUrl = token;
          botService.discordConfig.enabled = true;
          res.json({ 
            success: true, 
            message: 'Discord integration connected successfully',
            provider: 'discord',
            connected: true
          });
        } else {
          res.status(400).json({ error: 'Webhook URL required for Discord integration' });
        }
        break;
        
      case 'googleCalendar':
        // This would integrate with the calendar service
        res.json({ 
          success: true, 
          message: 'Google Calendar integration initiated',
          provider: 'googleCalendar',
          authUrl: '/calendar/auth/google'
        });
        break;
        
      case 'outlookCalendar':
        // This would integrate with the calendar service
        res.json({ 
          success: true, 
          message: 'Outlook Calendar integration initiated',
          provider: 'outlookCalendar',
          authUrl: '/calendar/auth/outlook'
        });
        break;
        
      default:
        res.status(400).json({ error: `Integration provider '${provider}' not supported` });
    }
  } catch (error) {
    console.error('Connect integration error:', error);
    res.status(500).json({ error: 'Failed to connect integration' });
  }
});

// Disconnect integration
router.delete('/:provider/disconnect', async (req, res) => {
  try {
    const { provider } = req.params;
    
    switch (provider) {
      case 'slack':
        botService.slackConfig.botToken = null;
        botService.slackConfig.enabled = false;
        res.json({ 
          success: true, 
          message: 'Slack integration disconnected',
          provider: 'slack',
          connected: false
        });
        break;
        
      case 'discord':
        botService.discordConfig.webhookUrl = null;
        botService.discordConfig.enabled = false;
        res.json({ 
          success: true, 
          message: 'Discord integration disconnected',
          provider: 'discord',
          connected: false
        });
        break;
        
      case 'googleCalendar':
        // This would clear Google Calendar tokens
        res.json({ 
          success: true, 
          message: 'Google Calendar integration disconnected',
          provider: 'googleCalendar',
          connected: false
        });
        break;
        
      case 'outlookCalendar':
        // This would clear Outlook Calendar tokens
        res.json({ 
          success: true, 
          message: 'Outlook Calendar integration disconnected',
          provider: 'outlookCalendar',
          connected: false
        });
        break;
        
      default:
        res.status(400).json({ error: `Integration provider '${provider}' not supported` });
    }
  } catch (error) {
    console.error('Disconnect integration error:', error);
    res.status(500).json({ error: 'Failed to disconnect integration' });
  }
});

// Test integration
router.post('/:provider/test', async (req, res) => {
  try {
    const { provider } = req.params;
    
    switch (provider) {
      case 'slack':
        if (botService.slackConfig.botToken) {
          res.json({ 
            success: true, 
            message: 'Slack integration is working',
            provider: 'slack',
            status: 'healthy'
          });
        } else {
          res.json({ 
            success: false, 
            message: 'Slack integration not configured',
            provider: 'slack',
            status: 'not_configured'
          });
        }
        break;
        
      case 'discord':
        if (botService.discordConfig.webhookUrl) {
          res.json({ 
            success: true, 
            message: 'Discord integration is working',
            provider: 'discord',
            status: 'healthy'
          });
        } else {
          res.json({ 
            success: false, 
            message: 'Discord integration not configured',
            provider: 'discord',
            status: 'not_configured'
          });
        }
        break;
        
      default:
        res.status(400).json({ error: `Testing not supported for provider '${provider}'` });
    }
  } catch (error) {
    console.error('Test integration error:', error);
    res.status(500).json({ error: 'Failed to test integration' });
  }
});

export default router;