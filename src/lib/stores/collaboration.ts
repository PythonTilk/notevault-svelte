import { writable, derived, type Writable } from 'svelte/store';
import { browser } from '$app/environment';
import io, { type Socket } from 'socket.io-client';

// Types
interface User {
  id: string;
  username: string;
  displayName?: string;
  email?: string;
  color?: string;
  isTyping?: boolean;
}

interface CursorPosition {
  userId: string;
  x: number;
  y: number;
  element?: string;
  timestamp: number;
}

interface TextSelection {
  userId: string;
  start: number;
  end: number;
  element: string;
  timestamp: number;
}

interface Room {
  id: string;
  type: string;
}

interface DocumentUpdate {
  type: 'insert' | 'delete' | 'replace';
  position?: number;
  start?: number;
  end?: number;
  content?: string;
  timestamp: number;
}

// Collaboration state
export const isConnected: Writable<boolean> = writable(false);
export const activeUsers: Writable<Map<string, User>> = writable(new Map());
export const cursors: Writable<Map<string, CursorPosition>> = writable(new Map());
export const selections: Writable<Map<string, TextSelection>> = writable(new Map());
export const currentRoom: Writable<Room | null> = writable(null);

// Socket instance
let socket: Socket | null = null;

// User colors for cursors and selections
const USER_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#84CC16', '#6366F1'
];

// Current user info
export const currentUser: Writable<User | null> = writable(null);

// Get user color based on user ID
function getUserColor(userId: string): string {
  const hash = userId.split('').reduce((a: number, b: string) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

// Initialize Socket.IO connection
export function initializeCollaboration(user: User): void {
  if (!browser || socket) return;

  currentUser.set(user);
  
  const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';
  
  socket = io(socketUrl, {
    auth: {
      token: localStorage.getItem('token')
    },
    transports: ['websocket']
  });

  socket.on('connect', () => {
    console.log('Connected to collaboration server');
    isConnected.set(true);
    
    // Send user info
    if (socket) {
      socket.emit('user:join', {
        ...user,
        color: getUserColor(user.id)
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from collaboration server');
    isConnected.set(false);
    activeUsers.set(new Map());
    cursors.set(new Map());
    selections.set(new Map());
  });

  socket.on('user:joined', (userData: User) => {
    console.log('User joined:', userData);
    activeUsers.update(users => {
      const newUsers = new Map(users);
      newUsers.set(userData.id, {
        ...userData,
        color: getUserColor(userData.id)
      });
      return newUsers;
    });
  });

  socket.on('user:left', (userId: string) => {
    console.log('User left:', userId);
    activeUsers.update(users => {
      const newUsers = new Map(users);
      newUsers.delete(userId);
      return newUsers;
    });
    
    // Clean up cursors and selections
    cursors.update(cursorsMap => {
      const newCursors = new Map(cursorsMap);
      newCursors.delete(userId);
      return newCursors;
    });
    
    selections.update(selectionsMap => {
      const newSelections = new Map(selectionsMap);
      for (const [key, selection] of selectionsMap) {
        if (selection.userId === userId) {
          newSelections.delete(key);
        }
      }
      return newSelections;
    });
  });

  socket.on('cursor:update', (cursorData: CursorPosition) => {
    cursors.update(cursorsMap => {
      const newCursors = new Map(cursorsMap);
      newCursors.set(cursorData.userId, cursorData);
      return newCursors;
    });
  });

  socket.on('selection:update', (selectionData: TextSelection) => {
    selections.update(selectionsMap => {
      const newSelections = new Map(selectionsMap);
      const key = `${selectionData.userId}-${selectionData.element}`;
      
      if (selectionData.start === selectionData.end) {
        // No selection, remove
        newSelections.delete(key);
      } else {
        newSelections.set(key, selectionData);
      }
      return newSelections;
    });
  });

  socket.on('document:update', (updateData: DocumentUpdate & { userId: string; element: string }) => {
    // Handle document updates from other users
    console.log('Document update received:', updateData);
    // This would be handled by the document/editor components
  });

  socket.on('typing:start', (data: { userId: string; element: string }) => {
    activeUsers.update(users => {
      const newUsers = new Map(users);
      const user = newUsers.get(data.userId);
      if (user) {
        newUsers.set(data.userId, { ...user, isTyping: true });
      }
      return newUsers;
    });
  });

  socket.on('typing:stop', (data: { userId: string; element: string }) => {
    activeUsers.update(users => {
      const newUsers = new Map(users);
      const user = newUsers.get(data.userId);
      if (user) {
        newUsers.set(data.userId, { ...user, isTyping: false });
      }
      return newUsers;
    });
  });

  socket.on('error', (error: Error) => {
    console.error('Collaboration error:', error);
  });
}

// Join a collaboration room (workspace/note)
export function joinRoom(roomId: string, roomType = 'workspace'): void {
  if (!socket) return;
  
  socket.emit('room:join', {
    roomId,
    roomType
  });
  
  currentRoom.set({ id: roomId, type: roomType });
}

// Leave current room
export function leaveRoom(): void {
  if (!socket) return;
  
  socket.emit('room:leave');
  
  // Clear room state
  currentRoom.set(null);
  activeUsers.set(new Map());
  cursors.set(new Map());
  selections.set(new Map());
}

// Send cursor position
export function updateCursor(x: number, y: number, element: string | null = null): void {
  if (!socket) return;
  
  socket.emit('cursor:update', {
    x,
    y,
    element,
    timestamp: Date.now()
  });
}

// Send text selection
export function updateSelection(selection: { start: number; end: number } | null, element: string | null = null): void {
  if (!socket) return;
  
  socket.emit('selection:update', {
    start: selection?.start || 0,
    end: selection?.end || 0,
    element,
    timestamp: Date.now()
  });
}

// Send document changes
export function sendDocumentUpdate(changes: DocumentUpdate, element: string | null = null): void {
  if (!socket) return;
  
  socket.emit('document:update', {
    ...changes,
    element,
    timestamp: Date.now()
  });
}

// Send typing indicator
export function startTyping(element: string | null = null): void {
  if (!socket) return;
  
  socket.emit('typing:start', {
    element,
    timestamp: Date.now()
  });
}

// Stop typing indicator
export function stopTyping(element: string | null = null): void {
  if (!socket) return;
  
  socket.emit('typing:stop', {
    element,
    timestamp: Date.now()
  });
}

// Derived stores
export const onlineUserCount = derived(
  activeUsers,
  ($activeUsers) => $activeUsers.size
);

export const typingUsers = derived(
  activeUsers,
  ($activeUsers) => Array.from($activeUsers.values()).filter(user => user.isTyping)
);

export const collaborationStatus = derived(
  [isConnected, currentRoom, onlineUserCount],
  ([$isConnected, $currentRoom, $onlineUserCount]) => ({
    connected: $isConnected,
    room: $currentRoom,
    userCount: $onlineUserCount,
    status: $isConnected 
      ? ($currentRoom ? 'in-room' : 'connected') 
      : 'disconnected'
  })
);

// Utility functions
export function getUserById(userId: string): User | undefined {
  let user: User | undefined;
  activeUsers.subscribe(users => {
    user = users.get(userId);
  })();
  return user;
}

export function isUserTyping(userId: string): boolean {
  const user = getUserById(userId);
  return user?.isTyping || false;
}

// Cleanup function
export function disconnectCollaboration(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  
  // Reset all stores
  isConnected.set(false);
  activeUsers.set(new Map());
  cursors.set(new Map());
  selections.set(new Map());
  currentRoom.set(null);
  currentUser.set(null);
}

// Auto-cleanup on page unload
if (browser) {
  window.addEventListener('beforeunload', disconnectCollaboration);
}