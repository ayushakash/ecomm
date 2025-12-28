# Backend Dockerfile
# Multi-stage build for optimized production image

# Stage 1: Base
FROM node:18-alpine AS base
WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm install --only=production --legacy-peer-deps && npm cache clean --force

# Stage 2: Production
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy node_modules from base stage
COPY --from=base --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application files
COPY --chown=nodejs:nodejs . .

# Remove unnecessary files
RUN rm -rf client/node_modules client/src client/public \
    tests scripts mobile-app .git .github

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "server.js"]
