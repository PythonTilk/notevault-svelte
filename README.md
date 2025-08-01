# NoteVault - Enterprise Collaborative Workspace

Production-ready collaborative workspace platform with 24 enterprise features, built with SvelteKit and modern web technologies.

## ✨ Key Features

- 🔐 **Enterprise Security**: Multi-factor auth, OAuth (Google/GitHub/Discord), audit logging, GDPR compliance
- 🤝 **Real-time Collaboration**: Live editing, canvas notes, instant chat, WebSocket architecture
- 🎨 **Rich UI/UX**: 6 themes, 4 layouts, 50+ shortcuts, 12 languages, accessibility (WCAG 2.1 AA)
- 🔌 **Integrations**: Slack/Discord bots, Calendar sync, Cloud storage, Git repos, Webhooks (17+ events)
- 📊 **Analytics**: Admin dashboard, performance monitoring, user insights, system health alerts
- 🚀 **DevOps**: Docker orchestration, CI/CD pipeline, PostgreSQL/Redis, Prometheus monitoring

## 🚀 One-Line Quick Start

```bash
git clone https://github.com/PythonTilk/notevault-svelte.git
cd notevault-svelte
./start.sh
```

**Access**: http://localhost:3000 • **Admin**: admin@notevault.com / admin123 • **Monitoring**: http://localhost:3002

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

✅ Analytics & monitoring • ✅ Security & authentication • ✅ Real-time collaboration  
✅ Multi-language & accessibility • ✅ Themes & layouts • ✅ Integrations (Slack, Discord, Calendar, Git)  
✅ Webhooks & automation • ✅ Docker & CI/CD • ✅ API documentation • ✅ GDPR compliance

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