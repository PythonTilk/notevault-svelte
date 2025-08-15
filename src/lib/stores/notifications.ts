import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import type { Notification } from '$lib/types';
import { api } from '$lib/api';

export const notifications = writable<Notification[]>([]);
export const isLoading = writable<boolean>(false);
export const error = writable<string | null>(null);

// Derived store for unread count
export const unreadCount = derived(notifications, $notifications => 
  $notifications.filter(n => !n.isRead).length
);

export const notificationStore = {
  // Load notifications from API
  load: async (params?: { limit?: number; offset?: number; unreadOnly?: boolean }) => {
    if (!browser) return;
    
    try {
      isLoading.set(true);
      error.set(null);
      
      const data = await api.getNotifications(params);
      
      // Convert date strings to Date objects
      const formattedNotifications: Notification[] = data.map((notification: any) => ({
        ...notification,
        createdAt: new Date(notification.createdAt),
        updatedAt: new Date(notification.updatedAt)
      }));
      
      notifications.set(formattedNotifications);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      error.set(err instanceof Error ? err.message : 'Failed to load notifications');
      
      // Fallback to mock data for development
      const mockNotifications: Notification[] = [
        {
          id: '1',
          title: 'Welcome to NoteVault!',
          message: 'Your account has been successfully created. Start by creating your first workspace.',
          type: 'success',
          isRead: false,
          createdAt: new Date(Date.now() - 3600000),
          updatedAt: new Date(Date.now() - 3600000),
          actionUrl: '/workspaces',
          userId: 'current-user'
        },
        {
          id: '2',
          title: 'New workspace member',
          message: 'John Doe has joined your "Team Project" workspace.',
          type: 'info',
          isRead: false,
          createdAt: new Date(Date.now() - 7200000),
          updatedAt: new Date(Date.now() - 7200000),
          userId: 'current-user'
        },
        {
          id: '3',
          title: 'Note shared with you',
          message: 'Alice shared a note "Meeting Notes" with you in the Research workspace.',
          type: 'info',
          isRead: true,
          createdAt: new Date(Date.now() - 86400000),
          updatedAt: new Date(Date.now() - 86400000),
          actionUrl: '/workspaces/2',
          userId: 'current-user'
        }
      ];
      notifications.set(mockNotifications);
    } finally {
      isLoading.set(false);
    }
  },

  // Mark notification as read
  markAsRead: async (notificationId: string) => {
    try {
      await api.markNotificationAsRead(notificationId);
      
      // Update local state
      notifications.update(list => 
        list.map(n => 
          n.id === notificationId 
            ? { ...n, isRead: true, updatedAt: new Date() } 
            : n
        )
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      
      // Still update local state as fallback
      notifications.update(list => 
        list.map(n => 
          n.id === notificationId 
            ? { ...n, isRead: true, updatedAt: new Date() } 
            : n
        )
      );
    }
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    try {
      await api.markAllNotificationsAsRead();
      
      // Update local state
      notifications.update(list => 
        list.map(n => ({ ...n, isRead: true, updatedAt: new Date() }))
      );
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      
      // Still update local state as fallback
      notifications.update(list => 
        list.map(n => ({ ...n, isRead: true, updatedAt: new Date() }))
      );
    }
  },

  // Delete notification
  delete: async (notificationId: string) => {
    try {
      await api.deleteNotification(notificationId);
      
      // Update local state
      notifications.update(list => 
        list.filter(n => n.id !== notificationId)
      );
    } catch (err) {
      console.error('Failed to delete notification:', err);
      
      // Still update local state as fallback
      notifications.update(list => 
        list.filter(n => n.id !== notificationId)
      );
    }
  },

  // Add new notification (for real-time updates)
  add: (notification: Notification) => {
    notifications.update(list => [
      {
        ...notification,
        createdAt: new Date(notification.createdAt),
        updatedAt: new Date(notification.updatedAt)
      },
      ...list
    ]);
  },

  // Clear all notifications
  clear: () => {
    notifications.set([]);
  }
};

// Auto-load notifications when the store is initialized
if (browser) {
  notificationStore.load();
}