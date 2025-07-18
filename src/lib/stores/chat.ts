import { writable } from 'svelte/store';
import type { ChatMessage, User } from '$lib/types';

export const chatMessages = writable<ChatMessage[]>([]);
export const onlineUsers = writable<User[]>([]);
export const isConnected = writable<boolean>(false);

// Mock users
const mockUsers: User[] = [
  {
    id: '1',
    username: 'demo_user',
    email: 'demo@example.com',
    displayName: 'Demo User',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
    role: 'admin',
    createdAt: new Date(),
    lastActive: new Date(),
    isOnline: true
  },
  {
    id: '2',
    username: 'alice_dev',
    email: 'alice@example.com',
    displayName: 'Alice Developer',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
    role: 'moderator',
    createdAt: new Date(),
    lastActive: new Date(),
    isOnline: true
  },
  {
    id: '3',
    username: 'bob_designer',
    email: 'bob@example.com',
    displayName: 'Bob Designer',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
    role: 'user',
    createdAt: new Date(),
    lastActive: new Date(),
    isOnline: false
  }
];

// Mock messages
const mockMessages: ChatMessage[] = [
  {
    id: '1',
    content: 'Welcome to the NoteVault community chat! 🎉',
    authorId: '1',
    author: mockUsers[0],
    createdAt: new Date(Date.now() - 3600000),
    reactions: [
      { emoji: '👋', users: ['2', '3'], count: 2 },
      { emoji: '🎉', users: ['2'], count: 1 }
    ]
  },
  {
    id: '2',
    content: 'Thanks for setting this up! The new workspace features look amazing.',
    authorId: '2',
    author: mockUsers[1],
    createdAt: new Date(Date.now() - 3000000),
    reactions: [
      { emoji: '💯', users: ['1'], count: 1 }
    ]
  },
  {
    id: '3',
    content: 'I love the drag and drop functionality in the canvas view. Makes organizing notes so much easier!',
    authorId: '3',
    author: mockUsers[2],
    createdAt: new Date(Date.now() - 1800000),
    reactions: []
  }
];

export const chatStore = {
  connect: () => {
    // Simulate WebSocket connection
    setTimeout(() => {
      isConnected.set(true);
      onlineUsers.set(mockUsers.filter(u => u.isOnline));
      chatMessages.set(mockMessages);
    }, 1000);
  },
  
  disconnect: () => {
    isConnected.set(false);
    onlineUsers.set([]);
  },
  
  sendMessage: async (content: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      authorId: '1',
      author: mockUsers[0],
      createdAt: new Date(),
      reactions: []
    };
    
    chatMessages.update(messages => [...messages, newMessage]);
    
    // Simulate other users responding
    setTimeout(() => {
      if (Math.random() > 0.7) {
        const responses = [
          'Great point!',
          'I agree with that.',
          'Thanks for sharing!',
          'Interesting perspective.',
          'That makes sense.'
        ];
        
        const randomUser = mockUsers[Math.floor(Math.random() * (mockUsers.length - 1)) + 1];
        const response: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: responses[Math.floor(Math.random() * responses.length)],
          authorId: randomUser.id,
          author: randomUser,
          replyToId: newMessage.id,
          createdAt: new Date(),
          reactions: []
        };
        
        chatMessages.update(messages => [...messages, response]);
      }
    }, 2000 + Math.random() * 3000);
  },
  
  addReaction: (messageId: string, emoji: string, userId: string) => {
    chatMessages.update(messages =>
      messages.map(message => {
        if (message.id === messageId) {
          const existingReaction = message.reactions.find(r => r.emoji === emoji);
          if (existingReaction) {
            if (existingReaction.users.includes(userId)) {
              // Remove reaction
              existingReaction.users = existingReaction.users.filter(id => id !== userId);
              existingReaction.count = existingReaction.users.length;
              if (existingReaction.count === 0) {
                message.reactions = message.reactions.filter(r => r.emoji !== emoji);
              }
            } else {
              // Add reaction
              existingReaction.users.push(userId);
              existingReaction.count = existingReaction.users.length;
            }
          } else {
            // New reaction
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
  }
};