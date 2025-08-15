# Architecture Overview

NoteVault is built with a modern, scalable architecture designed for real-time collaboration, high performance, and maintainability. This document provides a comprehensive overview of the system architecture, technology stack, and design decisions.

## 🏗️ System Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Apps   │    │   Load Balancer │    │   CDN/Static    │
│                 │    │    (nginx)      │    │     Assets      │
│ • Web Browser   │◄──►│                 │◄──►│                 │
│ • Mobile PWA    │    │ • SSL Term.     │    │ • Images        │
│ • Desktop App   │    │ • Rate Limiting │    │ • Scripts       │
└─────────────────┘    └─────────────────┘    │ • Stylesheets   │
                                              └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│  Frontend App   │    │  Backend API    │
│                 │    │                 │
│ • SvelteKit     │◄──►│ • Node.js       │
│ • TypeScript    │    │ • Express.js    │
│ • Tailwind CSS │    │ • Socket.IO     │
│ • Vite          │    │ • TypeScript    │
└─────────────────┘    └─────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
                ▼               ▼               ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │    Database     │ │      Redis      │ │  File Storage   │
    │                 │ │                 │ │                 │
    │ • PostgreSQL    │ │ • Sessions      │ │ • Local/S3      │
    │ • SQLite (dev)  │ │ • Caching       │ │ • File Uploads  │
    │ • Migrations    │ │ • Pub/Sub       │ │ • Media Assets  │
    └─────────────────┘ └─────────────────┘ └─────────────────┘
```

### Technology Stack

#### Frontend
- **Framework**: SvelteKit 2.0
- **Language**: TypeScript 5.0
- **Styling**: Tailwind CSS 3.4
- **Build Tool**: Vite 5.0
- **State Management**: Svelte Stores
- **Real-time**: Socket.IO Client
- **Testing**: Vitest + Testing Library
- **Icons**: Lucide Icons

#### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript 5.0
- **Real-time**: Socket.IO Server
- **Database ORM**: Prisma (or similar)
- **Authentication**: JWT + Sessions
- **File Upload**: Multer
- **Validation**: Zod

#### Database & Storage
- **Primary DB**: PostgreSQL 15+ (production)
- **Dev DB**: SQLite 3
- **Caching**: Redis 7+
- **File Storage**: Local filesystem / AWS S3
- **Search**: PostgreSQL Full-Text Search

#### Infrastructure
- **Reverse Proxy**: nginx
- **Process Manager**: PM2
- **SSL**: Let's Encrypt
- **Monitoring**: Custom metrics + logs
- **Deployment**: Docker / Docker Compose

## 🎨 Frontend Architecture

### SvelteKit Application Structure

```
src/
├── app.html                 # HTML template
├── app.d.ts                # Type definitions
├── hooks.client.ts         # Client-side hooks
├── hooks.server.ts         # Server-side hooks
├── routes/                 # File-based routing
│   ├── +layout.svelte     # Root layout
│   ├── +layout.ts         # Layout data loading
│   ├── +page.svelte       # Homepage
│   ├── login/             # Authentication routes
│   ├── workspaces/        # Workspace routes
│   │   └── [id]/          # Dynamic workspace pages
│   ├── files/             # File management
│   ├── search/            # Search functionality
│   ├── chat/              # Chat interface
│   ├── calendar/          # Calendar integration
│   ├── admin/             # Admin dashboard
│   └── api/               # API endpoints
├── lib/                   # Shared libraries
│   ├── components/        # Reusable components
│   ├── stores/            # State management
│   ├── utils/             # Utility functions
│   ├── types/             # TypeScript definitions
│   └── api.ts             # API client
└── static/                # Static assets
```

### Component Architecture

#### Atomic Design Principles

```
Atoms (Basic building blocks):
├── Button.svelte
├── Input.svelte
├── Icon.svelte
├── Avatar.svelte
└── LoadingSpinner.svelte

Molecules (Simple component combinations):
├── SearchBox.svelte
├── UserCard.svelte
├── FilePreview.svelte
├── NotificationItem.svelte
└── TagInput.svelte

Organisms (Complex component sections):
├── Sidebar.svelte
├── WorkspaceCanvas.svelte
├── ChatPanel.svelte
├── FileManager.svelte
└── CommandPalette.svelte

Templates (Page layouts):
├── DashboardLayout.svelte
├── WorkspaceLayout.svelte
├── AdminLayout.svelte
└── AuthLayout.svelte

Pages (Complete pages):
├── Dashboard.svelte
├── WorkspacePage.svelte
├── FilesPage.svelte
└── SettingsPage.svelte
```

### State Management

#### Svelte Stores Architecture

```typescript
// Store Types
interface Store<T> {
  subscribe: (run: (value: T) => void) => () => void;
  set: (value: T) => void;
  update: (updater: (value: T) => T) => void;
}

// Core Stores
stores/
├── auth.ts              # Authentication state
├── workspaces.ts        # Workspace data
├── notifications.ts     # Notification system
├── chat.ts              # Chat messages
├── collaboration.ts     # Real-time collaboration
├── files.ts             # File management
├── search.ts            # Search state
├── ui.ts                # UI state (modals, sidebar)
└── toast.ts             # Toast notifications
```

#### Store Patterns

```typescript
// Readable Store (read-only data)
export const currentUser = readable<User | null>(null, (set) => {
  // Initialize and update logic
});

// Writable Store (mutable state)
export const sidebarOpen = writable<boolean>(false);

// Derived Store (computed from other stores)
export const unreadNotifications = derived(
  notifications,
  ($notifications) => $notifications.filter(n => !n.read)
);

// Custom Store (with business logic)
export const createWorkspaceStore = () => {
  const { subscribe, set, update } = writable<Workspace[]>([]);
  
  return {
    subscribe,
    add: (workspace: Workspace) => update(ws => [...ws, workspace]),
    remove: (id: string) => update(ws => ws.filter(w => w.id !== id)),
    load: async () => {
      const workspaces = await api.getWorkspaces();
      set(workspaces);
    }
  };
};
```

### Real-time Architecture

#### Socket.IO Integration

```typescript
// Client-side Socket Manager
class SocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(token: string) {
    this.socket = io('ws://localhost:3001', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    this.setupReconnectionLogic();
  }

  private setupEventHandlers() {
    this.socket?.on('notification', (data) => {
      notificationStore.add(data);
    });

    this.socket?.on('workspace:update', (data) => {
      workspaceStore.update(data);
    });

    this.socket?.on('collaboration:cursor', (data) => {
      collaborationStore.updateCursor(data);
    });
  }

  joinWorkspace(workspaceId: string) {
    this.socket?.emit('workspace:join', { workspaceId });
  }

  sendMessage(message: ChatMessage) {
    this.socket?.emit('chat:message', message);
  }
}
```

#### Collaboration System

```typescript
// Real-time Collaboration
interface CollaborationState {
  users: CollaboratingUser[];
  cursors: UserCursor[];
  selections: UserSelection[];
  activeDocument: string | null;
}

// Operational Transformation for concurrent editing
class OperationalTransform {
  transform(op1: Operation, op2: Operation): [Operation, Operation] {
    // Transform operations for concurrent editing
    // Ensures consistency when multiple users edit simultaneously
  }
}

// Live Cursor Tracking
interface UserCursor {
  userId: string;
  userName: string;
  color: string;
  position: { x: number; y: number };
  timestamp: number;
}
```

## 🔧 Backend Architecture

### Express.js Server Structure

```
server/
├── src/
│   ├── app.ts              # Express app setup
│   ├── server.ts           # Server entry point
│   ├── routes/             # API routes
│   │   ├── auth.ts         # Authentication endpoints
│   │   ├── workspaces.ts   # Workspace CRUD
│   │   ├── notes.ts        # Note management
│   │   ├── files.ts        # File operations
│   │   ├── chat.ts         # Chat API
│   │   └── admin.ts        # Admin endpoints
│   ├── middleware/         # Express middleware
│   │   ├── auth.ts         # JWT verification
│   │   ├── cors.ts         # CORS configuration
│   │   ├── rateLimit.ts    # Rate limiting
│   │   ├── validation.ts   # Input validation
│   │   └── errorHandler.ts # Error handling
│   ├── services/           # Business logic
│   │   ├── AuthService.ts  # Authentication logic
│   │   ├── WorkspaceService.ts
│   │   ├── NotificationService.ts
│   │   └── FileService.ts
│   ├── models/             # Data models
│   ├── utils/              # Utility functions
│   └── types/              # TypeScript definitions
├── prisma/                 # Database schema
├── uploads/                # File storage
└── logs/                   # Application logs
```

### API Design

#### RESTful API Endpoints

```typescript
// Authentication
POST   /api/auth/register    # User registration
POST   /api/auth/login       # User login
POST   /api/auth/logout      # User logout
POST   /api/auth/refresh     # Token refresh
GET    /api/auth/me          # Current user info

// Workspaces
GET    /api/workspaces       # List user workspaces
POST   /api/workspaces       # Create workspace
GET    /api/workspaces/:id   # Get workspace details
PUT    /api/workspaces/:id   # Update workspace
DELETE /api/workspaces/:id   # Delete workspace

// Members
GET    /api/workspaces/:id/members     # List members
POST   /api/workspaces/:id/members     # Add member
PUT    /api/workspaces/:id/members/:userId  # Update member role
DELETE /api/workspaces/:id/members/:userId  # Remove member

// Notes
GET    /api/workspaces/:id/notes       # List notes
POST   /api/workspaces/:id/notes       # Create note
GET    /api/notes/:id                  # Get note
PUT    /api/notes/:id                  # Update note
DELETE /api/notes/:id                  # Delete note

// Files
GET    /api/files                      # List files
POST   /api/files/upload               # Upload file
GET    /api/files/:id                  # Download file
DELETE /api/files/:id                  # Delete file

// Search
GET    /api/search?q=query&type=notes  # Search content
POST   /api/search/saved               # Save search
GET    /api/search/saved               # List saved searches

// Notifications
GET    /api/notifications              # List notifications
PUT    /api/notifications/:id/read     # Mark as read
DELETE /api/notifications/:id          # Delete notification
```

#### Error Response Format

```typescript
interface APIError {
  error: {
    code: string;           // Machine-readable error code
    message: string;        // Human-readable message
    details?: any;          // Additional error details
    timestamp: string;      // ISO timestamp
    requestId: string;      // Unique request identifier
  }
}

// Example responses
{
  "error": {
    "code": "WORKSPACE_NOT_FOUND",
    "message": "The requested workspace could not be found",
    "details": { "workspaceId": "123" },
    "timestamp": "2025-08-15T21:00:00.000Z",
    "requestId": "req_abc123"
  }
}
```

### Database Architecture

#### Schema Design

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  avatar_url VARCHAR(500),
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workspaces table
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(7),
  privacy VARCHAR(20) DEFAULT 'private',
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workspace members
CREATE TABLE workspace_members (
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (workspace_id, user_id)
);

-- Notes table
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,
  position_x FLOAT DEFAULT 0,
  position_y FLOAT DEFAULT 0,
  tags TEXT[], -- PostgreSQL array
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- File storage
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT NOT NULL,
  upload_path VARCHAR(500) NOT NULL,
  uploader_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Real-time sessions
CREATE TABLE active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  socket_id VARCHAR(100) NOT NULL,
  cursor_x FLOAT,
  cursor_y FLOAT,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Indexing Strategy

```sql
-- Performance indexes
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_notes_workspace ON notes(workspace_id);
CREATE INDEX idx_notes_author ON notes(author_id);
CREATE INDEX idx_notes_updated ON notes(updated_at DESC);
CREATE INDEX idx_files_workspace ON files(workspace_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read = false;

-- Full-text search indexes
CREATE INDEX idx_notes_search ON notes USING gin(to_tsvector('english', title || ' ' || content));
CREATE INDEX idx_files_search ON files USING gin(to_tsvector('english', original_name));
```

### Security Architecture

#### Authentication Flow

```typescript
// JWT Token Structure
interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  workspaces: string[];
  iat: number;        // Issued at
  exp: number;        // Expiration
  iss: string;        // Issuer
}

// Authentication Middleware
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err, payload) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = payload as JWTPayload;
    next();
  });
};
```

#### Authorization System

```typescript
// Role-based Access Control
enum WorkspaceRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer'
}

const permissions = {
  [WorkspaceRole.OWNER]: ['*'],
  [WorkspaceRole.ADMIN]: [
    'workspace:read', 'workspace:update', 'workspace:delete',
    'members:invite', 'members:remove', 'members:update',
    'notes:create', 'notes:read', 'notes:update', 'notes:delete',
    'files:upload', 'files:read', 'files:delete'
  ],
  [WorkspaceRole.MEMBER]: [
    'workspace:read',
    'notes:create', 'notes:read', 'notes:update', 'notes:delete:own',
    'files:upload', 'files:read', 'files:delete:own'
  ],
  [WorkspaceRole.VIEWER]: [
    'workspace:read', 'notes:read', 'files:read'
  ]
};

// Permission checking middleware
const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userRole = await getUserWorkspaceRole(req.user.userId, req.params.workspaceId);
    
    if (hasPermission(userRole, permission)) {
      next();
    } else {
      res.status(403).json({ error: 'Insufficient permissions' });
    }
  };
};
```

## 📡 Real-time System

### Socket.IO Architecture

#### Connection Management

```typescript
// Server-side Socket Handler
class SocketHandler {
  private io: SocketIOServer;
  private userSockets: Map<string, string> = new Map();

  constructor(server: Server) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL,
        methods: ['GET', 'POST']
      }
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        const payload = jwt.verify(token, process.env.JWT_SECRET!);
        socket.userId = payload.userId;
        next();
      } catch (err) {
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      this.handleUserConnection(socket);
      this.handleWorkspaceEvents(socket);
      this.handleCollaborationEvents(socket);
      this.handleChatEvents(socket);
      this.handleDisconnection(socket);
    });
  }

  private handleWorkspaceEvents(socket: Socket) {
    socket.on('workspace:join', ({ workspaceId }) => {
      socket.join(`workspace:${workspaceId}`);
      this.broadcastUserPresence(socket, workspaceId, 'joined');
    });

    socket.on('workspace:leave', ({ workspaceId }) => {
      socket.leave(`workspace:${workspaceId}`);
      this.broadcastUserPresence(socket, workspaceId, 'left');
    });
  }

  private handleCollaborationEvents(socket: Socket) {
    socket.on('collaboration:cursor', (data) => {
      socket.to(`workspace:${data.workspaceId}`).emit('collaboration:cursor', {
        userId: socket.userId,
        ...data
      });
    });

    socket.on('collaboration:edit', (data) => {
      // Apply operational transformation
      const transformedOperation = this.transformOperation(data);
      
      // Broadcast to other users
      socket.to(`workspace:${data.workspaceId}`).emit('collaboration:edit', {
        userId: socket.userId,
        operation: transformedOperation
      });
    });
  }
}
```

#### Presence System

```typescript
// User Presence Tracking
interface UserPresence {
  userId: string;
  workspaceId: string;
  status: 'online' | 'away' | 'busy';
  lastSeen: Date;
  cursor?: { x: number; y: number };
}

class PresenceManager {
  private presence: Map<string, UserPresence> = new Map();

  updatePresence(userId: string, workspaceId: string, data: Partial<UserPresence>) {
    const key = `${userId}:${workspaceId}`;
    const current = this.presence.get(key) || {
      userId,
      workspaceId,
      status: 'online',
      lastSeen: new Date()
    };

    this.presence.set(key, { ...current, ...data, lastSeen: new Date() });
    
    // Broadcast presence update
    this.broadcastPresenceUpdate(workspaceId, this.getWorkspacePresence(workspaceId));
  }

  getWorkspacePresence(workspaceId: string): UserPresence[] {
    return Array.from(this.presence.values())
      .filter(p => p.workspaceId === workspaceId && p.status === 'online');
  }

  removePresence(userId: string, workspaceId: string) {
    this.presence.delete(`${userId}:${workspaceId}`);
  }
}
```

## 🚀 Performance Architecture

### Frontend Optimization

#### Bundle Optimization

```typescript
// Vite Configuration for Performance
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunking for better caching
          'vendor-svelte': ['svelte'],
          'vendor-lucide': ['lucide-svelte'],
          'vendor-socket': ['socket.io-client']
        }
      }
    },
    minify: 'esbuild',
    sourcemap: false, // Disabled for production
    target: 'es2020'
  },
  optimizeDeps: {
    include: ['socket.io-client', 'lucide-svelte']
  }
});

// Achieved Results:
// - 57% bundle size reduction
// - Largest chunk: 54KB gzipped
// - Vendor chunks: Lucide (41KB), Svelte (87KB)
```

#### Lazy Loading Strategy

```typescript
// Component Lazy Loading
const LazyCalendar = lazy(() => import('./Calendar.svelte'));
const LazyAdminDashboard = lazy(() => import('./AdminDashboard.svelte'));

// Image Lazy Loading Component
export class LazyImage extends SvelteComponent {
  private observer: IntersectionObserver;
  
  onMount() {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.loadImage();
          this.observer.disconnect();
        }
      });
    });
    
    this.observer.observe(this.imageElement);
  }
}

// Route-based Code Splitting
const routes = {
  '/': () => import('./routes/+page.svelte'),
  '/workspaces/[id]': () => import('./routes/workspaces/[id]/+page.svelte'),
  '/admin': () => import('./routes/admin/+page.svelte')
};
```

#### Performance Monitoring

```typescript
// Core Web Vitals Tracking
class PerformanceMonitor {
  trackCoreWebVitals() {
    // Largest Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lcp = entries[entries.length - 1];
      this.reportMetric('LCP', lcp.startTime);
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        this.reportMetric('FID', entry.processingStart - entry.startTime);
      });
    }).observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift
    let cumulativeLayoutShift = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          cumulativeLayoutShift += entry.value;
        }
      }
      this.reportMetric('CLS', cumulativeLayoutShift);
    }).observe({ entryTypes: ['layout-shift'] });
  }

  // Custom Performance Metrics
  measureUserInteraction(action: string, startTime: number) {
    const duration = performance.now() - startTime;
    this.reportMetric(`user-interaction-${action}`, duration);
  }
}
```

### Backend Optimization

#### Database Performance

```typescript
// Query Optimization
class QueryOptimizer {
  // Efficient workspace loading with joins
  async getWorkspaceWithData(workspaceId: string) {
    return db.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          include: { user: true }
        },
        notes: {
          orderBy: { updatedAt: 'desc' },
          take: 50 // Pagination
        },
        files: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });
  }

  // Bulk operations for better performance
  async bulkUpdateNotes(updates: NoteUpdate[]) {
    const transaction = await db.$transaction(
      updates.map(update => 
        db.note.update({
          where: { id: update.id },
          data: update.data
        })
      )
    );
    return transaction;
  }
}

// Connection Pooling
const dbConfig = {
  pool: {
    min: 2,
    max: 20,
    idle: 10000,
    acquire: 30000
  }
};
```

#### Caching Strategy

```typescript
// Redis Caching Layer
class CacheManager {
  private redis: Redis;

  async get<T>(key: string): Promise<T | null> {
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async set(key: string, value: any, ttl: number = 3600) {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  // Workspace caching with invalidation
  async getCachedWorkspace(workspaceId: string) {
    const cacheKey = `workspace:${workspaceId}`;
    let workspace = await this.get(cacheKey);
    
    if (!workspace) {
      workspace = await this.fetchWorkspaceFromDB(workspaceId);
      await this.set(cacheKey, workspace, 1800); // 30 minutes
    }
    
    return workspace;
  }

  async invalidateWorkspace(workspaceId: string) {
    await this.redis.del(`workspace:${workspaceId}`);
  }
}
```

## 🔧 Deployment Architecture

### Docker Configuration

```dockerfile
# Multi-stage build for optimization
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Production image
FROM node:20-alpine AS production

WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3001
USER node

CMD ["node", "build/index.js"]
```

### Production Deployment

```yaml
# docker-compose.yml for production
version: '3.8'

services:
  app:
    build: .
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
    ports:
      - "3001:3001"
    depends_on:
      - db
      - redis
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app

  db:
    image: postgres:15
    restart: unless-stopped
    environment:
      - POSTGRES_DB=${DB_NAME}
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

volumes:
  postgres_data:
  redis_data:
```

## 📊 Monitoring & Observability

### Application Monitoring

```typescript
// Custom Metrics Collection
class MetricsCollector {
  private metrics: Map<string, number> = new Map();

  recordCounter(name: string, value: number = 1) {
    this.metrics.set(name, (this.metrics.get(name) || 0) + value);
  }

  recordGauge(name: string, value: number) {
    this.metrics.set(name, value);
  }

  recordHistogram(name: string, value: number) {
    // Store histogram buckets for response time tracking
    const buckets = [50, 100, 250, 500, 1000, 2500, 5000];
    buckets.forEach(bucket => {
      if (value <= bucket) {
        this.recordCounter(`${name}_bucket_${bucket}`);
      }
    });
  }

  getMetrics() {
    return Object.fromEntries(this.metrics);
  }
}

// Health Check Endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version
  };

  res.json(health);
});
```

---

## 🔗 Related Documentation

- **[Database Schema](./database.md)** - Detailed database design
- **[Real-time Features](./realtime.md)** - WebSocket and collaboration
- **[Security](../security/README.md)** - Security implementation
- **[Performance](../performance/README.md)** - Performance optimization
- **[API Reference](../api/README.md)** - Complete API documentation

---

*Last Updated: August 15, 2025*  
*Architecture Version: 1.0.0*