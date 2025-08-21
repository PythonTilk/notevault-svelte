import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { io, type Socket } from 'socket.io-client';
import type { ChatMessage, User, Notification } from '$lib/types';
import { api } from '$lib/api';
import { currentUser } from './auth';
import { notificationStore } from './notifications';

export const chatMessages = writable<ChatMessage[]>([]);
export const connectedUsers = writable<User[]>([]);
export const onlineUsers = connectedUsers; // Alias for compatibility
export const isConnected = writable<boolean>(false);
export const typingUsers = writable<string[]>([]);

let socket: Socket | null = null;

// Helper function to get current user ID
const getCurrentUserId = (): string | null => {
  let userId: string | null = null;
  currentUser.subscribe(user => {
    userId = user?.id || null;
  })();
  return userId;
};

export const chatStore = {
  connect: () => {
    if (!browser || socket?.connected) return;

    // Use the same base URL as the API but without the /api path for WebSocket
    const wsUrl = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace('/api', '') 
      : 'http://localhost:3001';
    
    socket = io(wsUrl, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('Connected to chat server');
      isConnected.set(true);
      
      // Authenticate with token
      const token = localStorage.getItem('auth_token');
      if (token) {
        socket?.emit('authenticate', token);
      }
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from chat server');
      isConnected.set(false);
    });

    socket.on('authenticated', (data) => {
      if (data.success) {
        console.log('Chat authentication successful');
        // Load online users only; pages will load channel-specific messages
        chatStore.loadOnlineUsers();
      }
    });

    socket.on('online-users', (users) => {
      console.log('Received online users:', users);
      connectedUsers.set(users.map((user: any) => ({
        id: user.id || user.userId,
        username: user.username,
        displayName: user.displayName || user.display_name,
        avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`,
        role: user.role || 'user',
        isOnline: true,
        email: user.email || '',
        createdAt: new Date(user.createdAt || Date.now()),
        lastActive: new Date(user.lastActive || Date.now())
      })));
    });

    socket.on('new-message', (message: ChatMessage) => {
      const uid = getCurrentUserId();
      if (uid && (message.authorId === uid || message.author?.id === uid)) {
        return; // Ignore own messages broadcasted back from server
      }
      chatMessages.update(messages => [...messages, message]);
    });

    socket.on('message-sent', (data: { messageId: string; status: 'sent' | 'delivered' }) => {
      // Message confirmation from server
      console.log('Message status update:', data);
      chatMessages.update(messages => 
        messages.map(msg => 
          msg.id === data.messageId 
            ? { ...msg, deliveryStatus: data.status }
            : msg
        )
      );
    });

    socket.on('message-delivered', (data: { messageId: string }) => {
      // Message delivered confirmation
      chatMessages.update(messages => 
        messages.map(msg => 
          msg.id === data.messageId 
            ? { ...msg, deliveryStatus: 'delivered' as const }
            : msg
        )
      );
    });

    socket.on('message-error', (error: { messageId?: string; error: string }) => {
      console.error('Message error:', error);
      if (error.messageId) {
        chatMessages.update(messages => 
          messages.map(msg => 
            msg.id === error.messageId 
              ? { ...msg, deliveryStatus: 'failed' as const }
              : msg
          )
        );
      }
    });

    socket.on('user-online', (data) => {
      console.log('User came online:', data.userId);
      connectedUsers.update(users => {
        // Check if user is already in the list
        if (!users.find(user => user.id === data.userId)) {
          // Add new online user
          return [...users, data.user || {
            id: data.userId,
            username: data.username || 'Unknown',
            displayName: data.displayName || 'Unknown User',
            avatar: data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.userId}`,
            role: data.role || 'user',
            isOnline: true,
            email: data.email || '',
            createdAt: new Date(),
            lastActive: new Date()
          }];
        }
        return users;
      });
    });

    socket.on('user-offline', (data) => {
      console.log('User went offline:', data.userId);
      connectedUsers.update(users => 
        users.filter(user => user.id !== data.userId)
      );
    });

    socket.on('user-typing', (data) => {
      typingUsers.update(users => {
        if (!users.includes(data.userId)) {
          return [...users, data.userId];
        }
        return users;
      });
    });

    socket.on('user-stopped-typing', (data) => {
      typingUsers.update(users => users.filter(id => id !== data.userId));
    });

    // Notification event handlers
    socket.on('new-notification', (notification: Notification) => {
      console.log('Received new notification:', notification);
      notificationStore.add(notification);
    });

    socket.on('notification-read', (data: { notificationId: string }) => {
      console.log('Notification marked as read:', data.notificationId);
      // The notification store will handle this via API responses
    });

    socket.on('notification-deleted', (data: { notificationId: string }) => {
      console.log('Notification deleted:', data.notificationId);
      // The notification store will handle this via API responses
    });
  },

  disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    isConnected.set(false);
    typingUsers.set([]);
  },

  loadMessages: async (params?: {
    limit?: number;
    offset?: number;
    channel?: string;
  }) => {
    try {
      const messages = await api.getChatMessages(params);
      const formattedMessages: ChatMessage[] = messages.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        authorId: msg.authorId || msg.author_id,
        author: {
          id: msg.authorId || msg.author_id,
          username: msg.author?.username || 'unknown',
          displayName: msg.author?.displayName || msg.author?.display_name || msg.author?.username || 'Unknown User',
          avatar: msg.author?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.author?.username || 'unknown'}`,
          role: msg.author?.role || 'user',
          isOnline: true,
          email: msg.author?.email || '',
          createdAt: new Date(msg.author?.createdAt || Date.now()),
          lastActive: new Date()
        },
        channelId: msg.channelId || msg.channel_id,
        replyToId: msg.replyToId || msg.reply_to_id,
        createdAt: new Date(msg.createdAt || msg.created_at),
        editedAt: msg.editedAt ? new Date(msg.editedAt) : undefined,
        reactions: msg.reactions || []
      }));
      
      // Set messages (replace existing)
      chatMessages.set(formattedMessages);
      
      // If no messages and it's public chat, add demo messages
      if (formattedMessages.length === 0 && (!params?.channel || params.channel === 'public')) {
        const demoMessages = [
          {
            id: 'demo-1',
            content: 'Welcome to NoteVault Community Chat! 👋',
            authorId: '1',
            author: {
              id: '1',
              username: 'admin',
              displayName: 'System Admin',
              avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
              role: 'admin',
              email: 'admin@notevault.io',
              isOnline: true,
              createdAt: new Date(),
              lastActive: new Date()
            },
            channelId: undefined,
            replyToId: undefined,
            createdAt: new Date(Date.now() - 3600000), // 1 hour ago
            editedAt: undefined,
            reactions: [
              { emoji: '👋', users: ['2'], count: 1 }
            ]
          },
          {
            id: 'demo-2',
            content: 'This is where you can chat with other members of your workspace. Feel free to start a conversation!',
            authorId: '1',
            author: {
              id: '1',
              username: 'admin',
              displayName: 'System Admin',
              avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
              role: 'admin',
              email: 'admin@notevault.io',
              isOnline: true,
              createdAt: new Date(),
              lastActive: new Date()
            },
            channelId: undefined,
            replyToId: undefined,
            createdAt: new Date(Date.now() - 1800000), // 30 minutes ago
            editedAt: undefined,
            reactions: []
          }
        ];
        chatMessages.set(demoMessages);
      } else {
        chatMessages.set(formattedMessages);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
      // Set demo messages on error too
      const demoMessages = [
        {
          id: 'demo-1',
          content: 'Welcome to NoteVault Community Chat! 👋',
          authorId: '1',
          author: {
            id: '1',
            username: 'admin',
            displayName: 'System Admin',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
            role: 'admin',
            email: 'admin@notevault.io',
            isOnline: true,
            createdAt: new Date(),
            lastActive: new Date()
          },
          channelId: undefined,
          replyToId: undefined,
          createdAt: new Date(Date.now() - 3600000),
          editedAt: undefined,
          reactions: [
            { emoji: '👋', users: ['2'], count: 1 }
          ]
        }
      ];
      chatMessages.set(demoMessages);
    }
  },

  loadOnlineUsers: async () => {
    try {
      // For now, load some demo users until we implement WebSocket user tracking
      const demoUsers = [
        {
          id: '1',
          username: 'admin',
          displayName: 'System Admin',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
          role: 'admin',
          email: 'admin@notevault.io',
          isOnline: true,
          createdAt: new Date(),
          lastActive: new Date()
        },
        {
          id: getCurrentUserId() || '2',
          username: 'you',
          displayName: 'You',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=you',
          role: 'user',
          email: 'you@example.com',
          isOnline: true,
          createdAt: new Date(),
          lastActive: new Date()
        }
      ];
      connectedUsers.set(demoUsers);
      
      // Also request users from server if connected
      if (socket?.connected) {
        socket.emit('get-online-users');
      }
    } catch (error) {
      console.error('Failed to load online users:', error);
      connectedUsers.set([]);
    }
  },

  sendMessage: async (content: string, channelId?: string, replyToId?: string) => {
    const tempId = 'temp-' + Date.now();
    const userId = getCurrentUserId();
    
    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Add temporary message with 'sending' status
    const tempMessage: ChatMessage = {
      id: tempId,
      content,
      authorId: userId,
      author: {
        id: userId,
        username: 'You',
        email: '',
        displayName: 'You',
        role: 'user',
        createdAt: new Date(),
        lastActive: new Date(),
        isOnline: true
      },
      channelId,
      replyToId,
      createdAt: new Date(),
      reactions: [],
      deliveryStatus: 'sending'
    };

    // Add temp message to UI immediately
    chatMessages.update(messages => [...messages, tempMessage]);

    try {
      // Send via API for persistence
      const message = await api.sendMessage({ content, channelId, replyToId });
      
      // Update temp message with real message data and 'sent' status
      chatMessages.update(messages => 
        messages.map(msg => 
          msg.id === tempId 
            ? { ...message, deliveryStatus: 'sent' as const }
            : msg
        )
      );
      
      // Do not emit via socket here; server will broadcast after API write
      return message;
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Update temp message status to 'failed'
      chatMessages.update(messages => 
        messages.map(msg => 
          msg.id === tempId 
            ? { ...msg, deliveryStatus: 'failed' as const }
            : msg
        )
      );
      
      throw error;
    }
  },

  retryMessage: async (messageId: string) => {
    let messageToRetry: ChatMessage | undefined;
    
    chatMessages.update(messages => {
      messageToRetry = messages.find(msg => msg.id === messageId);
      return messages.map(msg => 
        msg.id === messageId 
          ? { ...msg, deliveryStatus: 'sending' as const }
          : msg
      );
    });

    if (!messageToRetry) {
      throw new Error('Message not found');
    }

    try {
      // Retry sending the message
      const message = await api.sendMessage({ 
        content: messageToRetry.content, 
        channelId: messageToRetry.channelId, 
        replyToId: messageToRetry.replyToId 
      });
      
      // Update with new message data and 'sent' status
      chatMessages.update(messages => 
        messages.map(msg => 
          msg.id === messageId 
            ? { ...message, deliveryStatus: 'sent' as const }
            : msg
        )
      );
      
      // Do not emit via socket here; server will broadcast after API write
      return message;
    } catch (error) {
      console.error('Failed to retry message:', error);
      
      // Update status back to 'failed'
      chatMessages.update(messages => 
        messages.map(msg => 
          msg.id === messageId 
            ? { ...msg, deliveryStatus: 'failed' as const }
            : msg
        )
      );
      
      throw error;
    }
  },

  editMessage: async (messageId: string, content: string) => {
    try {
      await api.editMessage(messageId, content);
      
      // Update local state
      chatMessages.update(messages =>
        messages.map(msg =>
          msg.id === messageId
            ? { ...msg, content, editedAt: new Date() }
            : msg
        )
      );
    } catch (error) {
      console.error('Failed to edit message:', error);
      throw error;
    }
  },

  deleteMessageApi: async (messageId: string) => {
    try {
      await api.deleteMessage(messageId);
      
      // Update local state
      chatMessages.update(messages =>
        messages.filter(msg => msg.id !== messageId)
      );
    } catch (error) {
      console.error('Failed to delete message:', error);
      throw error;
    }
  },

  addReaction: async (messageId: string, emoji: string) => {
    try {
      await api.addReaction(messageId, emoji);
      
      const userId = getCurrentUserId();
      if (!userId) return;
      
      // Update local state optimistically
      chatMessages.update(messages =>
        messages.map(message => {
          if (message.id === messageId) {
            const existingReaction = message.reactions.find(r => r.emoji === emoji);
            if (existingReaction) {
              if (!existingReaction.users.includes(userId)) {
                existingReaction.users.push(userId);
                existingReaction.count++;
              }
            } else {
              message.reactions.push({
                emoji,
                users: [userId],
                count: 1
              });
            }
          }
          return message;
        })
      );
    } catch (error) {
      console.error('Failed to add reaction:', error);
      throw error;
    }
  },

  removeReaction: async (messageId: string, emoji: string) => {
    try {
      await api.removeReaction(messageId, emoji);
      
      const userId = getCurrentUserId();
      if (!userId) return;
      
      // Update local state optimistically
      chatMessages.update(messages =>
        messages.map(message => {
          if (message.id === messageId) {
            message.reactions = message.reactions
              .map(reaction => {
                if (reaction.emoji === emoji) {
                  reaction.users = reaction.users.filter(u => u !== userId);
                  reaction.count = reaction.users.length;
                }
                return reaction;
              })
              .filter(reaction => reaction.count > 0);
          }
          return message;
        })
      );
    } catch (error) {
      console.error('Failed to remove reaction:', error);
      throw error;
    }
  },

  startTyping: (channelId?: string) => {
    if (socket?.connected) {
      socket.emit('typing-start', { channelId });
    }
  },

  stopTyping: (channelId?: string) => {
    if (socket?.connected) {
      socket.emit('typing-stop', { channelId });
    }
  },

  joinWorkspace: (workspaceId: string) => {
    if (socket?.connected) {
      socket.emit('join-workspace', workspaceId);
    }
  },

  leaveWorkspace: (workspaceId: string) => {
    if (socket?.connected) {
      socket.emit('leave-workspace', workspaceId);
    }
  },

  // Moderation functions
  moderateUser: (userId: string, action: 'mute' | 'kick' | 'ban') => {
    if (socket?.connected) {
      socket.emit('moderate-user', { userId, action });
      console.log(`Moderation action: ${action} applied to user ${userId}`);
    }
  },

  muteUser: (userId: string, duration?: number) => {
    if (socket?.connected) {
      socket.emit('mute-user', { userId, duration });
    }
  },

  unmuteUser: (userId: string) => {
    if (socket?.connected) {
      socket.emit('unmute-user', { userId });
    }
  },

  kickUser: (userId: string, reason?: string) => {
    if (socket?.connected) {
      socket.emit('kick-user', { userId, reason });
    }
  },

  banUser: (userId: string, reason?: string) => {
    if (socket?.connected) {
      socket.emit('ban-user', { userId, reason });
    }
  },

  unbanUser: (userId: string) => {
    if (socket?.connected) {
      socket.emit('unban-user', { userId });
    }
  },

  deleteMessageSocket: (messageId: string) => {
    if (socket?.connected) {
      socket.emit('delete-message', { messageId });
      // Remove message from local store immediately
      chatMessages.update(messages => 
        messages.filter(msg => msg.id !== messageId)
      );
    }
  }
,

  // Backward-compatible alias
  deleteMessage: async (messageId: string) => {
    return chatStore.deleteMessageApi(messageId);
  }
};