# Deployment Guide

This comprehensive guide covers all aspects of deploying NoteVault, from local development to production environments, including Docker, cloud platforms, and enterprise deployments.

## 🚀 Quick Start Deployment

### Development Environment

#### Prerequisites
```bash
# Required software versions
Node.js: 20+ (recommended: 20.11.0)
npm: 10+ (or yarn 4+)
Docker: 24+ (for containerized deployment)
Git: 2.40+

# Optional but recommended
Redis: 7+ (for caching and sessions)
PostgreSQL: 15+ (for production database)
```

#### Local Development Setup
```bash
# 1. Clone repository
git clone https://github.com/your-org/notevault-svelte.git
cd notevault-svelte

# 2. Install dependencies
npm install

# 3. Copy environment configuration
cp .env.example .env.local

# 4. Configure environment variables
# Edit .env.local with your settings

# 5. Initialize database
npm run init-db

# 6. Start development server
npm run dev
```

#### Environment Configuration
```bash
# .env.local - Development Configuration
NODE_ENV=development
PORT=3001
HOST=localhost

# Database (SQLite for development)
DATABASE_URL="file:./dev.db"

# JWT Secrets
JWT_SECRET="your-super-secret-jwt-key-for-development"
JWT_REFRESH_SECRET="your-refresh-secret-for-development"

# Optional: Redis for caching
REDIS_URL="redis://localhost:6379"

# File uploads
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE="10485760" # 10MB

# External services (optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

## 🐳 Docker Deployment

### Single Container (Development)

#### Dockerfile
```dockerfile
# Development Dockerfile
FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 3001

# Start application
CMD ["npm", "start"]
```

#### Docker Compose (Development)
```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=file:./dev.db
      - JWT_SECRET=dev-secret-key
    volumes:
      - .:/app
      - /app/node_modules
      - uploads:/app/uploads
    command: npm run dev

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  uploads:
  redis_data:
```

### Production Docker Setup

#### Multi-stage Production Dockerfile
```dockerfile
# Production Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S notevault -u 1001

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/build ./build
COPY --from=builder /app/static ./static

# Create uploads directory
RUN mkdir -p uploads && chown -R notevault:nodejs uploads

# Switch to non-root user
USER notevault

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node health-check.js

# Start application
CMD ["node", "build/index.js"]
```

#### Production Docker Compose
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - REDIS_URL=redis://redis:6379
    volumes:
      - uploads:/app/uploads
      - logs:/app/logs
    depends_on:
      - db
      - redis
    networks:
      - notevault-network

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - static_files:/var/www/static:ro
    depends_on:
      - app
    networks:
      - notevault-network

  db:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      - POSTGRES_DB=${DB_NAME}
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    ports:
      - "5432:5432"
    networks:
      - notevault-network

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    networks:
      - notevault-network

  backup:
    image: postgres:15-alpine
    restart: "no"
    volumes:
      - postgres_data:/var/lib/postgresql/data:ro
      - ./backups:/backups
    environment:
      - POSTGRES_DB=${DB_NAME}
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    command: |
      sh -c "
        while true; do
          pg_dump -h db -U ${DB_USER} ${DB_NAME} > /backups/backup_$(date +%Y%m%d_%H%M%S).sql
          find /backups -name 'backup_*.sql' -mtime +7 -delete
          sleep 86400
        done
      "
    depends_on:
      - db
    networks:
      - notevault-network

volumes:
  postgres_data:
  redis_data:
  uploads:
  logs:
  static_files:

networks:
  notevault-network:
    driver: bridge
```

## ☁️ Cloud Platform Deployment

### AWS Deployment

#### ECS (Elastic Container Service)
```yaml
# ecs-task-definition.json
{
  "family": "notevault-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "notevault-app",
      "image": "your-account.dkr.ecr.region.amazonaws.com/notevault:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:notevault/database-url"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:notevault/jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/notevault-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3001/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

#### CloudFormation Template
```yaml
# cloudformation-template.yml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'NoteVault Application Infrastructure'

Parameters:
  Environment:
    Type: String
    Default: production
    AllowedValues: [development, staging, production]
  
  VpcCIDR:
    Type: String
    Default: 10.0.0.0/16
    Description: CIDR block for VPC

Resources:
  # VPC Configuration
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: !Ref VpcCIDR
      EnableDnsHostnames: true
      EnableDnsSupport: true
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-notevault-vpc'

  # Internet Gateway
  InternetGateway:
    Type: AWS::EC2::InternetGateway
    Properties:
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-notevault-igw'

  # Subnets
  PublicSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [0, !GetAZs '']
      CidrBlock: 10.0.1.0/24
      MapPublicIpOnLaunch: true

  PublicSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [1, !GetAZs '']
      CidrBlock: 10.0.2.0/24
      MapPublicIpOnLaunch: true

  PrivateSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [0, !GetAZs '']
      CidrBlock: 10.0.3.0/24

  PrivateSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [1, !GetAZs '']
      CidrBlock: 10.0.4.0/24

  # RDS Database
  DatabaseSubnetGroup:
    Type: AWS::RDS::DBSubnetGroup
    Properties:
      DBSubnetGroupDescription: Subnet group for RDS database
      SubnetIds:
        - !Ref PrivateSubnet1
        - !Ref PrivateSubnet2

  Database:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceIdentifier: !Sub '${Environment}-notevault-db'
      DBInstanceClass: db.t3.micro
      Engine: postgres
      EngineVersion: '15.4'
      AllocatedStorage: 20
      StorageType: gp2
      StorageEncrypted: true
      DBName: notevault
      MasterUsername: notevault
      MasterUserPassword: !Sub '{{resolve:secretsmanager:${Environment}-notevault-db-password}}'
      VPCSecurityGroups:
        - !Ref DatabaseSecurityGroup
      DBSubnetGroupName: !Ref DatabaseSubnetGroup
      BackupRetentionPeriod: 7
      DeletionProtection: !If [IsProduction, true, false]

  # ElastiCache Redis
  CacheSubnetGroup:
    Type: AWS::ElastiCache::SubnetGroup
    Properties:
      Description: Subnet group for Redis cache
      SubnetIds:
        - !Ref PrivateSubnet1
        - !Ref PrivateSubnet2

  RedisCache:
    Type: AWS::ElastiCache::CacheCluster
    Properties:
      CacheNodeType: cache.t3.micro
      Engine: redis
      NumCacheNodes: 1
      VpcSecurityGroupIds:
        - !Ref CacheSecurityGroup
      CacheSubnetGroupName: !Ref CacheSubnetGroup

  # ECS Cluster
  ECSCluster:
    Type: AWS::ECS::Cluster
    Properties:
      ClusterName: !Sub '${Environment}-notevault-cluster'
      CapacityProviders:
        - FARGATE
        - FARGATE_SPOT

  # Application Load Balancer
  LoadBalancer:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      Name: !Sub '${Environment}-notevault-alb'
      Scheme: internet-facing
      Type: application
      Subnets:
        - !Ref PublicSubnet1
        - !Ref PublicSubnet2
      SecurityGroups:
        - !Ref LoadBalancerSecurityGroup

Conditions:
  IsProduction: !Equals [!Ref Environment, production]

Outputs:
  VPCId:
    Description: VPC ID
    Value: !Ref VPC
    Export:
      Name: !Sub '${Environment}-VPC-ID'

  DatabaseEndpoint:
    Description: RDS Database Endpoint
    Value: !GetAtt Database.Endpoint.Address
    Export:
      Name: !Sub '${Environment}-DB-Endpoint'

  RedisEndpoint:
    Description: Redis Cache Endpoint
    Value: !GetAtt RedisCache.RedisEndpoint.Address
    Export:
      Name: !Sub '${Environment}-Redis-Endpoint'

  LoadBalancerDNS:
    Description: Load Balancer DNS Name
    Value: !GetAtt LoadBalancer.DNSName
    Export:
      Name: !Sub '${Environment}-ALB-DNS'
```

### Google Cloud Platform (GCP)

#### Cloud Run Deployment
```yaml
# cloudbuild.yaml
steps:
  # Build the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: [
      'build',
      '-t', 'gcr.io/$PROJECT_ID/notevault:$COMMIT_SHA',
      '-t', 'gcr.io/$PROJECT_ID/notevault:latest',
      '.'
    ]

  # Push the container image to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/notevault:$COMMIT_SHA']

  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/notevault:latest']

  # Deploy container image to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'notevault-app'
      - '--image'
      - 'gcr.io/$PROJECT_ID/notevault:$COMMIT_SHA'
      - '--region'
      - 'us-central1'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'
      - '--set-env-vars'
      - 'NODE_ENV=production'

images:
  - 'gcr.io/$PROJECT_ID/notevault:$COMMIT_SHA'
  - 'gcr.io/$PROJECT_ID/notevault:latest'
```

#### GKE (Google Kubernetes Engine)
```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notevault-app
  labels:
    app: notevault
spec:
  replicas: 3
  selector:
    matchLabels:
      app: notevault
  template:
    metadata:
      labels:
        app: notevault
    spec:
      containers:
      - name: notevault
        image: gcr.io/PROJECT_ID/notevault:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: notevault-secrets
              key: database-url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: notevault-secrets
              key: jwt-secret
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: notevault-service
spec:
  selector:
    app: notevault
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3001
  type: LoadBalancer

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: notevault-ingress
  annotations:
    kubernetes.io/ingress.class: "gce"
    kubernetes.io/ingress.global-static-ip-name: "notevault-ip"
    networking.gke.io/managed-certificates: "notevault-ssl-cert"
spec:
  rules:
  - host: app.notevault.com
    http:
      paths:
      - path: /*
        pathType: ImplementationSpecific
        backend:
          service:
            name: notevault-service
            port:
              number: 80
```

### Azure Deployment

#### Container Instances
```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "containerGroupName": {
      "type": "string",
      "defaultValue": "notevault-app",
      "metadata": {
        "description": "Name for the container group"
      }
    },
    "imageTag": {
      "type": "string",
      "defaultValue": "latest",
      "metadata": {
        "description": "Container image tag"
      }
    }
  },
  "variables": {
    "containerRegistryServer": "notevault.azurecr.io",
    "imageName": "[concat(variables('containerRegistryServer'), '/notevault:', parameters('imageTag'))]"
  },
  "resources": [
    {
      "type": "Microsoft.ContainerInstance/containerGroups",
      "apiVersion": "2019-12-01",
      "name": "[parameters('containerGroupName')]",
      "location": "[resourceGroup().location]",
      "properties": {
        "containers": [
          {
            "name": "notevault",
            "properties": {
              "image": "[variables('imageName')]",
              "ports": [
                {
                  "port": 3001,
                  "protocol": "TCP"
                }
              ],
              "environmentVariables": [
                {
                  "name": "NODE_ENV",
                  "value": "production"
                },
                {
                  "name": "PORT",
                  "value": "3001"
                }
              ],
              "resources": {
                "requests": {
                  "cpu": 1,
                  "memoryInGB": 2
                }
              }
            }
          }
        ],
        "osType": "Linux",
        "ipAddress": {
          "type": "Public",
          "ports": [
            {
              "port": 3001,
              "protocol": "TCP"
            }
          ],
          "dnsNameLabel": "[parameters('containerGroupName')]"
        },
        "imageRegistryCredentials": [
          {
            "server": "[variables('containerRegistryServer')]",
            "username": "[parameters('registryUsername')]",
            "password": "[parameters('registryPassword')]"
          }
        ]
      }
    }
  ],
  "outputs": {
    "containerIPv4Address": {
      "type": "string",
      "value": "[reference(resourceId('Microsoft.ContainerInstance/containerGroups', parameters('containerGroupName'))).ipAddress.ip]"
    },
    "containerFQDN": {
      "type": "string",
      "value": "[reference(resourceId('Microsoft.ContainerInstance/containerGroups', parameters('containerGroupName'))).ipAddress.fqdn]"
    }
  }
}
```

## 🖥️ Traditional Server Deployment

### Linux Server Setup

#### Ubuntu/Debian Installation
```bash
#!/bin/bash
# install-notevault.sh - Production server setup script

set -e

# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y \
  curl \
  git \
  nginx \
  postgresql \
  redis-server \
  certbot \
  python3-certbot-nginx \
  fail2ban \
  ufw

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 process manager
sudo npm install -g pm2

# Create application user
sudo useradd -m -s /bin/bash notevault
sudo usermod -aG sudo notevault

# Create application directory
sudo mkdir -p /opt/notevault
sudo chown notevault:notevault /opt/notevault

# Setup PostgreSQL
sudo -u postgres createuser notevault
sudo -u postgres createdb notevault -O notevault
sudo -u postgres psql -c "ALTER USER notevault PASSWORD 'secure_password';"

# Configure Redis
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Setup firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Setup fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

echo "Server setup complete. Deploy your application to /opt/notevault"
```

#### Application Deployment Script
```bash
#!/bin/bash
# deploy.sh - Application deployment script

set -e

APP_DIR="/opt/notevault"
REPO_URL="https://github.com/your-org/notevault-svelte.git"
BRANCH="main"

echo "🚀 Starting deployment..."

# Switch to application user
sudo -u notevault bash << 'EOF'
cd /opt/notevault

# Backup current version
if [ -d "current" ]; then
  mv current backup-$(date +%Y%m%d-%H%M%S)
fi

# Clone latest code
git clone -b $BRANCH $REPO_URL current
cd current

# Install dependencies
npm ci --only=production

# Build application
npm run build

# Copy environment file
cp /opt/notevault/.env.production .env

# Run database migrations
npm run migrate

# Update PM2 process
pm2 reload ecosystem.config.js --env production

# Cleanup old backups (keep last 3)
cd /opt/notevault
ls -dt backup-* | tail -n +4 | xargs rm -rf
EOF

# Reload nginx
sudo nginx -t && sudo nginx -s reload

echo "✅ Deployment complete!"
```

#### PM2 Configuration
```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'notevault-app',
      script: 'build/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        DATABASE_URL: process.env.DATABASE_URL,
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
        REDIS_URL: process.env.REDIS_URL
      },
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      error_file: '/opt/notevault/logs/err.log',
      out_file: '/opt/notevault/logs/out.log',
      log_file: '/opt/notevault/logs/combined.log',
      time: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
      kill_timeout: 5000,
      listen_timeout: 8000,
      reload_delay: 1000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ],
  
  deploy: {
    production: {
      user: 'notevault',
      host: ['your-server.com'],
      ref: 'origin/main',
      repo: 'https://github.com/your-org/notevault-svelte.git',
      path: '/opt/notevault',
      'pre-deploy-local': '',
      'post-deploy': 'npm ci --only=production && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
```

### Nginx Configuration

#### Production Nginx Config
```nginx
# /etc/nginx/sites-available/notevault
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_session_cache shared:le_nginx_SSL:10m;
    ssl_session_timeout 1440m;
    ssl_session_tickets off;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;

    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: ws:;" always;

    # Performance optimizations
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Static file caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, no-transform";
        access_log off;
    }

    # API and WebSocket proxy
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
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # File upload size limit
    client_max_body_size 100M;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # Logging
    access_log /var/log/nginx/notevault.access.log;
    error_log /var/log/nginx/notevault.error.log;
}
```

## 🔧 Environment Configuration

### Production Environment Variables
```bash
# .env.production
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/notevault"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT Secrets (generate with: openssl rand -hex 32)
JWT_SECRET="your-super-secure-jwt-secret-key-here"
JWT_REFRESH_SECRET="your-super-secure-refresh-secret-key-here"

# File uploads
UPLOAD_DIR="/opt/notevault/uploads"
MAX_FILE_SIZE="104857600" # 100MB
ALLOWED_FILE_TYPES="jpg,jpeg,png,gif,pdf,doc,docx,txt,md"

# Email configuration (optional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
FROM_EMAIL="noreply@your-domain.com"

# External integrations (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Security
RATE_LIMIT_WINDOW_MS=900000 # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN="https://your-domain.com"

# Monitoring
LOG_LEVEL="info"
ENABLE_METRICS=true
HEALTH_CHECK_INTERVAL=30000

# Backup
BACKUP_ENABLED=true
BACKUP_SCHEDULE="0 2 * * *" # Daily at 2 AM
BACKUP_RETENTION_DAYS=30
```

### Secrets Management

#### Using Docker Secrets
```bash
# Create secrets
echo "your-jwt-secret" | docker secret create jwt_secret -
echo "your-db-password" | docker secret create db_password -

# Use in docker-compose.yml
services:
  app:
    secrets:
      - jwt_secret
      - db_password
    environment:
      - JWT_SECRET_FILE=/run/secrets/jwt_secret
      - DB_PASSWORD_FILE=/run/secrets/db_password

secrets:
  jwt_secret:
    external: true
  db_password:
    external: true
```

#### Using Kubernetes Secrets
```bash
# Create secrets
kubectl create secret generic notevault-secrets \
  --from-literal=jwt-secret='your-jwt-secret' \
  --from-literal=database-url='postgresql://...' \
  --from-literal=redis-url='redis://...'

# Use in deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notevault-app
spec:
  template:
    spec:
      containers:
      - name: notevault
        env:
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: notevault-secrets
              key: jwt-secret
```

## 📊 Monitoring & Logging

### Application Monitoring

#### Health Check Endpoint
```typescript
// health-check.ts
import { createServer } from 'http';
import { promisify } from 'util';

const healthCheck = async () => {
  const checks = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    status: 'ok',
    checks: {
      database: 'unknown',
      redis: 'unknown',
      memory: 'unknown',
      disk: 'unknown'
    }
  };

  try {
    // Database check
    await db.raw('SELECT 1');
    checks.checks.database = 'ok';
  } catch (error) {
    checks.checks.database = 'error';
    checks.status = 'error';
  }

  try {
    // Redis check
    await redis.ping();
    checks.checks.redis = 'ok';
  } catch (error) {
    checks.checks.redis = 'error';
    checks.status = 'error';
  }

  // Memory check
  const memUsage = process.memoryUsage();
  const memUsagePercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  if (memUsagePercentage > 90) {
    checks.checks.memory = 'warning';
  } else {
    checks.checks.memory = 'ok';
  }

  return checks;
};

// Health check server
if (require.main === module) {
  healthCheck()
    .then(result => {
      console.log(JSON.stringify(result));
      process.exit(result.status === 'ok' ? 0 : 1);
    })
    .catch(error => {
      console.error('Health check failed:', error);
      process.exit(1);
    });
}
```

#### Prometheus Metrics
```typescript
// metrics.ts
import prometheus from 'prom-client';

// Default metrics
prometheus.collectDefaultMetrics({
  prefix: 'notevault_',
  timeout: 5000
});

// Custom metrics
export const httpRequestDuration = new prometheus.Histogram({
  name: 'notevault_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

export const activeConnections = new prometheus.Gauge({
  name: 'notevault_active_connections',
  help: 'Number of active WebSocket connections'
});

export const databaseQueries = new prometheus.Counter({
  name: 'notevault_database_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'table']
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  const metrics = await prometheus.register.metrics();
  res.end(metrics);
});
```

### Logging Configuration

#### Structured Logging
```typescript
// logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'notevault-app',
    version: process.env.npm_package_version
  },
  transports: [
    // Console output for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    
    // File output for production
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  ]
});

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  });
  
  next();
};
```

## 🔄 CI/CD Pipeline

### GitHub Actions

#### Complete CI/CD Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: notevault_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run type check
        run: npm run typecheck
      
      - name: Run lint
        run: npm run lint
      
      - name: Run tests
        run: npm run test
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/notevault_test
          REDIS_URL: redis://localhost:6379
          JWT_SECRET: test-secret
          JWT_REFRESH_SECRET: test-refresh-secret
      
      - name: Build application
        run: npm run build
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-files
          path: build/

  security-scan:
    runs-on: ubuntu-latest
    needs: test
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
      
      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'

  build-image:
    runs-on: ubuntu-latest
    needs: [test, security-scan]
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}
      
      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          target: production
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    runs-on: ubuntu-latest
    needs: build-image
    if: github.ref == 'refs/heads/main'
    environment: staging
    
    steps:
      - name: Deploy to staging
        uses: azure/webapps-deploy@v2
        with:
          app-name: 'notevault-staging'
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE_STAGING }}
          images: '${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}'

  deploy-production:
    runs-on: ubuntu-latest
    needs: deploy-staging
    if: github.ref == 'refs/heads/main'
    environment: production
    
    steps:
      - name: Deploy to production
        uses: azure/webapps-deploy@v2
        with:
          app-name: 'notevault-production'
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE_PRODUCTION }}
          images: '${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}'
      
      - name: Run smoke tests
        run: |
          curl -f https://app.notevault.com/health || exit 1
          curl -f https://app.notevault.com/api/health || exit 1
      
      - name: Notify deployment success
        uses: 8398a7/action-slack@v3
        with:
          status: success
          text: 'Production deployment successful! 🚀'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] SSL certificates obtained and configured
- [ ] Database setup and migrations run
- [ ] Redis/cache service configured
- [ ] File storage permissions set
- [ ] Firewall rules configured
- [ ] Monitoring and logging configured
- [ ] Backup strategy implemented
- [ ] Load testing completed
- [ ] Security scan passed

### Post-Deployment
- [ ] Health checks passing
- [ ] SSL certificate valid
- [ ] All application features working
- [ ] Real-time features functioning
- [ ] File uploads working
- [ ] Email notifications working (if configured)
- [ ] Monitoring alerts configured
- [ ] Performance metrics baseline established
- [ ] Error tracking configured
- [ ] Backup verification completed

### Rollback Plan
- [ ] Previous version backup available
- [ ] Rollback procedure documented
- [ ] Database rollback plan ready
- [ ] DNS failover configured (if applicable)
- [ ] Emergency contact list updated
- [ ] Rollback testing completed

---

*Last Updated: August 15, 2025*  
*Deployment Version: 2.0.0*  
*Next Review: November 15, 2025*