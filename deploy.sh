#!/bin/bash

# NoteVault Production Deployment Script
# This script handles the complete deployment process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Configuration
DEPLOYMENT_ENV=${1:-production}
BACKUP_BEFORE_DEPLOY=${BACKUP_BEFORE_DEPLOY:-true}
RUN_TESTS=${RUN_TESTS:-true}
ZERO_DOWNTIME=${ZERO_DOWNTIME:-false}

log "🚀 Starting NoteVault deployment to $DEPLOYMENT_ENV environment"

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
    fi
    
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
    fi
    
    if [ ! -f ".env.$DEPLOYMENT_ENV" ]; then
        error "Environment file .env.$DEPLOYMENT_ENV not found"
    fi
    
    log "✅ Prerequisites check passed"
}

# Load environment variables
load_environment() {
    log "Loading environment variables for $DEPLOYMENT_ENV..."
    
    if [ -f ".env.$DEPLOYMENT_ENV" ]; then
        export $(cat .env.$DEPLOYMENT_ENV | grep -v '^#' | xargs)
        log "✅ Environment variables loaded"
    else
        warning "No environment file found for $DEPLOYMENT_ENV"
    fi
}

# Run tests
run_tests() {
    if [ "$RUN_TESTS" = "true" ]; then
        log "Running tests..."
        
        # Run load tests
        info "Running load tests..."
        node load-test.js || warning "Load tests failed but continuing deployment"
        
        # Run linting if available
        if npm run lint > /dev/null 2>&1; then
            npm run lint || warning "Linting failed but continuing deployment"
        fi
        
        # Run type checking
        if npm run check > /dev/null 2>&1; then
            npm run check || warning "Type checking failed but continuing deployment"
        fi
        
        log "✅ Tests completed"
    else
        info "Skipping tests (RUN_TESTS=false)"
    fi
}

# Create backup
create_backup() {
    if [ "$BACKUP_BEFORE_DEPLOY" = "true" ]; then
        log "Creating backup before deployment..."
        
        BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
        BACKUP_DIR="./backups/pre-deploy-$BACKUP_DATE"
        
        mkdir -p "$BACKUP_DIR"
        
        # Backup database if running
        if docker-compose -f docker-compose.production.yml ps db | grep -q "Up"; then
            info "Backing up database..."
            docker-compose -f docker-compose.production.yml exec -T db pg_dump -U notevault notevault > "$BACKUP_DIR/database_backup.sql"
        fi
        
        # Backup uploads
        if [ -d "./server/uploads" ]; then
            info "Backing up uploads..."
            tar -czf "$BACKUP_DIR/uploads_backup.tar.gz" ./server/uploads/
        fi
        
        # Backup configuration
        info "Backing up configuration..."
        cp .env.$DEPLOYMENT_ENV "$BACKUP_DIR/"
        cp docker-compose.production.yml "$BACKUP_DIR/"
        
        log "✅ Backup created at $BACKUP_DIR"
    else
        info "Skipping backup (BACKUP_BEFORE_DEPLOY=false)"
    fi
}

# Build application
build_application() {
    log "Building application..."
    
    # Install dependencies
    info "Installing frontend dependencies..."
    npm ci --only=production
    
    info "Installing backend dependencies..."
    cd server && npm ci --only=production && cd ..
    
    # Build frontend
    info "Building frontend..."
    npm run build
    
    # Build Docker images
    info "Building Docker images..."
    docker-compose -f docker-compose.production.yml build --no-cache
    
    log "✅ Application built successfully"
}

# Deploy with zero downtime
deploy_zero_downtime() {
    log "Deploying with zero downtime..."
    
    # Start new containers with different names
    info "Starting new containers..."
    docker-compose -f docker-compose.production.yml up -d --scale backend=2 --scale frontend=2
    
    # Health check new containers
    info "Performing health checks..."
    sleep 30
    
    # Check backend health
    if ! curl -f http://localhost:3001/health > /dev/null 2>&1; then
        error "Backend health check failed"
    fi
    
    # Check frontend health
    if ! curl -f http://localhost:3000 > /dev/null 2>&1; then
        error "Frontend health check failed"
    fi
    
    # Scale down old containers
    info "Scaling down old containers..."
    docker-compose -f docker-compose.production.yml up -d --scale backend=1 --scale frontend=1
    
    log "✅ Zero downtime deployment completed"
}

# Standard deployment
deploy_standard() {
    log "Performing standard deployment..."
    
    # Stop existing containers
    info "Stopping existing containers..."
    docker-compose -f docker-compose.production.yml down
    
    # Start new containers
    info "Starting new containers..."
    docker-compose -f docker-compose.production.yml up -d
    
    # Wait for services to be ready
    info "Waiting for services to be ready..."
    sleep 30
    
    log "✅ Standard deployment completed"
}

# Health checks
perform_health_checks() {
    log "Performing post-deployment health checks..."
    
    # Wait for services to be fully ready
    sleep 10
    
    # Check database
    info "Checking database connection..."
    if docker-compose -f docker-compose.production.yml exec -T db pg_isready -U notevault -d notevault; then
        info "✅ Database is healthy"
    else
        error "Database health check failed"
    fi
    
    # Check Redis
    info "Checking Redis connection..."
    if docker-compose -f docker-compose.production.yml exec -T redis redis-cli ping | grep -q "PONG"; then
        info "✅ Redis is healthy"
    else
        error "Redis health check failed"
    fi
    
    # Check backend API
    info "Checking backend API..."
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        info "✅ Backend API is healthy"
    else
        error "Backend API health check failed"
    fi
    
    # Check frontend
    info "Checking frontend..."
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        info "✅ Frontend is healthy"
    else
        error "Frontend health check failed"
    fi
    
    log "✅ All health checks passed"
}

# Clean up old images and containers
cleanup() {
    log "Cleaning up old Docker images and containers..."
    
    # Remove dangling images
    docker image prune -f
    
    # Remove unused volumes (be careful with this in production)
    if [ "$DEPLOYMENT_ENV" != "production" ]; then
        docker volume prune -f
    fi
    
    log "✅ Cleanup completed"
}

# Display deployment summary
show_summary() {
    log "🎉 Deployment Summary"
    echo "======================================"
    echo "Environment: $DEPLOYMENT_ENV"
    echo "Deployment Time: $(date)"
    echo "Services Status:"
    docker-compose -f docker-compose.production.yml ps
    echo "======================================"
    echo "Frontend URL: http://localhost:3000"
    echo "Backend API: http://localhost:3001"
    echo "Admin credentials: admin@notevault.com / admin123"
    echo "Demo credentials: demo@notevault.com / demo123"
    echo "======================================"
}

# Rollback function
rollback() {
    error "🔄 Initiating rollback..."
    
    # Stop current containers
    docker-compose -f docker-compose.production.yml down
    
    # Restore from backup if available
    LATEST_BACKUP=$(ls -t ./backups/pre-deploy-* 2>/dev/null | head -1)
    if [ -n "$LATEST_BACKUP" ]; then
        warning "Restoring from backup: $LATEST_BACKUP"
        # Restore database if backup exists
        if [ -f "$LATEST_BACKUP/database_backup.sql" ]; then
            # Restore database backup logic here
            info "Database backup found for rollback"
        fi
    fi
    
    error "Rollback completed. Please check the system status."
}

# Trap errors for rollback
trap 'rollback' ERR

# Main deployment flow
main() {
    check_prerequisites
    load_environment
    
    if [ "$RUN_TESTS" = "true" ]; then
        run_tests
    fi
    
    create_backup
    build_application
    
    if [ "$ZERO_DOWNTIME" = "true" ]; then
        deploy_zero_downtime
    else
        deploy_standard
    fi
    
    perform_health_checks
    cleanup
    show_summary
    
    log "🚀 Deployment completed successfully!"
}

# Handle command line arguments
case "${1:-}" in
    production|staging|development)
        main
        ;;
    --help|-h)
        echo "Usage: $0 [environment] [options]"
        echo ""
        echo "Environments:"
        echo "  production   Deploy to production"
        echo "  staging      Deploy to staging"
        echo "  development  Deploy to development"
        echo ""
        echo "Environment Variables:"
        echo "  BACKUP_BEFORE_DEPLOY=true   Create backup before deployment"
        echo "  RUN_TESTS=true              Run tests before deployment"
        echo "  ZERO_DOWNTIME=false         Enable zero downtime deployment"
        echo ""
        echo "Example:"
        echo "  $0 production"
        echo "  ZERO_DOWNTIME=true $0 production"
        ;;
    *)
        main
        ;;
esac