#!/bin/bash

# Docker Hub Push Script — Parallel build & push
# Usage: ./docker-push-parallel.sh [version]
# Example: ./docker-push-parallel.sh v1.0.0
# If no version is provided, it will use 'latest'

set -e

DOCKER_USERNAME="ayushmishra9"
BACKEND_IMAGE="ecomm-backend"
FRONTEND_IMAGE="ecomm-frontend"
VERSION="${1:-latest}"

echo "🐳 Docker Hub Push Script (Parallel)"
echo "======================================"
echo "Username: $DOCKER_USERNAME"
echo "Version:  $VERSION"
echo ""

# Check Docker Hub login
echo "🔐 Checking Docker Hub login..."
if ! docker info | grep -q "Username: $DOCKER_USERNAME"; then
    echo "⚠️  Not logged in. Logging in..."
    docker login
else
    echo "✅ Already logged in"
fi

echo ""
echo "🏗️  Building backend and frontend in parallel..."
echo "-------------------------------------------------"

# Build both in parallel, stream logs to separate files
docker build -t $DOCKER_USERNAME/$BACKEND_IMAGE:$VERSION . \
    > /tmp/build-backend.log 2>&1 &
BACKEND_BUILD_PID=$!

docker build -t $DOCKER_USERNAME/$FRONTEND_IMAGE:$VERSION ./client \
    > /tmp/build-frontend.log 2>&1 &
FRONTEND_BUILD_PID=$!

echo "  Backend  build PID: $BACKEND_BUILD_PID"
echo "  Frontend build PID: $FRONTEND_BUILD_PID"
echo ""

# Wait for backend build
echo "⏳ Waiting for builds to complete..."
if wait $BACKEND_BUILD_PID; then
    echo "✅ Backend build done"
else
    echo "❌ Backend build FAILED. Log:"
    cat /tmp/build-backend.log
    kill $FRONTEND_BUILD_PID 2>/dev/null || true
    exit 1
fi

if wait $FRONTEND_BUILD_PID; then
    echo "✅ Frontend build done"
else
    echo "❌ Frontend build FAILED. Log:"
    cat /tmp/build-frontend.log
    exit 1
fi

# Tag as 'latest' if a version was specified
if [ "$VERSION" != "latest" ]; then
    echo ""
    echo "🏷️  Tagging images as 'latest'..."
    docker tag $DOCKER_USERNAME/$BACKEND_IMAGE:$VERSION  $DOCKER_USERNAME/$BACKEND_IMAGE:latest
    docker tag $DOCKER_USERNAME/$FRONTEND_IMAGE:$VERSION $DOCKER_USERNAME/$FRONTEND_IMAGE:latest
fi

echo ""
echo "🚀 Pushing backend and frontend in parallel..."
echo "-----------------------------------------------"

docker push $DOCKER_USERNAME/$BACKEND_IMAGE:$VERSION \
    > /tmp/push-backend.log 2>&1 &
BACKEND_PUSH_PID=$!

docker push $DOCKER_USERNAME/$FRONTEND_IMAGE:$VERSION \
    > /tmp/push-frontend.log 2>&1 &
FRONTEND_PUSH_PID=$!

echo "  Backend  push PID: $BACKEND_PUSH_PID"
echo "  Frontend push PID: $FRONTEND_PUSH_PID"
echo ""

echo "⏳ Waiting for pushes to complete..."
if wait $BACKEND_PUSH_PID; then
    echo "✅ Backend pushed"
else
    echo "❌ Backend push FAILED. Log:"
    cat /tmp/push-backend.log
    kill $FRONTEND_PUSH_PID 2>/dev/null || true
    exit 1
fi

if wait $FRONTEND_PUSH_PID; then
    echo "✅ Frontend pushed"
else
    echo "❌ Frontend push FAILED. Log:"
    cat /tmp/push-frontend.log
    exit 1
fi

# Push 'latest' tags in parallel if version was specified
if [ "$VERSION" != "latest" ]; then
    echo ""
    echo "⬆️  Pushing 'latest' tags in parallel..."
    docker push $DOCKER_USERNAME/$BACKEND_IMAGE:latest  > /tmp/push-backend-latest.log 2>&1 &
    docker push $DOCKER_USERNAME/$FRONTEND_IMAGE:latest > /tmp/push-frontend-latest.log 2>&1 &
    wait
    echo "✅ Latest tags pushed"
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
echo "🚀 To deploy on server:"
echo "  ssh root@143.110.181.250"
echo "  cd /root/ecomm && ./deploy.sh"
