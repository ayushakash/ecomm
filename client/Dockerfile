# Frontend Dockerfile
# Multi-stage build for optimized production image

# Stage 1: Build
FROM node:18-alpine AS build

WORKDIR /app

# Chromium for react-snap prerendering (alpine has no bundled Chromium).
# Skip Puppeteer's own download and point react-snap at the system binary.
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Build arguments for React environment variables
ARG REACT_APP_API_URL=
ARG REACT_APP_MSG91_AUTH_KEY=471309TydHm2HpEe68dce0f9P1
ARG REACT_APP_MSG91_WIDGET_ID=356a61686571383330363834
# Analytics / ad-tracking. CRA inlines these at build time, so they MUST be
# present here — otherwise the deployed site loads no Pixel/GA at all (silent).
# Pixel ID and GA ID are public client-side values, safe as defaults.
ARG REACT_APP_META_PIXEL_ID=1004934193392142
ARG REACT_APP_GA_MEASUREMENT_ID=G-04CDWZJGE9
ARG REACT_APP_ANALYTICS_ENABLED=true

# Copy package files
COPY package*.json ./

# Install dependencies using package-lock.json for exact versions
RUN npm install --silent --legacy-peer-deps

# Copy source code
COPY . .

# Build for production
# Set environment variables
ENV CI=false \
    GENERATE_SOURCEMAP=false \
    NODE_OPTIONS="--max-old-space-size=4096" \
    REACT_APP_API_URL=$REACT_APP_API_URL \
    REACT_APP_MSG91_AUTH_KEY=$REACT_APP_MSG91_AUTH_KEY \
    REACT_APP_MSG91_WIDGET_ID=$REACT_APP_MSG91_WIDGET_ID \
    REACT_APP_META_PIXEL_ID=$REACT_APP_META_PIXEL_ID \
    REACT_APP_GA_MEASUREMENT_ID=$REACT_APP_GA_MEASUREMENT_ID \
    REACT_APP_ANALYTICS_ENABLED=$REACT_APP_ANALYTICS_ENABLED

RUN npm run build

# Stage 2: Production with Nginx
FROM nginx:1.25-alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Create nginx user for better security
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
