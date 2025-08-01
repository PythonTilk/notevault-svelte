#!/bin/bash

# NoteVault One-Line Launch Script
# Starts the complete NoteVault stack with monitoring in detached mode

set -e

echo "🚀 Starting NoteVault with Full Monitoring Stack..."

# Create necessary directories
mkdir -p monitoring/{prometheus,grafana/{dashboards,datasources}}

# Start all services with monitoring profile
docker-compose -f docker-compose.production.yml --profile monitoring up -d

echo "✅ NoteVault started successfully!"
echo ""
echo "📊 Access Points:"
echo "  Frontend:    http://localhost:3000"
echo "  Backend API: http://localhost:3001"
echo "  Prometheus:  http://localhost:9090"
echo "  Grafana:     http://localhost:3002 (admin/admin123)"
echo "  Node Metrics: http://localhost:9100"
echo "  Container Metrics: http://localhost:8080"
echo ""
echo "🔑 Default Credentials:"
echo "  Admin: admin@notevault.com / admin123"
echo "  Demo:  demo@notevault.com / demo123"
echo ""
echo "📈 Monitoring is enabled with Prometheus + Grafana"
echo "🐳 All services running in detached mode"