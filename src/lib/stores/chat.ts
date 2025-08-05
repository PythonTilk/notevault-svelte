import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { io, type Socket } from 'socket.io-client';
import type { ChatMessage, User } from '$lib/types';
import { api } from '$lib/api';
import { currentUser } from './auth';

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
        // Load initial messages
        chatStore.loadMessages();
      }
    });

    socket.on('new-message', (message: ChatMessage) => {
      chatMessages.update(messages => [...messages, message]);
    });

    socket.on('message-sent', (message: ChatMessage) => {
      // Message confirmation from server
      console.log('Message sent successfully:', message);
    });

    socket.on('message-error', (error) => {
      console.error('Message error:', error);
    });

    socket.on('user-online', (data) => {
      console.log('User came online:', data.userId);
      // Update user online status
    });

    socket.on('user-offline', (data) => {
      console.log('User went offline:', data.userId);
      // Update user offline status
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
        authorId: msg.authorId,
        author: msg.author,
        channelId: msg.channelId,
        replyToId: msg.replyToId,
        createdAt: new Date(msg.createdAt),
        editedAt: msg.editedAt ? new Date(msg.editedAt) : undefined,
        reactions: msg.reactions || []
      }));
      chatMessages.set(formattedMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
      chatMessages.set([]);
    }
  },

  sendMessage: async (content: string, channelId?: string, replyToId?: string) => {
    try {
      // Send via API for persistence
      const message = await api.sendMessage({ content, channelId, replyToId });
      
      // Also send via socket for real-time
      if (socket?.connected) {
        socket.emit('send-message', { content, channelId, replyToId });
      }
      
      return message;
    } catch (error) {
      console.error('Failed to send message:', error);
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

  deleteMessage: async (messageId: string) => {
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
  }
};