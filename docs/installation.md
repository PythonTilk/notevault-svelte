# Installation Guide

This guide walks you through installing and setting up NoteVault in various environments.

## 📋 Prerequisites

Before installing NoteVault, ensure you have the following:

### System Requirements
- **Node.js** 18.0.0 or higher
- **npm** 9.0.0 or higher (or yarn/pnpm equivalent)
- **Git** for cloning the repository
- **Database** (PostgreSQL recommended, SQLite for development)

### Optional Requirements
- **Redis** for session storage and caching
- **Reverse Proxy** (nginx, Apache) for production
- **SSL Certificate** for HTTPS (recommended)

## 🚀 Quick Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/notevault-svelte.git
cd notevault-svelte
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create environment configuration files:

```bash
# Copy example environment file
cp .env.example .env

# Edit environment variables
nano .env
```

### 4. Database Setup

#### SQLite (Development)
```bash
# SQLite database will be created automatically
npm run init-db
```

#### PostgreSQL (Production)
```bash
# Create database
createdb notevault

# Run migrations
npm run migrate
```

### 5. Start Development Server

```bash
# Start development server
npm run dev

# Backend will start on http://localhost:3001
# Frontend will start on http://localhost:5173
```

## 🔧 Detailed Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Application Settings
NODE_ENV=development
APP_NAME=NoteVault
APP_URL=http://localhost:5173

# Server Configuration
PORT=3001
HOST=localhost

# Database Configuration
DATABASE_URL=sqlite:./data/notevault.db
# For PostgreSQL: postgresql://user:password@localhost:5432/notevault

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-refresh-secret-here
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Session Configuration
SESSION_SECRET=your-session-secret-here

# File Upload Configuration
UPLOAD_MAX_SIZE=10485760  # 10MB
UPLOAD_ALLOWED_TYPES=image/*,application/pdf,text/*
UPLOAD_PATH=./uploads

# Integration APIs
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-secret
OUTLOOK_CLIENT_ID=your-outlook-client-id
OUTLOOK_CLIENT_SECRET=your-outlook-secret

# Webhook Configuration
WEBHOOK_SECRET=your-webhook-secret

# Real-time Configuration
SOCKET_IO_ORIGINS=http://localhost:5173
SOCKET_IO_CORS=true

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Redis Configuration (Optional)
REDIS_URL=redis://localhost:6379

# Security
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=900000  # 15 minutes
CORS_ORIGINS=http://localhost:5173

# Monitoring
LOG_LEVEL=info
ENABLE_METRICS=true
```

### Database Configuration

#### SQLite Setup (Development)
```bash
# Initialize SQLite database
npm run init-db

# The database file will be created at ./data/notevault.db
```

#### PostgreSQL Setup (Production)
```sql
-- Create database and user
CREATE DATABASE notevault;
CREATE USER notevault_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE notevault TO notevault_user;
```

Update your `.env` file:
```env
DATABASE_URL=postgresql://notevault_user:secure_password@localhost:5432/notevault
```

Run migrations:
```bash
npm run migrate
```

### File Storage Configuration

#### Local File Storage
```bash
# Create upload directory
mkdir -p uploads/files
mkdir -p uploads/avatars
mkdir -p uploads/workspaces

# Set permissions
chmod 755 uploads
chmod 755 uploads/*
```

#### Cloud Storage (Optional)
For production deployments, configure cloud storage:

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=notevault-files

# Or Azure Blob Storage
AZURE_STORAGE_ACCOUNT=your-account
AZURE_STORAGE_KEY=your-key
AZURE_STORAGE_CONTAINER=notevault-files
```

## 🐳 Docker Installation

### Using Docker Compose

1. **Create docker-compose.yml**:
```yaml
version: '3.8'

services:
  notevault:
    build: .
    ports:
      - "3001:3001"
      - "5173:5173"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/notevault
      - JWT_SECRET=your-jwt-secret
      - SESSION_SECRET=your-session-secret
    depends_on:
      - db
      - redis
    volumes:
      - ./uploads:/app/uploads
      - ./data:/app/data

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=notevault
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

2. **Start the stack**:
```bash
docker-compose up -d
```

3. **Initialize database**:
```bash
docker-compose exec notevault npm run migrate
```

### Using Docker

1. **Build the image**:
```bash
docker build -t notevault .
```

2. **Run the container**:
```bash
docker run -d \
  --name notevault \
  -p 3001:3001 \
  -p 5173:5173 \
  -e NODE_ENV=production \
  -e DATABASE_URL=sqlite:./data/notevault.db \
  -e JWT_SECRET=your-jwt-secret \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/uploads:/app/uploads \
  notevault
```

## 🌐 Production Deployment

### 1. Build for Production

```bash
# Install dependencies
npm ci --only=production

# Build the application
npm run build

# The built application will be in .svelte-kit/output/
```

### 2. Process Manager (PM2)

Install PM2:
```bash
npm install -g pm2
```

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'notevault',
    script: './build/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

Start with PM2:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 3. Reverse Proxy (nginx)

Create nginx configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL Configuration
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';";
    
    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # WebSocket support
        proxy_set_header Sec-WebSocket-Extensions $http_sec_websocket_extensions;
        proxy_set_header Sec-WebSocket-Key $http_sec_websocket_key;
        proxy_set_header Sec-WebSocket-Version $http_sec_websocket_version;
    }
    
    # Static file handling
    location /uploads/ {
        alias /path/to/notevault/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # File upload size
    client_max_body_size 10M;
}
```

### 4. SSL Certificate

Using Let's Encrypt:
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔍 Verification

### Health Check

Visit health endpoints to verify installation:

```bash
# Application health
curl http://localhost:3001/health

# Database connection
curl http://localhost:3001/api/health/db

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-08-15T21:00:00.000Z",
  "uptime": 123.456,
  "version": "1.0.0"
}
```

### Feature Testing

1. **User Registration**:
   - Visit `http://localhost:5173/register`
   - Create a test account

2. **Real-time Features**:
   - Open multiple browser tabs
   - Test chat and collaboration features

3. **File Upload**:
   - Upload a test file
   - Verify file storage and retrieval

4. **Search**:
   - Create some notes
   - Test search functionality

## 🚨 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Or use different port
PORT=3002 npm run dev
```

#### Database Connection Error
```bash
# Check database status
npm run db:status

# Reset database
npm run db:reset
npm run migrate
```

#### File Upload Issues
```bash
# Check upload directory permissions
ls -la uploads/
chmod 755 uploads/
chown -R $USER:$USER uploads/
```

#### WebSocket Connection Issues
```bash
# Check firewall settings
sudo ufw allow 3001

# Verify CORS configuration
echo $SOCKET_IO_ORIGINS
```

### Log Files

Check application logs:
```bash
# Development logs
npm run dev --verbose

# Production logs (PM2)
pm2 logs notevault

# System logs
sudo journalctl -u notevault -f
```

### Performance Issues

```bash
# Check system resources
htop
df -h
free -m

# Node.js memory usage
node --inspect index.js
```

## 📞 Support

If you encounter issues during installation:

1. Check the [Troubleshooting Guide](./troubleshooting.md)
2. Review [Common Issues](./troubleshooting.md#common-issues)
3. Check GitHub Issues
4. Contact support team

## ⏭️ Next Steps

After successful installation:

1. **[Configuration](./configuration.md)** - Customize your installation
2. **[User Guide](./user-guide/README.md)** - Learn how to use NoteVault
3. **[Admin Guide](./admin-guide/README.md)** - Administrative features
4. **[Security](./security/README.md)** - Secure your deployment

---

*Last Updated: August 15, 2025*