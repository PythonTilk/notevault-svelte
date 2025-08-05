# Backend Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install curl and dumb-init for healthcheck and process management
RUN apk add --no-cache curl dumb-init

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/

# Create necessary directories
RUN mkdir -p database uploads /logs /secrets

# Copy .gitkeep files to ensure directories exist
COPY database/.gitkeep ./database/
COPY uploads/.gitkeep ./uploads/

# Set proper permissions for all directories
RUN chown -R node:node /app /logs /secrets && \
    chmod -R 755 /app/database /app/uploads
USER node

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the application
CMD ["dumb-init", "--", "node", "src/server.js"]