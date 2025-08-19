import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { generalLimiter, authLimiter, uploadLimiter, strictLimiter, securityHeaders, sanitizeRequest, ipSecurity, securityLogger, csrfProtection } from './middleware/security.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

// Import routes
import authRoutes from './routes/auth.js';
import workspaceRoutes from './routes/workspaces.js';
import noteRoutes from './routes/notes.js';
import chatRoutes from './routes/chat.js';
import fileRoutes from './routes/files.js';
import adminRoutes from './routes/admin.js';
import auditRoutes from './routes/audit.js';
import secretsRoutes from './routes/secrets.js';
import integrationsRoutes from './routes/integrations.js';

// Import database initialization
import initDatabase from './utils/initDatabase.js';
import db from './config/database.js';
import { globalErrorHandler, DatabaseWrapper, asyncHandler } from './utils/errorHandler.js';
import logger, { requestLogger, auditLogger, SECURITY_EVENTS } from './utils/logger.js';
// Import Swagger documentation
import { specs, swaggerUi, swaggerOptions } from './swagger.js';

const __filename = fileURLToPath(import.meta.url);

// Load environment variables
dotenv.config();

// Validate critical environment variables
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required');
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET must be at least 32 characters long for security');
  process.exit(1);
}

console.log('✅ JWT_SECRET validation passed');
logger.info('Server starting', { nodeEnv: process.env.NODE_ENV, port: process.env.PORT || 3001 });

const app = express();
const server = createServer(app);
const dbWrapper = new DatabaseWrapper(db);

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

// Enhanced security middleware
app.use(securityHeaders);
app.use(ipSecurity);
app.use(securityLogger);
app.use(sanitizeRequest);

// Manual CORS handling for better debugging
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Log all CORS requests for debugging
  if (origin) {
    console.log(`CORS request from origin: ${origin}, method: ${req.method}, url: ${req.url}`);
  }
  
  // Set CORS headers for all requests
  if (origin && corsOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
    res.header('Access-Control-Expose-Headers', 'Authorization');
    res.header('Vary', 'Origin');
    
    // Add cache-busting headers for CORS requests
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '0');
  }
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`Preflight request handled for ${origin}`);
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use(requestLogger);

// CSRF Protection
app.use('/api/', csrfProtection);

// Enhanced rate limiting - different limits for different endpoints
app.use('/api/auth/', authLimiter); // Stricter limits for auth endpoints (must be before general)
app.use('/api/admin/', strictLimiter); // Very strict limits for admin endpoints
app.use('/api/files/upload', uploadLimiter); // Upload-specific limits
app.use('/api/', generalLimiter); // General API rate limiting

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
app.use('/api/audit', auditRoutes);
app.use('/api/secrets', secretsRoutes);
app.use('/api/integrations', integrationsRoutes);

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions));

// Public announcements endpoint
app.get('/api/announcements', asyncHandler(async (req, res) => {
  const query = `
    SELECT a.*, u.display_name as author_name, u.avatar as author_avatar
    FROM announcements a
    LEFT JOIN users u ON a.author_id = u.id
    WHERE a.is_active = TRUE AND (a.expires_at IS NULL OR a.expires_at > datetime('now'))
    ORDER BY a.created_at DESC
  `;

  const announcements = await dbWrapper.query(query);

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
}));

// Socket.IO authentication helper
const authenticateSocketToken = (token) => {
  return new Promise((resolve, reject) => {
    if (!token) {
      return reject(new Error('No token provided'));
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return reject(new Error('Invalid token'));
      }

      // Get fresh user data from database
      db.get('SELECT * FROM users WHERE id = ?', [decoded.id], (err, user) => {
        if (err || !user) {
          return reject(new Error('User not found'));
        }

        resolve({
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.display_name,
          avatar: user.avatar,
          role: user.role
        });
      });
    });
  });
};

// Socket.IO connection handling
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle user authentication for socket
  socket.on('authenticate', async (token) => {
    try {
      const user = await authenticateSocketToken(token);
      
      connectedUsers.set(socket.id, { userId: user.id, user, socket });
      
      socket.join('global-chat');
      socket.emit('authenticated', { success: true, user });
      
      // Update user online status
      db.run('UPDATE users SET is_online = TRUE WHERE id = ?', [user.id], (err) => {
        if (err) {
          console.error('Error updating user online status:', err);
        }
      });
      
      // Broadcast user online status
      socket.broadcast.emit('user-online', { userId: user.id });
      
      console.log(`User authenticated: ${user.username} (${user.id})`);
    } catch (error) {
      console.error('Socket authentication failed:', error.message);
      
      // Log socket authentication failure
      auditLogger.logSecurityEvent(SECURITY_EVENTS.LOGIN_FAILURE, {
        reason: 'Socket authentication failed',
        socketId: socket.id,
        ipAddress: socket.handshake.address,
        userAgent: socket.handshake.headers['user-agent'],
        error: error.message
      });
      
      socket.emit('authentication-error', { error: 'Authentication failed' });
      socket.disconnect();
    }
  });

  // Handle chat messages
  socket.on('send-message', (data) => {
    const userSession = connectedUsers.get(socket.id);
    if (!userSession || !userSession.user) {
      socket.emit('message-error', { error: 'Authentication required' });
      return;
    }
    
    const user = userSession.user;

    // Save message to database
    const messageId = Date.now().toString();
    db.run(`
      INSERT INTO chat_messages (id, content, author_id, channel_id)
      VALUES (?, ?, ?, ?)
    `, [messageId, data.content, user.id, data.channelId || null], (err) => {
      if (err) {
        socket.emit('message-error', { error: 'Failed to save message' });
        return;
      }

      // Get user info and broadcast message
      db.get('SELECT display_name, avatar, username FROM users WHERE id = ?', [user.id], (err, userInfo) => {
        if (err || !userInfo) return;

        const message = {
          id: messageId,
          content: data.content,
          authorId: user.id,
          author: {
            id: user.id,
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
    const userSession = connectedUsers.get(socket.id);
    if (!userSession || !userSession.user) {
      socket.emit('error', { error: 'Authentication required' });
      return;
    }

    // Broadcast note update to workspace members
    socket.to(`workspace-${data.workspaceId}`).emit('note-updated', {
      noteId: data.noteId,
      updates: data.updates,
      userId: userSession.user.id
    });
  });

  // Handle typing indicators
  socket.on('typing-start', (data) => {
    const userSession = connectedUsers.get(socket.id);
    if (!userSession || !userSession.user) return;

    socket.to('global-chat').emit('user-typing', {
      userId: userSession.user.id,
      channelId: data.channelId
    });
  });

  socket.on('typing-stop', (data) => {
    const userSession = connectedUsers.get(socket.id);
    if (!userSession || !userSession.user) return;

    socket.to('global-chat').emit('user-stopped-typing', {
      userId: userSession.user.id,
      channelId: data.channelId
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    const userSession = connectedUsers.get(socket.id);
    if (userSession && userSession.user) {
      // Update user offline status
      db.run('UPDATE users SET is_online = FALSE WHERE id = ?', [userSession.user.id], (err) => {
        if (err) {
          console.error('Error updating user offline status:', err);
        }
      });
      
      // Broadcast user offline status
      socket.broadcast.emit('user-offline', { userId: userSession.user.id });
      
      connectedUsers.delete(socket.id);
      console.log(`User disconnected: ${userSession.user.username} (${userSession.user.id})`);
    }
  });
});

// Global error handling middleware
app.use(globalErrorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: {
      message: 'Route not found',
      code: 'NOT_FOUND',
      statusCode: 404
    }
  });
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