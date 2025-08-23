import { browser } from '$app/environment';

// Type definitions for fetch API
type HeadersInit = Record<string, string> | Headers;
type RequestCredentials = 'omit' | 'same-origin' | 'include';
type RequestInit = {
  method?: string;
  headers?: HeadersInit;
  body?: string | FormData;
  credentials?: RequestCredentials;
};

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:12001/api';

class ApiClient {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 5000; // 5 seconds cache

  private getAuthHeaders(): HeadersInit {
    if (!browser) return {};
    
    const token = localStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private getCacheKey(endpoint: string, options: RequestInit = {}): string {
    return `${options.method || 'GET'}:${endpoint}`;
  }

  private isValidCache(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_TTL;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {},
    retryCount = 0
  ): Promise<T> {
    const cacheKey = this.getCacheKey(endpoint, options);
    const method = options.method || 'GET';
    
    // Only cache GET requests
    if (method === 'GET') {
      const cached = this.cache.get(cacheKey);
      if (cached && this.isValidCache(cached.timestamp)) {
        return cached.data;
      }
    }

    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        // Handle rate limiting with exponential backoff
        if (response.status === 429 && retryCount < 3) {
          const retryAfter = response.headers.get('Retry-After');
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, retryCount) * 1000;
          
          console.warn(`Rate limited. Retrying after ${delay}ms (attempt ${retryCount + 1}/3)`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.request<T>(endpoint, options, retryCount + 1);
        }
        
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        
        // Provide user-friendly error messages for rate limiting
        if (response.status === 429) {
          throw new Error('Too many requests. Please wait a moment and try again.');
        }
        
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Cache GET requests
      if (method === 'GET') {
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Auth endpoints
  async login(identifier: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
  }

  async register(userData: {
    username: string;
    email: string;
    password: string;
    displayName: string;
  }) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async logout() {
    return this.request('/auth/logout', { method: 'POST' });
  }

  async updateProfile(updates: { displayName?: string; avatar?: string }) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Workspace endpoints
  async getWorkspaces() {
    return this.request('/workspaces');
  }

  async getAdminWorkspaces(params?: { limit?: number; offset?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    const url = `/admin/workspaces${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return this.request(url);
  }

  async getWorkspace(id: string) {
    return this.request(`/workspaces/${id}`);
  }

  async createWorkspace(data: {
    name: string;
    description?: string;
    color: string;
    isPublic?: boolean;
  }) {
    return this.request('/workspaces', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateWorkspace(id: string, updates: {
    name?: string;
    description?: string;
    color?: string;
    isPublic?: boolean;
  }) {
    return this.request(`/workspaces/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteWorkspace(id: string) {
    return this.request(`/workspaces/${id}`, { method: 'DELETE' });
  }

  async getWorkspaceMembers(workspaceId: string) {
    return this.request(`/workspaces/${workspaceId}/members`);
  }

  async addWorkspaceMember(workspaceId: string, userId: string, role = 'member') {
    return this.request(`/workspaces/${workspaceId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId, role }),
    });
  }

  async removeWorkspaceMember(workspaceId: string, userId: string) {
    return this.request(`/workspaces/${workspaceId}/members/${userId}`, {
      method: 'DELETE',
    });
  }

  // Note endpoints
  async getWorkspaceNotes(workspaceId: string, params?: {
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    if (params?.sortOrder) query.set('sortOrder', params.sortOrder);
    
    const url = `/notes/workspace/${workspaceId}${query.toString() ? '?' + query.toString() : ''}`;
    return this.request(url);
  }

  async getNote(id: string) {
    return this.request(`/notes/${id}`);
  }

  async createNote(data: {
    title: string;
    content?: string;
    type?: string;
    workspaceId: string;
    position?: { x: number; y: number };
    size?: { width: number; height: number };
    color: string;
    tags?: string[];
    isPublic?: boolean;
    collectionId?: string;
  }) {
    return this.request('/notes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateNote(id: string, updates: {
    title?: string;
    content?: string;
    type?: string;
    position?: { x: number; y: number };
    size?: { width: number; height: number };
    color?: string;
    tags?: string[];
    isPublic?: boolean;
  }) {
    return this.request(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteNote(id: string) {
    return this.request(`/notes/${id}`, { method: 'DELETE' });
  }

  // Chat endpoints
  async getChatMessages(params?: {
    limit?: number;
    offset?: number;
    channel?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());
    if (params?.channel) query.set('channel', params.channel);
    
    return this.request(`/chat/messages?${query}`);
  }

  async sendMessage(data: {
    content: string;
    channelId?: string;
    replyToId?: string;
  }) {
    return this.request('/chat/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async editMessage(id: string, content: string) {
    return this.request(`/chat/messages/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  }

  async deleteMessage(id: string) {
    return this.request(`/chat/messages/${id}`, { method: 'DELETE' });
  }

  async addReaction(messageId: string, emoji: string) {
    return this.request(`/chat/messages/${messageId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    });
  }

  async removeReaction(messageId: string, emoji: string) {
    return this.request(`/chat/messages/${messageId}/reactions/${emoji}`, {
      method: 'DELETE',
    });
  }

  // File endpoints
  async getFiles(params?: {
    workspaceId?: string;
    folderId?: string | null;
    limit?: number;
    offset?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.workspaceId) query.set('workspaceId', params.workspaceId);
    if (params?.folderId) query.set('folderId', params.folderId);
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());
    
    return this.request(`/files?${query}`);
  }

  async uploadFile(file: File, workspaceId?: string, isPublic = false) {
    const formData = new FormData();
    formData.append('file', file);
    if (workspaceId) formData.append('workspaceId', workspaceId);
    formData.append('isPublic', isPublic.toString());

    return this.request('/files/upload', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: formData,
    });
  }

  async getFile(id: string) {
    return this.request(`/files/${id}`);
  }

  async deleteFile(id: string) {
    return this.request(`/files/${id}`, { method: 'DELETE' });
  }

  getFileDownloadUrl(id: string): string {
    return `${API_BASE_URL}/files/${id}/download`;
  }

  // Public announcements
  async getAnnouncements() {
    return this.request('/announcements');
  }

  // Admin endpoints
  async getSystemStats() {
    return this.request('/admin/stats');
  }

  async getUsers(params?: {
    limit?: number;
    offset?: number;
    search?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());
    if (params?.search) query.set('search', params.search);
    
    return this.request(`/admin/users?${query}`);
  }

  async updateUserRole(userId: string, role: string) {
    return this.request(`/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  async deleteUser(userId: string) {
    return this.request(`/admin/users/${userId}`, { method: 'DELETE' });
  }


  async deleteWorkspaceAsAdmin(workspaceId: string) {
    return this.request(`/admin/workspaces/${workspaceId}`, { method: 'DELETE' });
  }

  async getAdminAnnouncements() {
    return this.request('/admin/announcements');
  }

  async createAnnouncement(data: {
    title: string;
    content: string;
    priority?: string;
    expiresAt?: string;
  }) {
    return this.request('/admin/announcements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAnnouncement(id: string, updates: {
    title?: string;
    content?: string;
    priority?: string;
    isActive?: boolean;
    expiresAt?: string;
  }) {
    return this.request(`/admin/announcements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteAnnouncement(id: string) {
    return this.request(`/admin/announcements/${id}`, { method: 'DELETE' });
  }


  // Settings endpoints
  async changePassword(currentPassword: string, newPassword: string) {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });
  }

  async updateNotificationSettings(settings: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    workspaceInvites?: boolean;
    chatMentions?: boolean;
  }) {
    return this.request('/auth/notification-settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async updatePreferences(preferences: {
    theme?: string;
    language?: string;
  }) {
    return this.request('/auth/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  }

  async exportUserData() {
    return this.request('/auth/export-data');
  }

  async deleteAccount() {
    return this.request('/auth/delete-account', {
      method: 'DELETE',
    });
  }

  // Notification endpoints
  async getNotifications(params?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  }) {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());
    if (params?.unreadOnly) query.set('unreadOnly', 'true');
    
    return this.request(`/notifications?${query}`);
  }

  async markNotificationAsRead(notificationId: string) {
    return this.request(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  }

  async markAllNotificationsAsRead() {
    return this.request('/notifications/mark-all-read', {
      method: 'PUT',
    });
  }

  async deleteNotification(notificationId: string) {
    return this.request(`/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  }

  async getNotificationCount() {
    return this.request('/notifications/count');
  }

  // Calendar endpoints
  async getConnectedCalendars(provider?: 'google' | 'outlook') {
    if (provider) {
      return this.request(`/calendar/calendars/${provider}`);
    }
    // Get all connected calendars
    const [googleCals, outlookCals] = await Promise.allSettled([
      this.request('/calendar/calendars/google').catch(() => []),
      this.request('/calendar/calendars/outlook').catch(() => [])
    ]);
    
    const results = [];
    if (googleCals.status === 'fulfilled') results.push(...googleCals.value);
    if (outlookCals.status === 'fulfilled') results.push(...outlookCals.value);
    return results;
  }

  async connectCalendar(provider: 'google' | 'outlook', authCode: string) {
    return this.request(`/calendar/callback/${provider}`, {
      method: 'POST',
      body: JSON.stringify({ code: authCode }),
    });
  }

  async disconnectCalendar(provider: 'google' | 'outlook') {
    return this.request(`/calendar/disconnect/${provider}`, {
      method: 'DELETE',
    });
  }

  async getCalendarEvents(params?: {
    provider?: 'google' | 'outlook';
    start?: string;
    end?: string;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.start) query.set('start', params.start);
    if (params?.end) query.set('end', params.end);
    if (params?.limit) query.set('limit', params.limit.toString());
    
    const provider = params?.provider || 'google';
    return this.request(`/calendar/events/${provider}?${query}`);
  }

  async createCalendarEvent(event: {
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    location?: string;
    attendees?: string[];
    provider?: 'google' | 'outlook';
    workspaceId?: string;
    meetingLink?: string;
  }) {
    const provider = event.provider || 'google';
    return this.request(`/calendar/events/${provider}`, {
      method: 'POST',
      body: JSON.stringify(event),
    });
  }

  async updateCalendarEvent(eventId: string, updates: {
    title?: string;
    description?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    attendees?: string[];
    meetingLink?: string;
  }) {
    return this.request(`/calendar/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteCalendarEvent(eventId: string) {
    return this.request(`/calendar/events/${eventId}`, {
      method: 'DELETE',
    });
  }

  async getCalendarAuthUrl(provider: 'google' | 'outlook') {
    return this.request(`/calendar/auth/${provider}`);
  }

  async syncCalendar(workspaceId: string, provider: 'google' | 'outlook' = 'google') {
    return this.request(`/calendar/sync/${workspaceId}`, {
      method: 'POST',
      body: JSON.stringify({ provider }),
    });
  }

  async getCalendarStatus() {
    return this.request('/calendar/status');
  }

  // Meeting integration
  async scheduleMeetingFromWorkspace(workspaceId: string, meeting: {
    title: string;
    description?: string;
    startTime: string;
    duration: number; // in minutes
    attendees?: string[];
    generateMeetingLink?: boolean;
  }) {
    return this.request('/calendar/workspace-meeting', {
      method: 'POST',
      body: JSON.stringify({ workspaceId, ...meeting }),
    });
  }

  // General Integration API methods
  async getIntegrationsStatus() {
    return this.request('/integrations/status');
  }

  async connectIntegration(provider: string) {
    return this.request(`/integrations/${provider}/connect`, {
      method: 'POST',
    });
  }

  async disconnectIntegration(provider: string) {
    return this.request(`/integrations/${provider}/disconnect`, {
      method: 'DELETE',
    });
  }

  async getIntegrationStatus(provider: string) {
    return this.request(`/integrations/${provider}/status`);
  }

  // Webhook API methods
  async getWebhooks() {
    return this.request('/webhooks');
  }

  async createWebhook(webhook: {
    url: string;
    description?: string;
    events: string[];
    secret?: string;
  }) {
    return this.request('/webhooks', {
      method: 'POST',
      body: JSON.stringify(webhook),
    });
  }

  async getWebhook(webhookId: string) {
    return this.request(`/webhooks/${webhookId}`);
  }

  async updateWebhook(webhookId: string, webhook: {
    url?: string;
    description?: string;
    events?: string[];
    secret?: string;
    active?: boolean;
  }) {
    return this.request(`/webhooks/${webhookId}`, {
      method: 'PUT',
      body: JSON.stringify(webhook),
    });
  }

  async deleteWebhook(webhookId: string) {
    return this.request(`/webhooks/${webhookId}`, {
      method: 'DELETE',
    });
  }

  async testWebhook(webhookId: string) {
    return this.request(`/webhooks/${webhookId}/test`, {
      method: 'POST',
    });
  }

  async getWebhookLogs(webhookId: string, params?: { limit?: number; offset?: number }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(`/webhooks/${webhookId}/logs${query}`);
  }

  // Advanced webhook features
  async getWebhookStats(webhookId: string) {
    return this.request(`/webhooks/${webhookId}/stats`);
  }

  async triggerWebhookEvent(eventType: string, eventData?: any) {
    return this.request('/webhooks/trigger', {
      method: 'POST',
      body: JSON.stringify({ eventType, eventData })
    });
  }

  async getSupportedWebhookEvents() {
    return this.request('/webhooks/events');
  }

  async getZapierSamples() {
    return this.request('/webhooks/zapier/samples');
  }

  // Analytics API methods
  async getAnalytics(params?: { timeRange?: string; filters?: string }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(`/analytics/dashboard${query}`);
  }

  async getSystemHealth() {
    return this.request('/analytics/health');
  }

  async getActivityFeed(params?: { limit?: number; offset?: number }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(`/admin/activity-feed${query}`);
  }

  // Real-time monitoring
  async getRealTimeMetrics() {
    return this.request('/analytics/realtime');
  }

  // Performance analytics
  async getPerformanceMetrics(params?: { timeRange?: string; includeDetails?: boolean }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(`/analytics/performance${query}`);
  }

  // Error tracking
  async getErrorAnalytics(params?: { timeRange?: string; level?: string; limit?: number }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(`/analytics/errors${query}`);
  }

  // User analytics
  async getUserAnalytics(params?: { timeRange?: string; includeInactive?: boolean }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(`/analytics/users${query}`);
  }

  // API usage statistics
  async getAPIUsageStats(params?: { timeRange?: string; endpoint?: string; method?: string }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(`/analytics/api-usage${query}`);
  }

  // Content statistics
  async getContentStats(params?: { timeRange?: string; type?: string }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(`/analytics/content${query}`);
  }

  // Alerts management
  async getAlerts(params?: { status?: string; level?: string; limit?: number }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(`/analytics/alerts${query}`);
  }

  async acknowledgeAlert(alertId: string) {
    return this.request(`/analytics/alerts/${alertId}/acknowledge`, {
      method: 'POST'
    });
  }

  async resolveAlert(alertId: string) {
    return this.request(`/analytics/alerts/${alertId}/resolve`, {
      method: 'POST'
    });
  }

  // Custom event tracking
  async trackEvent(action: string, metadata?: Record<string, any>) {
    return this.request('/analytics/track', {
      method: 'POST',
      body: JSON.stringify({ action, metadata })
    });
  }

  // Export analytics data
  async exportAnalytics(params?: { timeRange?: string; format?: string; type?: string }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(`/analytics/export${query}`);
  }

  // Audit and Security API methods
  async getAuditLogs(params?: { 
    limit?: number; 
    offset?: number; 
    userId?: string; 
    action?: string; 
    severity?: string; 
    startDate?: string; 
    endDate?: string; 
    ipAddress?: string; 
  }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(`/audit/logs${query}`);
  }

  async getAuditStats(params?: { timeframe?: string }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(`/audit/stats${query}`);
  }

  async getSecurityEvents(params?: { limit?: number; userId?: string }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(`/audit/security-events${query}`);
  }

  async getFailedLogins(params?: { timeframe?: string; limit?: number }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(`/audit/failed-logins${query}`);
  }

  async getSuspiciousActivity(params?: { timeframe?: string }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(`/audit/suspicious-activity${query}`);
  }

  async getAuditSummary(params?: { timeframe?: string }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(`/audit/summary${query}`);
  }

  // User invitation API methods
  async inviteUser(invitation: { email: string; role: string; message?: string }) {
    return this.request('/admin/invite', {
      method: 'POST',
      body: JSON.stringify(invitation)
    });
  }

  async getPendingInvitations() {
    return this.request('/admin/invitations');
  }

  async cancelInvitation(invitationId: string) {
    return this.request(`/admin/invitations/${invitationId}`, {
      method: 'DELETE'
    });
  }

  // Database health and optimization API methods
  async getDatabaseHealth() {
    return this.request('/database/health');
  }

  async getDatabaseMetrics() {
    return this.request('/database/metrics');
  }

  async getDatabaseSlowQueries() {
    return this.request('/database/slow-queries');
  }

  async getDatabaseOptimization() {
    return this.request('/database/optimization');
  }

  async optimizeDatabase() {
    return this.request('/database/optimize', {
      method: 'POST'
    });
  }

  async getDatabasePoolStatus() {
    return this.request('/database/pool/status');
  }

  // Bot Management API methods
  async getBots() {
    return this.request('/bots');
  }

  async createBot(bot: {
    name: string;
    platform: 'slack' | 'discord';
    description?: string;
    token: string;
    channels?: string[];
    enabled?: boolean;
  }) {
    return this.request('/bots', {
      method: 'POST',
      body: JSON.stringify(bot),
    });
  }

  async updateBot(botId: string, updates: {
    name?: string;
    description?: string;
    token?: string;
    channels?: string[];
    enabled?: boolean;
  }) {
    return this.request(`/bots/${botId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteBot(botId: string) {
    return this.request(`/bots/${botId}`, { method: 'DELETE' });
  }

  async getBotCommands(botId?: string) {
    const query = botId ? `?botId=${botId}` : '';
    return this.request(`/bots/commands${query}`);
  }

  async createBotCommand(command: {
    botId: string;
    name: string;
    description: string;
    response: string;
    triggers?: string[];
    enabled?: boolean;
  }) {
    return this.request('/bots/commands', {
      method: 'POST',
      body: JSON.stringify(command),
    });
  }

  async updateBotCommand(commandId: string, updates: {
    name?: string;
    description?: string;
    response?: string;
    triggers?: string[];
    enabled?: boolean;
  }) {
    return this.request(`/bots/commands/${commandId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteBotCommand(commandId: string) {
    return this.request(`/bots/commands/${commandId}`, { method: 'DELETE' });
  }

  async getBotAnalytics(botId: string, timeRange = '7d') {
    return this.request(`/bots/${botId}/analytics?timeRange=${timeRange}`);
  }

  async testBotConnection(botId: string) {
    return this.request(`/bots/${botId}/test`, { method: 'POST' });
  }

  async getBotHistory(params?: { limit?: number; botId?: string }) {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.botId) query.set('botId', params.botId);
    
    return this.request(`/bots/history?${query}`);
  }

  async testBotCommand(command: {
    command: string;
    platform?: string;
    channel?: string;
    botId?: string;
  }) {
    return this.request('/bots/test-command', {
      method: 'POST',
      body: JSON.stringify(command),
    });
  }

  // Secrets Management endpoints
  async rotateJWTSecret() {
    return this.request('/secrets/rotate-jwt', {
      method: 'POST',
    });
  }

  async createAPIKey(data: {
    name: string;
    permissions: string[];
  }) {
    return this.request('/secrets/api-keys', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAPIKeys() {
    return this.request('/secrets/api-keys');
  }

  async deleteAPIKey(keyId: string) {
    return this.request(`/secrets/api-keys/${keyId}`, {
      method: 'DELETE',
    });
  }

  async generateBackupCodes(count = 10) {
    return this.request('/secrets/backup-codes', {
      method: 'POST',
      body: JSON.stringify({ count }),
    });
  }

  async rotateEncryptionKey(confirmation: string) {
    return this.request('/secrets/rotate-encryption-key', {
      method: 'POST',
      body: JSON.stringify({ confirmation }),
    });
  }

  async getSecretsStatus() {
    return this.request('/secrets/status');
  }

  async getSecretsHealth() {
    return this.request('/secrets/health');
  }

  // DLP API methods
  async scanContent(content: string, context?: any) {
    return this.request('/dlp/scan', {
      method: 'POST',
      body: JSON.stringify({ content, context })
    });
  }

  async getDLPPolicies() {
    return this.request('/dlp/policies');
  }

  async createDLPPolicy(policy: any) {
    return this.request('/dlp/policies', {
      method: 'POST',
      body: JSON.stringify(policy)
    });
  }

  async updateDLPPolicy(policyId: string, updates: any) {
    return this.request(`/dlp/policies/${policyId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async getDLPViolations(filters?: any) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    const query = params.toString();
    return this.request(`/dlp/violations${query ? '?' + query : ''}`);
  }

  async resolveDLPViolation(violationId: string, resolution: string, notes?: string) {
    return this.request(`/dlp/violations/${violationId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution, notes })
    });
  }

  async getQuarantinedContent() {
    return this.request('/dlp/quarantine');
  }

  async reviewQuarantinedContent(quarantineId: string, decision: string, notes?: string) {
    return this.request(`/dlp/quarantine/${quarantineId}/review`, {
      method: 'POST',
      body: JSON.stringify({ decision, notes })
    });
  }

  async getDLPStatistics() {
    return this.request('/dlp/statistics');
  }

  async exportDLPCompliance(options?: any) {
    const params = new URLSearchParams();
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    const query = params.toString();
    return this.request(`/dlp/compliance/export${query ? '?' + query : ''}`);
  }

  async testDLPPatterns(content: string, patterns?: string[]) {
    return this.request('/dlp/test', {
      method: 'POST',
      body: JSON.stringify({ content, patterns })
    });
  }

  // Backup API methods
  async createBackup(options?: any) {
    return this.request('/backup/create', {
      method: 'POST',
      body: JSON.stringify(options || {})
    });
  }

  async getBackupHistory(filters?: any) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    const query = params.toString();
    return this.request(`/backup/history${query ? '?' + query : ''}`);
  }

  async restoreBackup(backupId: string, options?: any) {
    return this.request(`/backup/${backupId}/restore`, {
      method: 'POST',
      body: JSON.stringify(options || {})
    });
  }

  async verifyBackup(backupId: string) {
    return this.request(`/backup/${backupId}/verify`);
  }

  async downloadBackup(backupId: string) {
    // Return the URL for direct download
    return `/api/backup/${backupId}/download`;
  }

  async getBackupStatistics() {
    return this.request('/backup/statistics');
  }

  async getBackupSchedule() {
    return this.request('/backup/schedule');
  }

  async updateBackupSchedule(schedule: any) {
    return this.request('/backup/schedule', {
      method: 'PUT',
      body: JSON.stringify(schedule)
    });
  }

  async cleanupBackups() {
    return this.request('/backup/cleanup', {
      method: 'POST'
    });
  }


  // Advanced Search API methods
  async search(query: string, options?: {
    contentTypes?: string[];
    workspaceId?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'relevance' | 'date';
    includeHighlights?: boolean;
    dateStart?: string;
    dateEnd?: string;
    author?: string;
  }) {
    const params = new URLSearchParams();
    params.append('q', query);
    
    if (options) {
      if (options.contentTypes) params.append('contentTypes', options.contentTypes.join(','));
      if (options.workspaceId) params.append('workspaceId', options.workspaceId);
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
      if (options.sortBy) params.append('sortBy', options.sortBy);
      if (options.includeHighlights !== undefined) params.append('includeHighlights', options.includeHighlights.toString());
      if (options.dateStart) params.append('dateStart', options.dateStart);
      if (options.dateEnd) params.append('dateEnd', options.dateEnd);
      if (options.author) params.append('author', options.author);
    }

    return this.request(`/search?${params.toString()}`);
  }

  async getSearchSuggestions(query: string, limit = 10) {
    const params = new URLSearchParams();
    params.append('q', query);
    params.append('limit', limit.toString());
    
    return this.request(`/search/suggestions?${params.toString()}`);
  }

  async getSearchAnalytics() {
    return this.request('/search/analytics');
  }

  async logSearchClick(searchId: string, resultId: string, resultType: string) {
    return this.request('/search/click', {
      method: 'POST',
      body: JSON.stringify({ searchId, resultId, resultType })
    });
  }

  async getSearchFacets(workspaceId?: string) {
    const params = workspaceId ? `?workspaceId=${workspaceId}` : '';
    return this.request(`/search/facets${params}`);
  }

  async exportSearchAnalytics(format: 'json' | 'csv' = 'json', timeRange: '7d' | '30d' | '90d' | 'all' = '30d') {
    const params = new URLSearchParams();
    params.append('format', format);
    params.append('timeRange', timeRange);
    
    return this.request(`/search/export?${params.toString()}`);
  }

  // AI-Powered Features API methods
  async getAISuggestions(context: {
    currentContent: string;
    cursorPosition?: number;
    title?: string;
    noteId?: string;
    workspaceId?: string;
  }) {
    return this.request('/ai/suggestions', {
      method: 'POST',
      body: JSON.stringify(context)
    });
  }

  async generateSmartTags(content: string, title?: string) {
    return this.request('/ai/tags', {
      method: 'POST',
      body: JSON.stringify({ content, title })
    });
  }

  async analyzeContent(content: string) {
    return this.request('/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  }

  async getAITemplates(type?: string) {
    const params = type ? `?type=${encodeURIComponent(type)}` : '';
    return this.request(`/ai/templates${params}`);
  }

  async getAIStatistics() {
    return this.request('/ai/statistics');
  }

  async cleanupAICaches() {
    return this.request('/ai/cleanup', {
      method: 'POST'
    });
  }
}

export const api = new ApiClient();