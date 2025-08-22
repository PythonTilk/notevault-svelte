# NoteVault - Enterprise Collaborative Workspace

Production-ready collaborative workspace platform with 24 enterprise features, built with SvelteKit and modern web technologies.

## ✨ Key Features

- 🔐 **Enterprise Security**: Multi-factor auth, OAuth (Google/GitHub/Discord), audit logging, GDPR compliance
- 🤝 **Real-time Collaboration**: Live editing with cursors, presence indicators, collaborative text editing
- 🎨 **Rich UI/UX**: 6 themes, 4 layouts, 50+ shortcuts, 12 languages, accessibility (WCAG 2.1 AA)
- 🔌 **Integrations**: Slack/Discord bots, Calendar sync (Google/Outlook), Cloud storage, Git repos, Webhooks
- 📊 **Analytics**: Interactive dashboards with charts, performance monitoring, user insights
- 🚀 **DevOps**: Docker orchestration, CI/CD pipeline, PostgreSQL/Redis, Prometheus monitoring

## 🚀 Quick Start

### Option 1: One-Line Start (Recommended)

```bash
git clone https://github.com/PythonTilk/notevault-svelte.git
cd notevault-svelte
./start.sh
```

**Access**: http://localhost:3000 • **Admin**: admin@notevault.com / admin123 • **Monitoring**: http://localhost:3002

### Option 2: Manual Setup

#### Prerequisites
- **Node.js** 18+ and npm
- **Docker** and Docker Compose
- **Git**

#### 1. Clone and Install
```bash
git clone https://github.com/PythonTilk/notevault-svelte.git
cd notevault-svelte
npm install
```

#### 2. Start Backend Services
```bash
# Start Redis and backend services
docker-compose -f docker-compose.dev.yml up -d
```

#### 3. Start Frontend Development Server
```bash
# In a new terminal
npm run dev
```

#### 4. Access the Application
- **Frontend**: http://localhost:5173 (Vite dev server)
- **Backend API**: http://localhost:3001
- **Redis**: localhost:6379

### Option 3: Full Docker Setup

```bash
# Production-like environment
docker-compose up -d

# Development with hot reload
docker-compose -f docker-compose.dev.yml up -d
npm run dev  # Frontend runs on host for hot reload
```

## 📊 Monitoring Stack

The application includes a complete monitoring solution:

- **Prometheus** (http://localhost:9090) - Metrics collection
- **Grafana** (http://localhost:3002) - Dashboards and visualization  
- **Node Exporter** (http://localhost:9100) - System metrics
- **cAdvisor** (http://localhost:8080) - Container metrics

### Grafana Dashboards

- **NoteVault Overview**: HTTP requests, response times, CPU/memory usage, uptime
- **Default Login**: admin / admin123

## 🛠️ Tech Stack

**Frontend**: SvelteKit, TypeScript, Tailwind CSS  
**Backend**: Node.js, Express, PostgreSQL/SQLite  
**Real-time**: Socket.IO, Redis  
**Monitoring**: Prometheus, Grafana, Node Exporter, cAdvisor
**DevOps**: Docker, GitHub Actions

## 📋 All Features Complete (24/24)

### 🔐 Security & Authentication
✅ Multi-factor authentication (TOTP)  
✅ OAuth providers (Google, GitHub, Discord)  
✅ JWT-based session management  
✅ Rate limiting and audit logging  

### 🤝 Real-time Collaboration  
✅ Live cursor tracking and user presence  
✅ Collaborative text editing with Socket.IO  
✅ Real-time document synchronization  
✅ Typing indicators and user avatars  

### 📊 Analytics & Monitoring
✅ Interactive charts (Line, Bar, Donut)  
✅ Admin analytics dashboard  
✅ Performance monitoring with Prometheus  
✅ System health alerts and metrics  

### 🔌 Integrations & Automation
✅ Slack/Discord bot management  
✅ Calendar sync (Google Calendar, Outlook)  
✅ Webhook configuration (18+ event types)  
✅ Cloud storage integration  

### 🎨 UI/UX & Accessibility
✅ 6 themes with dark/light modes  
✅ 4 responsive layouts  
✅ Multi-language support (12 languages)  
✅ WCAG 2.1 AA accessibility compliance  

### 🚀 DevOps & Infrastructure
✅ Docker orchestration  
✅ CI/CD pipeline with GitHub Actions  
✅ Database backup and restoration  
✅ GDPR compliance tools

## 💻 Local Development

### Environment Setup

1. **Clone and Install Dependencies**
   ```bash
   git clone https://github.com/PythonTilk/notevault-svelte.git
   cd notevault-svelte
   npm install
   cd server && npm install && cd ..
   ```

2. **Configure Environment Variables**
   ```bash
   # Copy environment templates
   cp .env.example .env.local
   cp server/.env.example server/.env.local
   
   # Edit with your local settings
   # Key variables: JWT_SECRET, DATABASE_URL, REDIS_URL
   ```

3. **Start Development Services**
   ```bash
   # Start Redis and backend services
   docker-compose -f docker-compose.dev.yml up -d
   
   # Start frontend dev server (new terminal)
   npm run dev
   
   # Start backend dev server (new terminal)
   cd server && npm run dev
   ```

### Development URLs
- **Frontend**: http://localhost:5173 (Vite dev server with HMR)
- **Backend API**: http://localhost:3001 (Express server with nodemon)
- **API Documentation**: http://localhost:3001/api-docs (Swagger UI)
- **Redis**: localhost:6379

### Real-time Features Testing
The collaboration features require WebSocket connections:
- Open multiple browser tabs to test live cursors and presence
- Use different user accounts to see collaborative editing
- Check the browser console for WebSocket connection status

### Available Scripts
```bash
# Frontend
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run test         # Run Vitest unit tests
npm run test:e2e     # Run Playwright E2E tests

# Backend
cd server
npm run dev          # Start with nodemon (auto-reload)
npm run start        # Start production server
npm run test         # Run backend tests
npm run migrate      # Run database migrations
```

### Database Management
```bash
# Reset database (development)
rm server/database/notevault.db
cd server && npm run migrate

# View database
sqlite3 server/database/notevault.db
.tables
.schema
```

## ⚙️ Advanced Usage

### Full Production with All Services
```bash
# Start with monitoring + logging + backups
docker-compose -f docker-compose.production.yml --profile monitoring --profile logging --profile backup up -d
```

### Load Testing
```bash
npm run test:load
```

### End-to-End Testing
```bash
npm install @playwright/test
npm run test:e2e
```

### Manual Docker Commands
```bash
# Basic stack
docker-compose -f docker-compose.production.yml up -d

# With monitoring
docker-compose -f docker-compose.production.yml --profile monitoring up -d

# Stop all services
docker-compose -f docker-compose.production.yml down
```

## 📊 Performance Benchmarks

- **API Response Times**: < 100ms (P95 < 500ms)
- **Load Testing**: Handles 100+ concurrent requests
- **Authentication**: ~3s (BCrypt security)
- **Rate Limiting**: 100 requests/15min (configurable)
- **File Upload**: 10MB limit, multiple formats

## 🔧 Configuration

Copy configuration template:
```bash
cp .env.production .env.production.local
# Edit with your production values
```

Key environment variables:
- `JWT_SECRET` - JWT signing key
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `SMTP_*` - Email configuration
- `GRAFANA_PASSWORD` - Grafana admin password

## 🚀 Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive production deployment guide.

```bash
# Production deployment with zero downtime
ZERO_DOWNTIME=true ./deploy.sh production
```

## 📄 License

MIT License - Built with ❤️ using SvelteKit and modern web technologies.