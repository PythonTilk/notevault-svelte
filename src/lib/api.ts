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
  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
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
    limit?: number;
    offset?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.workspaceId) query.set('workspaceId', params.workspaceId);
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
}

export const api = new ApiClient();