import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Import routes
import authRoutes from './routes/auth.js';
import workspaceRoutes from './routes/workspaces.js';
import noteRoutes from './routes/notes.js';
import chatRoutes from './routes/chat.js';
import fileRoutes from './routes/files.js';
import adminRoutes from './routes/admin.js';

// Import database initialization
import initDatabase from './utils/initDatabase.js';
import db from './config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);

// Configure CORS origins
const corsOrigins = process.env.CORS_ORIGIN ? 
  process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()) : 
  [
    'http://localhost:5173', 
    'http://localhost:50063', 
    'http://localhost:56770',
    'http://localhost:3000',
    'http://frontend:3000'
  ];

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

app.use(cors({
  origin: corsOrigins,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Temporarily disable rate limiter for debugging
// app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Duplicate health endpoint removed

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/admin', adminRoutes);

// Public announcements endpoint
app.get('/api/announcements', (req, res) => {
  const query = `
    SELECT a.*, u.display_name as author_name, u.avatar as author_avatar
    FROM announcements a
    LEFT JOIN users u ON a.author_id = u.id
    WHERE a.is_active = TRUE AND (a.expires_at IS NULL OR a.expires_at > datetime('now'))
    ORDER BY a.created_at DESC
  `;

  db.all(query, (err, announcements) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch announcements' });
    }

    res.json(announcements.map(announcement => ({
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      authorId: announcement.author_id,
      author: {
        id: announcement.author_id,
        displayName: announcement.author_name,
        avatar: announcement.author_avatar
      },
      priority: announcement.priority,
      createdAt: announcement.created_at,
      expiresAt: announcement.expires_at,
      isActive: announcement.is_active
    })));
  });
});

// Socket.IO connection handling
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle user authentication for socket
  socket.on('authenticate', (token) => {
    // In a real app, you'd verify the JWT token here
    // For now, we'll just store the socket connection
    const userId = 'demo-user'; // This should come from JWT verification
    connectedUsers.set(socket.id, { userId, socket });
    
    socket.join('global-chat');
    socket.emit('authenticated', { success: true });
    
    // Update user online status
    db.run('UPDATE users SET is_online = TRUE WHERE id = ?', [userId]);
    
    // Broadcast user online status
    socket.broadcast.emit('user-online', { userId });
  });

  // Handle chat messages
  socket.on('send-message', (data) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    // Save message to database
    const messageId = Date.now().toString();
    db.run(`
      INSERT INTO chat_messages (id, content, author_id, channel_id)
      VALUES (?, ?, ?, ?)
    `, [messageId, data.content, user.userId, data.channelId || null], (err) => {
      if (err) {
        socket.emit('message-error', { error: 'Failed to save message' });
        return;
      }

      // Get user info and broadcast message
      db.get('SELECT display_name, avatar, username FROM users WHERE id = ?', [user.userId], (err, userInfo) => {
        if (err || !userInfo) return;

        const message = {
          id: messageId,
          content: data.content,
          authorId: user.userId,
          author: {
            id: user.userId,
            displayName: userInfo.display_name,
            avatar: userInfo.avatar,
            username: userInfo.username
          },
          channelId: data.channelId || null,
          createdAt: new Date().toISOString(),
          reactions: []
        };

        // Broadcast to all users in the channel/global chat
        if (data.channelId) {
          socket.to(data.channelId).emit('new-message', message);
        } else {
          socket.to('global-chat').emit('new-message', message);
        }
        
        // Send back to sender for confirmation
        socket.emit('message-sent', message);
      });
    });
  });

  // Handle joining workspace channels
  socket.on('join-workspace', (workspaceId) => {
    socket.join(`workspace-${workspaceId}`);
    socket.emit('joined-workspace', { workspaceId });
  });

  // Handle leaving workspace channels
  socket.on('leave-workspace', (workspaceId) => {
    socket.leave(`workspace-${workspaceId}`);
    socket.emit('left-workspace', { workspaceId });
  });

  // Handle note updates (real-time collaboration)
  socket.on('note-update', (data) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    // Broadcast note update to workspace members
    socket.to(`workspace-${data.workspaceId}`).emit('note-updated', {
      noteId: data.noteId,
      updates: data.updates,
      userId: user.userId
    });
  });

  // Handle typing indicators
  socket.on('typing-start', (data) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    socket.to('global-chat').emit('user-typing', {
      userId: user.userId,
      channelId: data.channelId
    });
  });

  socket.on('typing-stop', (data) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    socket.to('global-chat').emit('user-stopped-typing', {
      userId: user.userId,
      channelId: data.channelId
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    const user = connectedUsers.get(socket.id);
    if (user) {
      // Update user offline status
      db.run('UPDATE users SET is_online = FALSE WHERE id = ?', [user.userId]);
      
      // Broadcast user offline status
      socket.broadcast.emit('user-offline', { userId: user.userId });
      
      connectedUsers.delete(socket.id);
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize database and start server
const PORT = process.env.PORT || 3001;

initDatabase()
  .then(() => {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔌 Socket.IO enabled for real-time features`);
      console.log(`🗄️  Database initialized successfully`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    db.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    db.close();
    process.exit(0);
  });
});

export default app;