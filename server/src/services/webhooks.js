import fetch from 'node-fetch';
import crypto from 'crypto';

class WebhooksService {
  constructor() {
    this.webhooks = new Map(); // In production, store in database
    this.eventQueue = new Map(); // Track event delivery
    this.retryQueue = new Map(); // Failed webhooks retry queue
    
    this.config = {
      maxRetries: 3,
      retryDelays: [1000, 5000, 30000], // 1s, 5s, 30s
      timeout: 10000, // 10 seconds
      signatureAlgorithm: 'sha256'
    };

    // Supported event types
    this.supportedEvents = [
      'workspace.created',
      'workspace.updated',
      'workspace.deleted',
      'workspace.shared',
      'note.created',
      'note.updated',
      'note.deleted',
      'note.shared',
      'user.created',
      'user.updated',
      'user.deleted',
      'collaboration.started',
      'collaboration.ended',
      'file.uploaded',
      'file.deleted',
      'comment.created',
      'comment.updated',
      'comment.deleted'
    ];

    // Start retry processor
    this.startRetryProcessor();
  }

  /**
   * Register a new webhook
   */
  registerWebhook(userId, webhookData) {
    const {
      url,
      events = ['*'], // Default to all events
      secret = null,
      active = true,
      description = '',
      metadata = {}
    } = webhookData;

    if (!this.isValidUrl(url)) {
      throw new Error('Invalid webhook URL');
    }

    // Validate events
    const invalidEvents = events.filter(event => 
      event !== '*' && !this.supportedEvents.includes(event)
    );
    
    if (invalidEvents.length > 0) {
      throw new Error(`Unsupported events: ${invalidEvents.join(', ')}`);
    }

    const webhookId = crypto.randomUUID();
    const webhook = {
      id: webhookId,
      userId,
      url,
      events: events.includes('*') ? this.supportedEvents : events,
      secret,
      active,
      description,
      metadata,
      createdAt: new Date().toISOString(),
      lastTriggered: null,
      successCount: 0,
      failureCount: 0
    };

    this.webhooks.set(webhookId, webhook);
    return webhook;
  }

  /**
   * Update webhook configuration
   */
  updateWebhook(webhookId, updates) {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    // Validate URL if updating
    if (updates.url && !this.isValidUrl(updates.url)) {
      throw new Error('Invalid webhook URL');
    }

    // Validate events if updating
    if (updates.events) {
      const invalidEvents = updates.events.filter(event => 
        event !== '*' && !this.supportedEvents.includes(event)
      );
      
      if (invalidEvents.length > 0) {
        throw new Error(`Unsupported events: ${invalidEvents.join(', ')}`);
      }

      updates.events = updates.events.includes('*') ? this.supportedEvents : updates.events;
    }

    const updatedWebhook = {
      ...webhook,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.webhooks.set(webhookId, updatedWebhook);
    return updatedWebhook;
  }

  /**
   * Delete webhook
   */
  deleteWebhook(webhookId) {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    this.webhooks.delete(webhookId);
    return true;
  }

  /**
   * Get webhooks for user
   */
  getUserWebhooks(userId) {
    return Array.from(this.webhooks.values())
      .filter(webhook => webhook.userId === userId);
  }

  /**
   * Get webhook by ID
   */
  getWebhook(webhookId) {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      throw new Error('Webhook not found');
    }
    return webhook;
  }

  /**
   * Trigger webhooks for an event
   */
  async triggerEvent(eventType, eventData, userId = null) {
    try {
      // Get all active webhooks that should receive this event
      const relevantWebhooks = Array.from(this.webhooks.values())
        .filter(webhook => 
          webhook.active && 
          webhook.events.includes(eventType) &&
          (userId === null || webhook.userId === userId)
        );

      if (relevantWebhooks.length === 0) {
        return { triggered: 0, results: [] };
      }

      const eventId = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      
      const payload = {
        event: {
          id: eventId,
          type: eventType,
          timestamp,
          data: eventData
        },
        webhook: null // Will be set per webhook
      };

      const results = [];

      // Trigger all relevant webhooks
      for (const webhook of relevantWebhooks) {
        try {
          const webhookPayload = {
            ...payload,
            webhook: {
              id: webhook.id,
              url: webhook.url
            }
          };

          const result = await this.deliverWebhook(webhook, webhookPayload, eventId);
          results.push(result);

          // Update webhook statistics
          if (result.success) {
            webhook.successCount++;
            webhook.lastTriggered = timestamp;
          } else {
            webhook.failureCount++;
            // Add to retry queue if delivery failed
            this.addToRetryQueue(webhook, webhookPayload, eventId);
          }

          this.webhooks.set(webhook.id, webhook);
        } catch (error) {
          console.error(`Webhook ${webhook.id} trigger error:`, error);
          results.push({
            webhookId: webhook.id,
            success: false,
            error: error.message,
            timestamp
          });
        }
      }

      return {
        eventId,
        triggered: relevantWebhooks.length,
        results
      };
    } catch (error) {
      console.error('Event trigger error:', error);
      throw new Error('Failed to trigger event webhooks');
    }
  }

  /**
   * Deliver webhook HTTP request
   */
  async deliverWebhook(webhook, payload, eventId) {
    const startTime = Date.now();
    
    try {
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'NoteVault-Webhooks/1.0',
        'X-Webhook-Event': payload.event.type,
        'X-Webhook-Event-ID': eventId,
        'X-Webhook-Timestamp': payload.event.timestamp,
        'X-Webhook-Signature': this.generateSignature(payload, webhook.secret)
      };

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        timeout: this.config.timeout
      });

      const duration = Date.now() - startTime;
      const responseText = await response.text();

      return {
        webhookId: webhook.id,
        eventId,
        success: response.ok,
        statusCode: response.status,
        responseBody: responseText.substring(0, 1000), // Truncate response
        duration,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        webhookId: webhook.id,
        eventId,
        success: false,
        error: error.message,
        duration,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  generateSignature(payload, secret) {
    if (!secret) {
      return null;
    }

    const payloadString = JSON.stringify(payload);
    return `${this.config.signatureAlgorithm}=${crypto
      .createHmac(this.config.signatureAlgorithm, secret)
      .update(payloadString)
      .digest('hex')}`;
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload, signature, secret) {
    if (!secret || !signature) {
      return !secret; // If no secret configured, accept request
    }

    const expectedSignature = this.generateSignature(payload, secret);
    return expectedSignature === signature;
  }

  /**
   * Add failed webhook to retry queue
   */
  addToRetryQueue(webhook, payload, eventId) {
    const retryId = crypto.randomUUID();
    const retryItem = {
      id: retryId,
      webhookId: webhook.id,
      webhook,
      payload,
      eventId,
      attempts: 0,
      maxRetries: this.config.maxRetries,
      nextRetry: Date.now() + this.config.retryDelays[0],
      createdAt: new Date().toISOString()
    };

    this.retryQueue.set(retryId, retryItem);
  }

  /**
   * Start retry processor (runs periodically)
   */
  startRetryProcessor() {
    setInterval(async () => {
      const now = Date.now();
      const itemsToRetry = Array.from(this.retryQueue.values())
        .filter(item => item.nextRetry <= now);

      for (const item of itemsToRetry) {
        try {
          const result = await this.deliverWebhook(item.webhook, item.payload, item.eventId);
          
          if (result.success) {
            // Success - remove from retry queue
            this.retryQueue.delete(item.id);
          } else {
            // Failed - check if we should retry again
            item.attempts++;
            
            if (item.attempts >= item.maxRetries) {
              // Max retries reached - remove from queue
              this.retryQueue.delete(item.id);
              console.warn(`Webhook ${item.webhookId} failed after ${item.maxRetries} retries`);
            } else {
              // Schedule next retry
              const delayIndex = Math.min(item.attempts, this.config.retryDelays.length - 1);
              item.nextRetry = now + this.config.retryDelays[delayIndex];
              this.retryQueue.set(item.id, item);
            }
          }
        } catch (error) {
          console.error(`Retry processor error for webhook ${item.webhookId}:`, error);
        }
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Test webhook URL
   */
  async testWebhook(webhookId) {
    const webhook = this.getWebhook(webhookId);
    
    const testPayload = {
      event: {
        id: crypto.randomUUID(),
        type: 'webhook.test',
        timestamp: new Date().toISOString(),
        data: {
          message: 'This is a test webhook from NoteVault',
          webhook_id: webhookId
        }
      },
      webhook: {
        id: webhook.id,
        url: webhook.url
      }
    };

    return await this.deliverWebhook(webhook, testPayload, 'test');
  }

  /**
   * Get webhook delivery logs
   */
  getWebhookLogs(webhookId, limit = 50) {
    // In production, this would query from database
    // For now, return mock data
    return Array.from({ length: Math.min(limit, 10) }, (_, i) => ({
      id: crypto.randomUUID(),
      webhookId,
      eventType: 'workspace.updated',
      success: Math.random() > 0.2, // 80% success rate
      statusCode: Math.random() > 0.2 ? 200 : 500,
      duration: Math.floor(Math.random() * 2000) + 100,
      timestamp: new Date(Date.now() - i * 60000).toISOString()
    }));
  }

  /**
   * Get webhook statistics
   */
  getWebhookStats(webhookId) {
    const webhook = this.getWebhook(webhookId);
    const logs = this.getWebhookLogs(webhookId, 100);
    
    const recentLogs = logs.filter(log => 
      new Date(log.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    return {
      webhookId,
      totalDeliveries: webhook.successCount + webhook.failureCount,
      successCount: webhook.successCount,
      failureCount: webhook.failureCount,
      successRate: webhook.successCount + webhook.failureCount > 0 
        ? (webhook.successCount / (webhook.successCount + webhook.failureCount)) * 100 
        : 0,
      lastTriggered: webhook.lastTriggered,
      recentActivity: {
        last24Hours: recentLogs.length,
        successfulLast24Hours: recentLogs.filter(log => log.success).length,
        averageResponseTime: recentLogs.length > 0 
          ? recentLogs.reduce((sum, log) => sum + log.duration, 0) / recentLogs.length 
          : 0
      }
    };
  }

  /**
   * Get supported event types
   */
  getSupportedEvents() {
    return this.supportedEvents.map(event => ({
      type: event,
      description: this.getEventDescription(event)
    }));
  }

  /**
   * Get event description
   */
  getEventDescription(eventType) {
    const descriptions = {
      'workspace.created': 'Triggered when a new workspace is created',
      'workspace.updated': 'Triggered when a workspace is modified',
      'workspace.deleted': 'Triggered when a workspace is deleted',
      'workspace.shared': 'Triggered when a workspace is shared with users',
      'note.created': 'Triggered when a new note is created',
      'note.updated': 'Triggered when a note is modified',
      'note.deleted': 'Triggered when a note is deleted',
      'note.shared': 'Triggered when a note is shared',
      'user.created': 'Triggered when a new user account is created',
      'user.updated': 'Triggered when user profile is updated',
      'user.deleted': 'Triggered when a user account is deleted',
      'collaboration.started': 'Triggered when real-time collaboration begins',
      'collaboration.ended': 'Triggered when real-time collaboration ends',
      'file.uploaded': 'Triggered when a file is uploaded',
      'file.deleted': 'Triggered when a file is deleted',
      'comment.created': 'Triggered when a comment is added',
      'comment.updated': 'Triggered when a comment is modified',
      'comment.deleted': 'Triggered when a comment is deleted'
    };

    return descriptions[eventType] || 'Custom event type';
  }

  /**
   * Validate webhook URL
   */
  isValidUrl(url) {
    try {
      const parsedUrl = new URL(url);
      return ['http:', 'https:'].includes(parsedUrl.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Create Zapier-compatible trigger samples
   */
  getZapierSamples() {
    return {
      'workspace.created': {
        event: {
          id: 'evt_123456789',
          type: 'workspace.created',
          timestamp: '2024-01-15T10:30:00.000Z',
          data: {
            workspace: {
              id: 'ws_123456789',
              name: 'My New Workspace',
              description: 'A workspace for project planning',
              ownerId: 'user_123456789',
              createdAt: '2024-01-15T10:30:00.000Z',
              updatedAt: '2024-01-15T10:30:00.000Z'
            },
            user: {
              id: 'user_123456789',
              username: 'john.doe',
              email: 'john.doe@example.com',
              displayName: 'John Doe'
            }
          }
        }
      },
      'note.updated': {
        event: {
          id: 'evt_987654321',
          type: 'note.updated',
          timestamp: '2024-01-15T11:15:00.000Z',
          data: {
            note: {
              id: 'note_123456789',
              title: 'Meeting Notes - Q1 Planning',
              content: '# Q1 Planning Meeting\n\n## Agenda\n- Review goals\n- Budget discussion',
              workspaceId: 'ws_123456789',
              authorId: 'user_123456789',
              updatedAt: '2024-01-15T11:15:00.000Z'
            },
            user: {
              id: 'user_123456789',
              username: 'john.doe',
              email: 'john.doe@example.com',
              displayName: 'John Doe'
            },
            changes: {
              title: { from: 'Meeting Notes', to: 'Meeting Notes - Q1 Planning' },
              content: { updated: true }
            }
          }
        }
      }
    };
  }

  /**
   * Validate webhook payload for IFTTT compatibility
   */
  validateIFTTTPayload(payload) {
    // IFTTT requires specific payload structure
    const requiredFields = ['event', 'webhook'];
    const missingFields = requiredFields.filter(field => !payload[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    if (!payload.event.type || !payload.event.timestamp || !payload.event.data) {
      throw new Error('Invalid event structure');
    }

    return true;
  }

  /**
   * Get integration status
   */
  getIntegrationStatus() {
    const totalWebhooks = this.webhooks.size;
    const activeWebhooks = Array.from(this.webhooks.values())
      .filter(webhook => webhook.active).length;
    const retryQueueSize = this.retryQueue.size;

    return {
      enabled: true,
      totalWebhooks,
      activeWebhooks,
      retryQueueSize,
      supportedEvents: this.supportedEvents.length,
      features: {
        signatures: true,
        retries: true,
        zapierCompatible: true,
        iftttCompatible: true
      }
    };
  }
}

export default new WebhooksService();