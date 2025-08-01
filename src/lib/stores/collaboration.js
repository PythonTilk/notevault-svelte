import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import io from 'socket.io-client';

// Collaboration state
export const isConnected = writable(false);
export const activeUsers = writable(new Map());
export const cursors = writable(new Map());
export const selections = writable(new Map());
export const currentRoom = writable(null);

// Socket instance
let socket = null;

// User colors for cursors and selections
const USER_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#84CC16', '#6366F1'
];

// Current user info
export const currentUser = writable(null);

// Get user color based on user ID
function getUserColor(userId) {
  const hash = userId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

// Initialize Socket.IO connection
export function initializeCollaboration(user) {
  if (!browser || socket) return;

  currentUser.set(user);
  
  const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:56770';
  
  socket = io(socketUrl, {
    auth: {
      token: localStorage.getItem('token')
    },
    transports: ['websocket']
  });

  socket.on('connect', () => {
    console.log('Connected to collaboration server');
    isConnected.set(true);
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from collaboration server');
    isConnected.set(false);
    activeUsers.set(new Map());
    cursors.set(new Map());
    selections.set(new Map());
  });

  // User joined workspace/room
  socket.on('user-joined', (data) => {
    activeUsers.update(users => {
      const newUsers = new Map(users);
      newUsers.set(data.userId, {
        ...data.user,
        color: getUserColor(data.userId),
        joinedAt: Date.now()
      });
      return newUsers;
    });
  });

  // User left workspace/room
  socket.on('user-left', (data) => {
    activeUsers.update(users => {
      const newUsers = new Map(users);
      newUsers.delete(data.userId);
      return newUsers;
    });
    
    cursors.update(cursorMap => {
      const newCursors = new Map(cursorMap);
      newCursors.delete(data.userId);
      return newCursors;
    });
    
    selections.update(selectionMap => {
      const newSelections = new Map(selectionMap);
      newSelections.delete(data.userId);
      return newSelections;
    });
  });

  // Cursor position updates
  socket.on('cursor-update', (data) => {
    cursors.update(cursorMap => {
      const newCursors = new Map(cursorMap);
      newCursors.set(data.userId, {
        userId: data.userId,
        x: data.x,
        y: data.y,
        element: data.element,
        timestamp: Date.now()
      });
      return newCursors;
    });
  });

  // Text selection updates
  socket.on('selection-update', (data) => {
    selections.update(selectionMap => {
      const newSelections = new Map(selectionMap);
      if (data.selection) {
        newSelections.set(data.userId, {
          userId: data.userId,
          start: data.selection.start,
          end: data.selection.end,
          element: data.element,
          timestamp: Date.now()
        });
      } else {
        newSelections.delete(data.userId);
      }
      return newSelections;
    });
  });

  // Real-time document updates
  socket.on('document-update', (data) => {
    // Handle collaborative document editing
    console.log('Document update received:', data);
    // This would integrate with your text editor
  });

  // Typing indicators
  socket.on('typing-start', (data) => {
    activeUsers.update(users => {
      const newUsers = new Map(users);
      const user = newUsers.get(data.userId);
      if (user) {
        user.isTyping = true;
        user.typingElement = data.element;
      }
      return newUsers;
    });
  });

  socket.on('typing-stop', (data) => {
    activeUsers.update(users => {
      const newUsers = new Map(users);
      const user = newUsers.get(data.userId);
      if (user) {
        user.isTyping = false;
        user.typingElement = null;
      }
      return newUsers;
    });
  });

  return socket;
}

// Join a collaboration room (workspace/note)
export function joinRoom(roomId, roomType = 'workspace') {
  if (!socket) return;
  
  socket.emit('join-room', {
    roomId,
    roomType,
    timestamp: Date.now()
  });
  
  currentRoom.set({ id: roomId, type: roomType });
}

// Leave current room
export function leaveRoom() {
  if (!socket) return;
  
  socket.emit('leave-room');
  currentRoom.set(null);
  activeUsers.set(new Map());
  cursors.set(new Map());
  selections.set(new Map());
}

// Send cursor position
export function updateCursor(x, y, element = null) {
  if (!socket) return;
  
  socket.emit('cursor-move', {
    x,
    y,
    element,
    timestamp: Date.now()
  });
}

// Send text selection
export function updateSelection(selection, element = null) {
  if (!socket) return;
  
  socket.emit('selection-change', {
    selection,
    element,
    timestamp: Date.now()
  });
}

// Send document changes
export function sendDocumentUpdate(changes, element = null) {
  if (!socket) return;
  
  socket.emit('document-change', {
    changes,
    element,
    timestamp: Date.now()
  });
}

// Send typing indicator
export function startTyping(element = null) {
  if (!socket) return;
  
  socket.emit('typing-start', {
    element,
    timestamp: Date.now()
  });
}

export function stopTyping(element = null) {
  if (!socket) return;
  
  socket.emit('typing-stop', {
    element,
    timestamp: Date.now()
  });
}

// Cleanup cursors older than 30 seconds
if (browser) {
  setInterval(() => {
    const now = Date.now();
    const CURSOR_TIMEOUT = 30000; // 30 seconds
    
    cursors.update(cursorMap => {
      const newCursors = new Map();
      for (const [userId, cursor] of cursorMap) {
        if (now - cursor.timestamp < CURSOR_TIMEOUT) {
          newCursors.set(userId, cursor);
        }
      }
      return newCursors;
    });
  }, 5000);
}

// Derived stores
export const onlineUserCount = derived(activeUsers, $activeUsers => $activeUsers.size);

export const typingUsers = derived(activeUsers, $activeUsers => {
  const typing = [];
  for (const [userId, user] of $activeUsers) {
    if (user.isTyping) {
      typing.push(user);
    }
  }
  return typing;
});

export const collaborationStatus = derived(
  [isConnected, currentRoom, onlineUserCount],
  ([$isConnected, $currentRoom, $onlineUserCount]) => ({
    connected: $isConnected,
    room: $currentRoom,
    userCount: $onlineUserCount,
    active: $isConnected && $currentRoom && $onlineUserCount > 0
  })
);

// Disconnect and cleanup
export function disconnectCollaboration() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  
  isConnected.set(false);
  activeUsers.set(new Map());
  cursors.set(new Map());
  selections.set(new Map());
  currentRoom.set(null);
  currentUser.set(null);
}

export default {
  initializeCollaboration,
  joinRoom,
  leaveRoom,
  updateCursor,
  updateSelection,
  sendDocumentUpdate,
  startTyping,
  stopTyping,
  disconnectCollaboration,
  isConnected,
  activeUsers,
  cursors,
  selections,
  currentRoom,
  onlineUserCount,
  typingUsers,
  collaborationStatus
};