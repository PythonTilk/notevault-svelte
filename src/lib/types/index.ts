export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatar?: string;
  role: 'admin' | 'moderator' | 'user';
  createdAt: Date;
  lastActive: Date;
  isOnline: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  color: string;
  ownerId: string;
  members: WorkspaceMember[];
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
}

export interface WorkspaceMember {
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: Date;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'rich' | 'code' | 'canvas';
  workspaceId: string;
  authorId: string;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  color: string;
  tags: string[];
  collectionId?: string;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
}

export interface NoteCollection {
  id: string;
  name: string;
  description?: string;
  workspaceId: string;
  authorId: string;
  parentId?: string;
  color: string;
  icon?: string;
  isExpanded?: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  content: string;
  authorId: string;
  author: User;
  channelId?: string;
  replyToId?: string;
  createdAt: Date;
  editedAt?: Date;
  reactions: Reaction[];
  deliveryStatus?: 'sending' | 'sent' | 'delivered' | 'failed';
}

export interface Reaction {
  emoji: string;
  users: string[];
  count: number;
}

export interface FileItem {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploaderId: string;
  workspaceId?: string;
  createdAt: Date;
  isPublic: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  author: User;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

export interface AuditLog {
  id: string;
  action: string;
  userId: string;
  user: User;
  targetType: string;
  targetId: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
}

export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalWorkspaces: number;
  totalNotes: number;
  totalFiles: number;
  storageUsed: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
  actionUrl?: string;
  userId: string;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  mentions: boolean;
  workspaceUpdates: boolean;
  announcements: boolean;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  notifications: NotificationSettings;
  privacy: {
    showOnlineStatus: boolean;
    allowDirectMessages: boolean;
  };
}