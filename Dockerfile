# Multi-stage Docker build für Production
FROM node:18-alpine AS frontend-build

# Frontend Build Stage
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm ci --only=production

# Copy source code and build
COPY public/ ./public/
COPY src/ ./src/
COPY tsconfig.json ./

# Build React app for production
RUN npm run build

# Production Stage
FROM node:18-alpine AS production

# Install runtime dependencies and build tools for sqlite3
RUN apk add --no-cache \
    dumb-init \
    curl \
    python3 \
    make \
    g++

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S borganizer -u 1001 -G nodejs

WORKDIR /app

# Copy backend source first
COPY --chown=borganizer:nodejs backend/ ./backend/

# Install backend dependencies and rebuild native modules in container
WORKDIR /app/backend
RUN npm ci --only=production && \
    npm rebuild sqlite3 && \
    npm cache clean --force

# Copy frontend build
COPY --from=frontend-build --chown=borganizer:nodejs /app/build ../build

# Create required directories with proper permissions
RUN mkdir -p ./uploads ./logs ./data && \
    chown -R borganizer:nodejs ./uploads ./logs ./data

# Remove build dependencies to minimize image size
RUN apk del python3 make g++

# Switch to non-root user
USER borganizer

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl --fail http://localhost:5000/api/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]