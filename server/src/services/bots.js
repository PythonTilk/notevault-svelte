import fetch from 'node-fetch';
import crypto from 'crypto';

class BotIntegrationService {
  constructor() {
    this.slackConfig = {
      enabled: process.env.SLACK_BOT_ENABLED === 'true',
      botToken: process.env.SLACK_BOT_TOKEN,
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      defaultChannel: process.env.SLACK_DEFAULT_CHANNEL || '#general'
    };

    this.discordConfig = {
      enabled: process.env.DISCORD_BOT_ENABLED === 'true',
      botToken: process.env.DISCORD_BOT_TOKEN,
      webhookUrl: process.env.DISCORD_WEBHOOK_URL,
      guildId: process.env.DISCORD_GUILD_ID,
      defaultChannel: process.env.DISCORD_DEFAULT_CHANNEL
    };

    this.commands = new Map();
    this.registerDefaultCommands();
  }

  /**
   * Register default bot commands
   */
  registerDefaultCommands() {
    // Help command
    this.commands.set('help', {
      description: 'Show available commands',
      handler: this.handleHelpCommand.bind(this)
    });

    // Status command
    this.commands.set('status', {
      description: 'Show NoteVault system status',
      handler: this.handleStatusCommand.bind(this)
    });

    // Create workspace command
    this.commands.set('workspace', {
      description: 'Create a new workspace',
      handler: this.handleWorkspaceCommand.bind(this)
    });

    // Recent activity command
    this.commands.set('activity', {
      description: 'Show recent workspace activity',
      handler: this.handleActivityCommand.bind(this)
    });

    // Search command
    this.commands.set('search', {
      description: 'Search notes and workspaces',
      handler: this.handleSearchCommand.bind(this)
    });
  }

  /**
   * Send message to Slack
   */
  async sendSlackMessage(message, options = {}) {
    if (!this.slackConfig.enabled) {
      console.log('Slack bot is disabled');
      return { success: false, error: 'Slack bot is disabled' };
    }

    try {
      const {
        channel = this.slackConfig.defaultChannel,
        username = 'NoteVault Bot',
        iconEmoji = ':memo:',
        attachments = [],
        blocks = []
      } = options;

      const payload = {
        channel,
        text: message,
        username,
        icon_emoji: iconEmoji,
        attachments,
        blocks
      };

      let response;

      if (this.slackConfig.webhookUrl) {
        // Use webhook
        response = await fetch(this.slackConfig.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        // Use Bot API
        response = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.slackConfig.botToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      }

      const result = await response.json();
      
      if (response.ok && (result.ok || response.status === 200)) {
        return { success: true, result };
      } else {
        throw new Error(result.error || 'Failed to send Slack message');
      }
    } catch (error) {
      console.error('Slack message error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send message to Discord
   */
  async sendDiscordMessage(message, options = {}) {
    if (!this.discordConfig.enabled) {
      console.log('Discord bot is disabled');
      return { success: false, error: 'Discord bot is disabled' };
    }

    try {
      const {
        username = 'NoteVault Bot',
        avatarUrl = null,
        embeds = [],
        tts = false
      } = options;

      const payload = {
        content: message,
        username,
        avatar_url: avatarUrl,
        embeds,
        tts
      };

      const response = await fetch(this.discordConfig.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        return { success: true };
      } else {
        const error = await response.text();
        throw new Error(error || 'Failed to send Discord message');
      }
    } catch (error) {
      console.error('Discord message error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle Slack slash commands
   */
  async handleSlackCommand(payload) {
    const { command, text, user_name, channel_name } = payload;
    
    // Remove leading slash and get command name
    const commandName = command.substring(1);
    const args = text ? text.split(' ') : [];

    if (this.commands.has(commandName)) {
      const commandHandler = this.commands.get(commandName);
      try {
        const response = await commandHandler.handler(args, {
          platform: 'slack',
          user: user_name,
          channel: channel_name
        });
        
        return {
          response_type: 'in_channel',
          text: response.text || response,
          attachments: response.attachments || []
        };
      } catch (error) {
        return {
          response_type: 'ephemeral',
          text: `Error executing command: ${error.message}`
        };
      }
    } else {
      return {
        response_type: 'ephemeral',
        text: `Unknown command: ${commandName}. Use \`/notevault help\` for available commands.`
      };
    }
  }

  /**
   * Handle Discord slash commands
   */
  async handleDiscordCommand(interaction) {
    const { data: { name: commandName, options = [] } } = interaction;
    const args = options.map(opt => opt.value);

    if (this.commands.has(commandName)) {
      const commandHandler = this.commands.get(commandName);
      try {
        const response = await commandHandler.handler(args, {
          platform: 'discord',
          user: interaction.member?.user?.username || 'Unknown',
          channel: interaction.channel_id
        });

        return {
          type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
          data: {
            content: response.text || response,
            embeds: response.embeds || []
          }
        };
      } catch (error) {
        return {
          type: 4,
          data: {
            content: `Error executing command: ${error.message}`,
            flags: 64 // EPHEMERAL
          }
        };
      }
    } else {
      return {
        type: 4,
        data: {
          content: `Unknown command: ${commandName}. Use \`/notevault help\` for available commands.`,
          flags: 64 // EPHEMERAL
        }
      };
    }
  }

  /**
   * Command handlers
   */
  async handleHelpCommand(args, context) {
    const commands = Array.from(this.commands.entries()).map(([name, cmd]) => 
      `\`${name}\` - ${cmd.description}`
    ).join('\n');

    return {
      text: `**NoteVault Bot Commands:**\n${commands}\n\nUse these commands to interact with your NoteVault workspace!`
    };
  }

  async handleStatusCommand(args, context) {
    // This would typically fetch real system status
    const status = {
      status: 'operational',
      uptime: process.uptime(),
      version: '1.0.0',
      activeUsers: 42, // Mock data
      totalWorkspaces: 15,
      totalNotes: 1337
    };

    const uptimeHours = Math.floor(status.uptime / 3600);
    const uptimeMinutes = Math.floor((status.uptime % 3600) / 60);

    return {
      text: `**NoteVault System Status** 🟢\n` +
            `Status: ${status.status}\n` +
            `Uptime: ${uptimeHours}h ${uptimeMinutes}m\n` +
            `Version: ${status.version}\n` +
            `Active Users: ${status.activeUsers}\n` +
            `Workspaces: ${status.totalWorkspaces}\n` +
            `Notes: ${status.totalNotes}`
    };
  }

  async handleWorkspaceCommand(args, context) {
    const workspaceName = args.join(' ') || 'New Workspace';
    
    // This would typically create a real workspace
    const workspaceId = crypto.randomBytes(8).toString('hex');
    
    return {
      text: `**Workspace Created!** 🎉\n` +
            `Name: ${workspaceName}\n` +
            `ID: ${workspaceId}\n` +
            `Created by: ${context.user}\n` +
            `Access it at: https://notevault.com/workspaces/${workspaceId}`
    };
  }

  async handleActivityCommand(args, context) {
    // Mock recent activity data
    const activities = [
      { user: 'Alice', action: 'created note', item: 'Meeting Notes', time: '2 minutes ago' },
      { user: 'Bob', action: 'updated workspace', item: 'Design System', time: '15 minutes ago' },
      { user: 'Charlie', action: 'shared file', item: 'requirements.pdf', time: '1 hour ago' }
    ];

    const activityText = activities.map(activity => 
      `• **${activity.user}** ${activity.action} "${activity.item}" - ${activity.time}`
    ).join('\n');

    return {
      text: `**Recent Activity** 📈\n${activityText}`
    };
  }

  async handleSearchCommand(args, context) {
    const query = args.join(' ');
    
    if (!query) {
      return {
        text: 'Please provide a search query. Example: `/notevault search meeting notes`'
      };
    }

    // Mock search results
    const results = [
      { type: 'note', title: 'Weekly Meeting Notes', workspace: 'Team Alpha' },
      { type: 'workspace', title: 'Meeting Room Setup', description: 'Conference room management' }
    ];

    if (results.length === 0) {
      return {
        text: `No results found for "${query}"`
      };
    }

    const resultsText = results.map(result => 
      `• **${result.title}** (${result.type}) ${result.workspace ? `- ${result.workspace}` : ''}`
    ).join('\n');

    return {
      text: `**Search Results for "${query}"** 🔍\n${resultsText}`
    };
  }

  /**
   * Send notification to all configured platforms
   */
  async sendNotification(message, options = {}) {
    const results = {};

    // Send to Slack
    if (this.slackConfig.enabled) {
      results.slack = await this.sendSlackMessage(message, {
        channel: options.slackChannel,
        attachments: options.slackAttachments
      });
    }

    // Send to Discord
    if (this.discordConfig.enabled) {
      results.discord = await this.sendDiscordMessage(message, {
        embeds: options.discordEmbeds
      });
    }

    return results;
  }

  /**
   * Verify Slack request signature
   */
  verifySlackRequest(requestBody, timestamp, signature) {
    if (!this.slackConfig.signingSecret) {
      return false;
    }

    const hmac = crypto.createHmac('sha256', this.slackConfig.signingSecret);
    hmac.update(`v0:${timestamp}:${requestBody}`);
    const expectedSignature = `v0=${hmac.digest('hex')}`;
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );
  }

  /**
   * Register custom command
   */
  registerCommand(name, description, handler) {
    this.commands.set(name, { description, handler });
  }

  /**
   * Send workspace notifications
   */
  async notifyWorkspaceUpdate(workspace, action, user) {
    const message = `**Workspace ${action}** 📝\n` +
                   `Workspace: ${workspace.name}\n` +
                   `Action: ${action}\n` +
                   `User: ${user.displayName || user.username}`;

    return this.sendNotification(message);
  }

  /**
   * Send note notifications
   */
  async notifyNoteUpdate(note, action, user) {
    const message = `**Note ${action}** 📄\n` +
                   `Note: ${note.title}\n` +
                   `Action: ${action}\n` +
                   `User: ${user.displayName || user.username}`;

    return this.sendNotification(message);
  }

  /**
   * Send system alerts
   */
  async sendSystemAlert(alert) {
    const message = `**System Alert** ⚠️\n` +
                   `Level: ${alert.level}\n` +
                   `Message: ${alert.message}\n` +
                   `Time: ${new Date().toISOString()}`;

    return this.sendNotification(message, {
      slackAttachments: [{
        color: alert.level === 'error' ? 'danger' : 'warning',
        fields: [
          { title: 'Alert Level', value: alert.level, short: true },
          { title: 'Component', value: alert.component || 'System', short: true }
        ]
      }],
      discordEmbeds: [{
        title: 'System Alert',
        description: alert.message,
        color: alert.level === 'error' ? 0xff0000 : 0xffaa00,
        timestamp: new Date().toISOString()
      }]
    });
  }
}

export default new BotIntegrationService();