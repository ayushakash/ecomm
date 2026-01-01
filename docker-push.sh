#!/bin/bash

# Docker Hub Push Script
# Usage: ./docker-push.sh [version]
# Example: ./docker-push.sh v1.0.0
# If no version is provided, it will use 'latest'

set -e  # Exit on error

# Configuration
DOCKER_USERNAME="ayushmishra9"
BACKEND_IMAGE="ecomm-backend"
FRONTEND_IMAGE="ecomm-frontend"
VERSION="${1:-latest}"

echo "🐳 Docker Hub Push Script"
echo "=========================="
echo "Username: $DOCKER_USERNAME"
echo "Version: $VERSION"
echo ""

# Check if logged in to Docker Hub
echo "🔐 Checking Docker Hub login..."
if ! docker info | grep -q "Username: $DOCKER_USERNAME"; then
    echo "⚠️  Not logged in to Docker Hub. Logging in..."
    docker login
else
    echo "✅ Already logged in to Docker Hub"
fi

echo ""
echo "🏗️  Building Docker images..."
echo "------------------------------"

# Build Backend
echo "📦 Building backend image..."
docker build -t $DOCKER_USERNAME/$BACKEND_IMAGE:$VERSION .
echo "✅ Backend image built successfully"

# Build Frontend
echo "📦 Building frontend image..."
docker build -t $DOCKER_USERNAME/$FRONTEND_IMAGE:$VERSION ./client
echo "✅ Frontend image built successfully"

# Also tag as 'latest' if a version was specified
if [ "$VERSION" != "latest" ]; then
    echo ""
    echo "🏷️  Tagging images as 'latest'..."
    docker tag $DOCKER_USERNAME/$BACKEND_IMAGE:$VERSION $DOCKER_USERNAME/$BACKEND_IMAGE:latest
    docker tag $DOCKER_USERNAME/$FRONTEND_IMAGE:$VERSION $DOCKER_USERNAME/$FRONTEND_IMAGE:latest
fi

echo ""
echo "🚀 Pushing images to Docker Hub..."
echo "-----------------------------------"

# Push Backend
echo "⬆️  Pushing backend:$VERSION..."
docker push $DOCKER_USERNAME/$BACKEND_IMAGE:$VERSION
echo "✅ Backend pushed successfully"

# Push Frontend
echo "⬆️  Pushing frontend:$VERSION..."
docker push $DOCKER_USERNAME/$FRONTEND_IMAGE:$VERSION
echo "✅ Frontend pushed successfully"

# Push 'latest' tags if version was specified
if [ "$VERSION" != "latest" ]; then
    echo ""
    echo "⬆️  Pushing 'latest' tags..."
    docker push $DOCKER_USERNAME/$BACKEND_IMAGE:latest
    docker push $DOCKER_USERNAME/$FRONTEND_IMAGE:latest
    echo "✅ Latest tags pushed successfully"
fi

echo ""
echo "🎉 All Done!"
echo "============"
echo "Images pushed to Docker Hub:"
echo "  • $DOCKER_USERNAME/$BACKEND_IMAGE:$VERSION"
echo "  • $DOCKER_USERNAME/$FRONTEND_IMAGE:$VERSION"
if [ "$VERSION" != "latest" ]; then
    echo "  • $DOCKER_USERNAME/$BACKEND_IMAGE:latest"
    echo "  • $DOCKER_USERNAME/$FRONTEND_IMAGE:latest"
fi
echo ""
echo "🔗 View on Docker Hub:"
echo "  • https://hub.docker.com/r/$DOCKER_USERNAME/$BACKEND_IMAGE"
echo "  • https://hub.docker.com/r/$DOCKER_USERNAME/$FRONTEND_IMAGE"
