# NoteVault Security Implementation

This document outlines the comprehensive security improvements implemented for the NoteVault backend server.

## 🔒 Security Features Implemented

### 1. Database Migration (PostgreSQL/MySQL)

**Files:**
- `src/config/database-postgres.js` - Enhanced database configuration
- `src/utils/initDatabase-postgres.js` - Database initialization with PostgreSQL support

**Features:**
- Production-ready PostgreSQL support
- SQLite fallback for development
- Connection pooling for better performance
- Proper SSL configuration for production
- Environment-based configuration

**Environment Variables:**
```env
# PostgreSQL Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/notevault
DB_HOST=localhost
DB_PORT=5432
DB_NAME=notevault
DB_USER=notevault
DB_PASSWORD=your-database-password
DB_SSL=false
```

### 2. Enhanced Security Middleware

**File:** `src/middleware/security.js`

**Features:**
- **Rate Limiting:** Multiple tiers for different endpoints
  - General API: 100 requests per 15 minutes
  - Authentication: 5 attempts per 15 minutes
  - File uploads: 50 per hour
  - Strict endpoints: 10 per minute
- **CSRF Protection:** Token-based protection for state-changing operations
- **Security Headers:** Comprehensive Helmet.js configuration
- **Request Sanitization:** XSS and injection protection
- **IP-based Security:** Real IP detection and logging
- **Security Logging:** Comprehensive audit trail

### 3. Session Management

**File:** `src/middleware/session.js`

**Features:**
- **Redis Session Store:** Optional Redis backend for scalability
- **Memory Store Fallback:** Works without Redis in development
- **Secure Cookies:** HttpOnly, Secure, SameSite protection
- **Session-based Authentication:** Alternative to JWT tokens
- **Role-based Authorization:** Admin, moderator, user roles
- **Activity Tracking:** Last activity timestamps
- **CSRF Token Generation:** Per-session CSRF tokens

**Environment Variables:**
```env
SESSION_SECRET=your-super-secret-session-key
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

### 4. Cloud Storage Integration

**File:** `src/services/storage.js`

**Features:**
- **Multi-provider Support:** AWS S3, Cloudinary, Local storage
- **Automatic Provider Selection:** Based on environment configuration
- **File Validation:** Type, size, and security checks
- **Signed URLs:** Secure file access for private files
- **Image Optimization:** Built-in support for different file types
- **Error Handling:** Comprehensive error management

**Environment Variables:**
```env
STORAGE_TYPE=s3  # 's3', 'cloudinary', or 'local'

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=notevault-files

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### 5. Email Service

**File:** `src/services/email.js`

**Features:**
- **SMTP Configuration:** Flexible SMTP provider support
- **Email Templates:** Pre-built templates for common scenarios
- **Template System:** HTML and text versions
- **Verification Emails:** Account verification workflow
- **Password Reset:** Secure password reset flow
- **Workspace Invitations:** Team collaboration invites
- **Notification System:** General notification framework

**Environment Variables:**
```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@notevault.com
FROM_NAME=NoteVault
```

### 6. Two-Factor Authentication (2FA)

**File:** `src/services/twofa.js`

**Features:**
- **TOTP Support:** Time-based one-time passwords
- **QR Code Generation:** Easy setup with authenticator apps
- **Backup Codes:** Emergency access codes
- **Multiple Verification Methods:** TOTP tokens and backup codes
- **Setup Validation:** Secure enrollment process
- **Recovery System:** Account recovery mechanisms
- **Admin Enforcement:** Mandatory 2FA for admin accounts

**Database Tables:**
```sql
-- Two-factor authentication table
CREATE TABLE user_2fa (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  secret TEXT NOT NULL,
  backup_codes TEXT, -- JSON array
  is_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
```

### 7. OAuth Integration

**File:** `src/services/oauth.js`

**Features:**
- **Multi-provider Support:** Google, GitHub, Discord
- **Passport.js Integration:** Industry-standard OAuth library
- **Account Linking:** Connect OAuth accounts to existing users
- **State Validation:** CSRF protection for OAuth flows
- **Profile Data Processing:** Standardized user data handling
- **Provider Configuration:** Runtime provider availability

**Environment Variables:**
```env
# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
```

**Database Tables:**
```sql
-- OAuth providers table
CREATE TABLE oauth_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'github', 'discord')),
  provider_user_id TEXT NOT NULL,
  provider_username TEXT,
  provider_email TEXT,
  access_token TEXT,
  refresh_token TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  UNIQUE(provider, provider_user_id)
);
```

### 8. Enhanced Authentication Routes

**File:** `src/routes/auth-enhanced.js`

**Features:**
- **Input Validation:** Comprehensive request validation
- **Password Strength:** Strong password requirements
- **Email Verification:** Account verification workflow
- **2FA Integration:** Seamless two-factor authentication
- **OAuth Routes:** Complete OAuth implementation
- **Password Reset:** Secure password recovery
- **Session Management:** Proper login/logout handling

### 9. Enhanced Server Configuration

**File:** `src/server-enhanced.js`

**Features:**
- **Security-first Architecture:** All security middleware enabled
- **Enhanced Socket.IO:** Secure real-time communication
- **Graceful Shutdown:** Proper cleanup on termination
- **Health Checks:** Comprehensive system status
- **Error Handling:** Production-ready error management
- **Environment Detection:** Development vs production configuration

## 🛡️ Security Best Practices Implemented

### Password Security
- Bcrypt hashing with salt rounds of 12
- Strong password requirements (8+ chars, mixed case, numbers, symbols)
- Password history (prevents reuse)
- Secure password reset flow

### Session Security
- Secure cookie configuration
- HttpOnly and SameSite flags
- Session rotation on login
- Automatic session cleanup

### Input Validation
- Server-side validation for all inputs
- XSS protection through sanitization
- SQL injection prevention
- File upload restrictions

### Rate Limiting
- Tiered rate limiting by endpoint type
- IP-based tracking
- Sliding window implementation
- Bypass for authenticated premium users

### Audit Logging
- Security event logging
- Failed login attempt tracking
- Admin action logging
- Data access logging

## 🚀 Deployment Considerations

### Production Environment
1. **Use PostgreSQL** instead of SQLite
2. **Configure Redis** for session storage
3. **Set up SSL/TLS** certificates
4. **Configure email service** for notifications
5. **Set up cloud storage** (S3 or Cloudinary)
6. **Configure OAuth providers** for social login
7. **Set strong secrets** for JWT, sessions, and CSRF

### Environment Variables Checklist
```env
# Required for production
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://...
SESSION_SECRET=strong-random-secret
JWT_SECRET=strong-random-secret
CSRF_SECRET=strong-random-secret

# Optional but recommended
REDIS_URL=redis://...
SMTP_HOST=...
SMTP_USER=...
SMTP_PASS=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

### Security Headers
The application automatically sets these security headers:
- `Strict-Transport-Security`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `X-XSS-Protection`
- `Content-Security-Policy`
- `Referrer-Policy`

### Monitoring and Alerting
- Monitor failed login attempts
- Track rate limiting violations
- Alert on admin account activities
- Monitor system health endpoints

## 📋 Migration Guide

### From Current System
1. **Backup existing database**
2. **Install new dependencies**: `npm install`
3. **Update environment variables**
4. **Run database migration**: `npm run init-db`
5. **Test in development environment**
6. **Deploy to production**

### Database Schema Updates
The enhanced system includes new tables for:
- Sessions management
- Two-factor authentication
- OAuth account linking
- Email verification
- Password reset tokens
- Enhanced audit logging

## 🔧 Configuration Examples

### Nginx Configuration (Production)
```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL configuration
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    
    location /api/auth {
        limit_req zone=auth burst=5 nodelay;
        proxy_pass http://localhost:3001;
    }
    
    location /api/ {
        limit_req zone=api burst=10 nodelay;
        proxy_pass http://localhost:3001;
    }
}
```

### Docker Compose (Production)
```yaml
version: '3.8'
services:
  app:
    build: .
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@postgres:5432/notevault
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
  
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: notevault
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
```

This comprehensive security implementation provides enterprise-grade protection while maintaining usability and performance.