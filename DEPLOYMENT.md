# NoteVault Production Deployment Guide

This guide covers the complete deployment process for NoteVault in production environments.

## 🚀 Quick Deployment

```bash
# 1. Clone the repository
git clone https://github.com/your-org/notevault-svelte.git
cd notevault-svelte

# 2. Configure environment
cp .env.production .env.production.local
# Edit .env.production.local with your production values

# 3. Deploy
./deploy.sh production
```

## 📋 Prerequisites

### System Requirements
- **Docker** >= 20.10.0
- **Docker Compose** >= 2.0.0
- **Node.js** >= 18.0.0
- **RAM** >= 4GB (recommended 8GB+)
- **Storage** >= 20GB (SSD recommended)
- **CPU** >= 2 cores (recommended 4+ cores)

### Network Requirements
- Ports 80, 443 (HTTP/HTTPS)
- Port 22 (SSH)
- Outbound internet access for dependencies

### SSL Certificate
```bash
# Generate self-signed certificate for development
mkdir -p ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/private.key -out ssl/certificate.crt

# For production, use Let's Encrypt or your certificate provider
```

## 🔧 Configuration

### Environment Variables

Copy and customize the production environment file:

```bash
cp .env.production .env.production.local
```

**Critical Variables to Set:**

```bash
# Security (REQUIRED)
JWT_SECRET=your-super-secret-jwt-key-minimum-256-bits
SESSION_SECRET=another-super-secret-key-for-sessions
DB_PASSWORD=secure_database_password
REDIS_PASSWORD=secure_redis_password

# Domain Configuration
FRONTEND_URL=https://your-domain.com
BACKEND_URL=https://api.your-domain.com
CORS_ORIGIN=https://your-domain.com,https://www.your-domain.com

# Database
DATABASE_URL=postgresql://notevault:${DB_PASSWORD}@db:5432/notevault

# Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@your-domain.com
```

### Optional Integrations

```bash
# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Cloud Storage (AWS S3)
STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=notevault-files

# Slack Integration
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_SIGNING_SECRET=your-slack-signing-secret

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

## 🏗️ Deployment Options

### 1. Standard Deployment

```bash
# Deploy with brief downtime
./deploy.sh production
```

### 2. Zero Downtime Deployment

```bash
# Deploy without service interruption
ZERO_DOWNTIME=true ./deploy.sh production
```

### 3. Custom Deployment

```bash
# Skip tests and backups for faster deployment
RUN_TESTS=false BACKUP_BEFORE_DEPLOY=false ./deploy.sh production
```

### 4. Staging Deployment

```bash
# Deploy to staging environment
./deploy.sh staging
```

## 🐳 Docker Compose Profiles

The production setup includes optional services via profiles:

```bash
# Full production with monitoring
docker-compose -f docker-compose.production.yml --profile monitoring up -d

# With logging stack (ELK)
docker-compose -f docker-compose.production.yml --profile logging up -d

# With automated backups
docker-compose -f docker-compose.production.yml --profile backup up -d

# All services
docker-compose -f docker-compose.production.yml --profile monitoring --profile logging --profile backup up -d
```

## 🔍 Health Checks

The deployment script includes comprehensive health checks:

- Database connectivity (PostgreSQL)
- Cache service (Redis)
- Backend API endpoints
- Frontend application
- SSL certificate validation

### Manual Health Check

```bash
# Check all services
docker-compose -f docker-compose.production.yml ps

# Check specific service logs
docker-compose -f docker-compose.production.yml logs backend
docker-compose -f docker-compose.production.yml logs frontend
docker-compose -f docker-compose.production.yml logs nginx

# Test API endpoints
curl -f https://your-domain.com/api/health
curl -f https://your-domain.com/
```

## 📊 Monitoring & Observability

### Prometheus Metrics
- **URL**: http://your-domain.com:9090
- **Metrics**: System performance, API response times, error rates

### Grafana Dashboards
- **URL**: http://your-domain.com:3001
- **Login**: admin / [GRAFANA_PASSWORD]
- **Features**: Real-time dashboards, alerting

### Log Management (ELK Stack)
- **Elasticsearch**: Port 9200
- **Kibana**: http://your-domain.com:5601
- **Log Sources**: Application logs, Nginx access logs, system logs

## 🔒 Security Considerations

### SSL/TLS Configuration
```nginx
# nginx.conf snippet
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
add_header Strict-Transport-Security "max-age=63072000" always;
```

### Firewall Configuration
```bash
# UFW firewall rules
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw deny 3001/tcp  # Block direct backend access
sudo ufw deny 5432/tcp  # Block direct database access
sudo ufw enable
```

### Database Security
```sql
-- Create application user with limited privileges
CREATE USER notevault_app WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE notevault TO notevault_app;
GRANT USAGE ON SCHEMA public TO notevault_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO notevault_app;
```

## 🗄️ Backup & Recovery

### Automated Backups
```bash
# Enable backup service
docker-compose -f docker-compose.production.yml --profile backup up -d

# Manual backup
docker-compose -f docker-compose.production.yml exec backup /backup.sh
```

### Manual Backup
```bash
# Database backup
docker-compose -f docker-compose.production.yml exec -T db \
  pg_dump -U notevault notevault > backup_$(date +%Y%m%d).sql

# Files backup
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz ./server/uploads/
```

### Recovery Process
```bash
# Restore database
docker-compose -f docker-compose.production.yml exec -T db \
  psql -U notevault notevault < backup_20231201.sql

# Restore files
tar -xzf uploads_backup_20231201.tar.gz
```

## 🔄 Updates & Maintenance

### Rolling Updates
```bash
# Update with zero downtime
git pull origin main
ZERO_DOWNTIME=true ./deploy.sh production
```

### Database Migrations
```bash
# Run migrations manually
docker-compose -f docker-compose.production.yml exec backend \
  npm run migrate
```

### Log Rotation
```bash
# Configure logrotate
sudo tee /etc/logrotate.d/notevault << EOF
/var/lib/docker/containers/*/*-json.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
    postrotate
        docker kill --signal=USR1 $(docker ps -q)
    endscript
}
EOF
```

## 🚨 Troubleshooting

### Common Issues

**1. Port Already in Use**
```bash
# Find process using port
sudo lsof -i :3000
sudo lsof -i :3001

# Stop conflicting services
sudo systemctl stop apache2
sudo systemctl stop nginx
```

**2. Database Connection Failed**
```bash
# Check database status
docker-compose -f docker-compose.production.yml logs db

# Reset database password
docker-compose -f docker-compose.production.yml exec db \
  psql -U postgres -c "ALTER USER notevault PASSWORD 'new_password';"
```

**3. SSL Certificate Issues**
```bash
# Verify certificate
openssl x509 -in ssl/certificate.crt -text -noout

# Test SSL connection
openssl s_client -connect your-domain.com:443
```

### Performance Optimization

**1. Database Optimization**
```sql
-- Add indexes for better performance
CREATE INDEX idx_notes_workspace_id ON notes(workspace_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
```

**2. Nginx Optimization**
```nginx
# Enable gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript;

# Enable caching
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 📞 Support

### Log Locations
- **Application Logs**: `docker-compose logs [service]`
- **Nginx Logs**: `/var/log/nginx/`
- **Database Logs**: `docker-compose logs db`

### Debugging Commands
```bash
# Enter container shell
docker-compose -f docker-compose.production.yml exec backend bash
docker-compose -f docker-compose.production.yml exec frontend sh

# Check resource usage
docker stats

# View system events
docker events --since 1h
```

### Getting Help
- **Documentation**: https://docs.notevault.com
- **Issues**: https://github.com/your-org/notevault-svelte/issues
- **Discord**: https://discord.gg/notevault

---

## 🎯 Production Checklist

- [ ] SSL certificate configured
- [ ] Environment variables set
- [ ] Database backups scheduled
- [ ] Monitoring dashboard accessible
- [ ] Health checks passing
- [ ] Log rotation configured
- [ ] Firewall rules applied
- [ ] DNS records configured
- [ ] Email delivery tested
- [ ] OAuth providers configured
- [ ] Performance baseline established
- [ ] Disaster recovery plan documented

---

**Remember**: Always test deployments in a staging environment first!