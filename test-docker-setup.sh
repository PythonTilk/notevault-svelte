#!/bin/bash

echo "🐳 Testing Docker Setup for NoteVault"
echo "======================================"

# Check if all required files exist
echo "📁 Checking Docker configuration files..."

files=(
    "docker-compose.yml"
    "server/Dockerfile"
    "Dockerfile.frontend"
    "nginx.conf"
    ".dockerignore"
    "server/.dockerignore"
    ".env.example"
    ".env.docker"
    "server/.env.example"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
        exit 1
    fi
done

echo ""
echo "🔧 Validating configuration..."

# Check if npm build works
echo "📦 Testing frontend build..."
if npm run build > /dev/null 2>&1; then
    echo "✅ Frontend build successful"
else
    echo "❌ Frontend build failed"
    exit 1
fi

# Check if backend dependencies are installed
echo "📦 Testing backend dependencies..."
cd server
if npm list > /dev/null 2>&1; then
    echo "✅ Backend dependencies installed"
else
    echo "❌ Backend dependencies missing"
    exit 1
fi
cd ..

# Validate docker-compose.yml syntax
echo "📋 Validating docker-compose.yml..."
if command -v docker-compose > /dev/null 2>&1; then
    if docker-compose config > /dev/null 2>&1; then
        echo "✅ docker-compose.yml is valid"
    else
        echo "❌ docker-compose.yml has syntax errors"
        exit 1
    fi
else
    echo "⚠️  docker-compose not available, skipping validation"
fi

echo ""
echo "🎉 Docker setup validation completed successfully!"
echo ""
echo "📝 To run the application with Docker:"
echo "   1. Make sure Docker and Docker Compose are installed"
echo "   2. Copy .env.docker to .env: cp .env.docker .env"
echo "   3. Run: docker-compose up --build"
echo "   4. Access the application at http://localhost:80"
echo ""
echo "🔧 For development:"
echo "   1. Backend: cd server && npm start"
echo "   2. Frontend: npm run dev"
echo "   3. Access at http://localhost:5173 (frontend) and http://localhost:3001 (backend)"