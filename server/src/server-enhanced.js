import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cookieParser from 'cookie-parser';
import passport from 'passport';

// Security Middleware
import {
  generalLimiter,
  authLimiter,
  uploadLimiter,
  securityHeaders,
  sanitizeRequest,
  ipSecurity,
  securityLogger
} from './middleware/security.js';

import {
  sessionMiddleware,
  cleanupSessions,
  trackActivity,
  generateCSRFToken
} from './middleware/session.js';

// Services
import emailService from './services/email.js';
import storageService from './services/storage.js';
import twoFAService from './services/twofa.js';
import oauthService from './services/oauth.js';

// Import routes
import authRoutes from './routes/auth-enhanced.js';
import workspaceRoutes from './routes/workspaces.js';
import noteRoutes from './routes/notes.js';
import chatRoutes from './routes/chat.js';
import fileRoutes from './routes/files.js';
import adminRoutes from './routes/admin.js';

// Import database initialization
import initDatabase from './utils/initDatabase-postgres.js';
import db from './config/database-postgres.js';

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
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Trust proxy (important for rate limiting and IP detection)
app.set('trust proxy', 1);

// Security Headers
app.use(securityHeaders);

// IP Security and Logging
app.use(ipSecurity);
app.use(securityLogger);

// Request Sanitization
app.use(sanitizeRequest);

// Cookie Parser
app.use(cookieParser());

// Session Management
app.use(sessionMiddleware);

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// CORS
app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

// Body parsing with limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Activity tracking
app.use(trackActivity);

// CSRF token generation
app.use(generateCSRFToken);

// General rate limiting
app.use('/api/', generalLimiter);

// Serve static files securely
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '1d',
  etag: false,
  lastModified: false
}));

// Health check endpoint (no rate limiting)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: true, // You could add actual health checks here
      email: emailService.isConfigured,
      storage: storageService.type,
      oauth: oauthService.getEnabledProviders()
    }
  });
});

// API Routes with specific rate limiting
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/files', uploadLimiter, fileRoutes);
app.use('/api/admin', adminRoutes);

// Public announcements endpoint
app.get('/api/announcements', (req, res) => {
  const query = `
    SELECT a.*, u.display_name as author_name, u.avatar as author_avatar
    FROM announcements a
    LEFT JOIN users u ON a.author_id = u.id
    WHERE a.is_active = TRUE AND (a.expires_at IS NULL OR a.expires_at > CURRENT_TIMESTAMP)
    ORDER BY a.created_at DESC
  `;

  // Note: This query syntax works for both PostgreSQL and SQLite
  // You may need to adjust based on your database setup
  db.all ? 
    db.all(query, (err, announcements) => handleAnnouncementsQuery(err, announcements, res)) :
    db.query(query).then(result => handleAnnouncementsQuery(null, result.rows, res)).catch(err => handleAnnouncementsQuery(err, null, res));
});

function handleAnnouncementsQuery(err, announcements, res) {
  if (err) {
    console.error('Announcements query error:', err);
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
}

// Socket.IO connection handling with enhanced security
const connectedUsers = new Map();
const socketSessions = new Map();

io.use((socket, next) => {
  // Implement socket authentication here
  // You could verify JWT tokens or session cookies
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication required'));
  }

  // Verify token and attach user info to socket
  // This is a simplified example - implement proper JWT verification
  try {
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // socket.userId = decoded.userId;
    socket.userId = 'demo-user'; // Placeholder for demo
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id, 'User ID:', socket.userId);

  // Store connection
  connectedUsers.set(socket.id, { 
    userId: socket.userId, 
    socket,
    connectedAt: new Date().toISOString(),
    lastActivity: new Date().toISOString()
  });
  
  socket.join('global-chat');
  socket.emit('authenticated', { success: true });
  
  // Update user online status
  updateUserOnlineStatus(socket.userId, true);
  
  // Broadcast user online status
  socket.broadcast.emit('user-online', { userId: socket.userId });

  // Handle chat messages with rate limiting
  let messageCount = 0;
  let messageResetTime = Date.now() + 60000; // Reset every minute

  socket.on('send-message', (data) => {
    // Simple rate limiting for messages
    if (Date.now() > messageResetTime) {
      messageCount = 0;
      messageResetTime = Date.now() + 60000;
    }

    if (messageCount >= 10) { // Max 10 messages per minute
      socket.emit('rate-limited', { message: 'Too many messages. Please slow down.' });
      return;
    }

    messageCount++;

    const user = connectedUsers.get(socket.id);
    if (!user) return;

    // Update last activity
    user.lastActivity = new Date().toISOString();

    // Validate message content
    if (!data.content || data.content.trim().length === 0) {
      socket.emit('message-error', { error: 'Message cannot be empty' });
      return;
    }

    if (data.content.length > 1000) {
      socket.emit('message-error', { error: 'Message too long' });
      return;
    }

    // Save message to database
    const messageId = Date.now().toString();
    const saveMessageQuery = `
      INSERT INTO chat_messages (id, content, author_id, channel_id)
      VALUES (?, ?, ?, ?)
    `;

    const saveMessage = db.run ? 
      (query, params) => new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
          if (err) reject(err);
          else resolve();
        });
      }) :
      (query, params) => db.query(query, params);

    saveMessage(saveMessageQuery, [messageId, data.content, user.userId, data.channelId || null])
      .then(() => {
        // Get user info and broadcast message
        const getUserQuery = 'SELECT display_name, avatar, username FROM users WHERE id = ?';
        
        const getUser = db.get ?
          (query, params) => new Promise((resolve, reject) => {
            db.get(query, params, (err, row) => {
              if (err) reject(err);
              else resolve(row);
            });
          }) :
          (query, params) => db.query(query, params).then(result => result.rows[0]);

        return getUser(getUserQuery, [user.userId]);
      })
      .then((userInfo) => {
        if (!userInfo) return;

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
      })
      .catch((err) => {
        console.error('Message save error:', err);
        socket.emit('message-error', { error: 'Failed to save message' });
      });
  });

  // Handle workspace operations
  socket.on('join-workspace', (workspaceId) => {
    if (!workspaceId || typeof workspaceId !== 'string') return;
    
    socket.join(`workspace-${workspaceId}`);
    socket.emit('joined-workspace', { workspaceId });
  });

  socket.on('leave-workspace', (workspaceId) => {
    if (!workspaceId || typeof workspaceId !== 'string') return;
    
    socket.leave(`workspace-${workspaceId}`);
    socket.emit('left-workspace', { workspaceId });
  });

  // Handle note updates (real-time collaboration)
  socket.on('note-update', (data) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    if (!data.noteId || !data.workspaceId) return;

    // Update last activity
    user.lastActivity = new Date().toISOString();

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
      updateUserOnlineStatus(user.userId, false);
      
      // Broadcast user offline status
      socket.broadcast.emit('user-offline', { userId: user.userId });
      
      connectedUsers.delete(socket.id);
    }
  });
});

// Helper function for updating user online status
function updateUserOnlineStatus(userId, isOnline) {
  const query = 'UPDATE users SET is_online = ?, last_active = CURRENT_TIMESTAMP WHERE id = ?';
  
  if (db.run) {
    db.run(query, [isOnline, userId]);
  } else {
    db.query(query, [isOnline, userId]).catch(err => {
      console.error('Failed to update user online status:', err);
    });
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Express error:', err.stack);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Initialize database and start server
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Initialize database
    await initDatabase();
    console.log('✅ Database initialized successfully');

    // Test email service connection
    if (emailService.isConfigured) {
      const emailTest = await emailService.testConnection();
      console.log(`📧 Email service: ${emailTest ? 'Connected' : 'Connection failed'}`);
    }

    // Start server
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Enhanced NoteVault server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔌 Socket.IO enabled for real-time features`);
      console.log(`🔒 Security features enabled:`);
      console.log(`   • Rate limiting: ✅`);
      console.log(`   • CSRF protection: ✅`);
      console.log(`   • Session management: ✅`);
      console.log(`   • Security headers: ✅`);
      console.log(`   • Request sanitization: ✅`);
      console.log(`   • IP security logging: ✅`);
      console.log(`📨 Email service: ${emailService.isConfigured ? '✅' : '❌'}`);
      console.log(`☁️  Storage service: ${storageService.type}`);
      console.log(`🔐 OAuth providers: ${oauthService.getEnabledProviders().join(', ') || 'None'}`);
      console.log(`🗄️  Database: ${process.env.NODE_ENV === 'production' ? 'PostgreSQL' : 'SQLite'}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`${signal} received, shutting down gracefully`);
  
  server.close(async () => {
    console.log('HTTP server closed');
    
    // Close database connection
    if (db.close) {
      db.close();
    } else if (db.end) {
      await db.end();
    }
    
    // Cleanup sessions
    await cleanupSessions();
    
    console.log('Process terminated');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start the server
startServer();

export default app;