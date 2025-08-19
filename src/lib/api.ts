import { browser } from '$app/environment';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private getAuthHeaders(): HeadersInit {
    if (!browser) return {};
    
    const token = localStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
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
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
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
  async getWorkspaceNotes(workspaceId: string) {
    return this.request(`/notes/workspace/${workspaceId}`);
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

  async getAdminWorkspaces(params?: {
    limit?: number;
    offset?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());
    
    return this.request(`/admin/workspaces?${query}`);
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

  async getAuditLogs(params?: {
    limit?: number;
    offset?: number;
    action?: string;
    userId?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());
    if (params?.action) query.set('action', params.action);
    if (params?.userId) query.set('userId', params.userId);
    
    return this.request(`/admin/audit-logs?${query}`);
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

  // Analytics API methods
  async getAnalytics(params?: { timeRange?: string }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(`/admin/analytics${query}`);
  }

  async getSystemHealth() {
    return this.request('/admin/system-health');
  }

  async getUsageStatistics(timeRange = '7d') {
    return this.request(`/admin/usage-stats?timeRange=${timeRange}`);
  }

  async getPerformanceMetrics(timeRange = '24h') {
    return this.request(`/admin/performance-metrics?timeRange=${timeRange}`);
  }

  async getErrorAnalytics(timeRange = '7d') {
    return this.request(`/admin/error-analytics?timeRange=${timeRange}`);
  }

  async getActivityFeed(params?: { limit?: number; offset?: number }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(`/admin/activity-feed${query}`);
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
}

export const api = new ApiClient();