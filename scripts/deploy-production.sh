#!/bin/bash
# Build the committed HEAD into Docker images, push them to Docker Hub and
# redeploy https://chardeevari.in. See .claude/skills/deploy-production/SKILL.md.
#
# Usage: scripts/deploy-production.sh [--no-prerender]
#   --no-prerender  skip react-snap SEO prerendering (faster; only for changes
#                   that don't touch public/SEO pages, e.g. admin-only work)
#
# Images are built from a clean `git worktree` of HEAD, so uncommitted or
# untracked files in your checkout never reach production.
set -euo pipefail

SERVER="root@143.110.181.250"   # same host as the `dio` shell alias
DOCKER_USERNAME="ayushmishra9"
SITE="https://chardeevari.in"
PRERENDER=true
[ "${1:-}" = "--no-prerender" ] && PRERENDER=false

REPO="$(git rev-parse --show-toplevel)"
cd "$REPO"
BRANCH="$(git branch --show-current)"
SHA="$(git rev-parse --short HEAD)"
TAG="$(date +%Y%m%d)-$SHA"

echo "==> [1/5] Checking HEAD $SHA on $BRANCH is pushed"
git fetch -q origin "$BRANCH"
if [ "$(git rev-parse HEAD)" != "$(git rev-parse "origin/$BRANCH")" ]; then
  echo "!! HEAD differs from origin/$BRANCH. Commit and 'git push' first." >&2
  exit 1
fi
if ! docker info 2>/dev/null | grep -q "Username: $DOCKER_USERNAME"; then
  echo "!! Not logged in to Docker Hub as $DOCKER_USERNAME. Run: docker login" >&2
  exit 1
fi

WORKTREE="$(mktemp -d /tmp/ecomm-deploy-XXXXXX)"
cleanup() { git -C "$REPO" worktree remove --force "$WORKTREE" 2>/dev/null || true; }
trap cleanup EXIT
git worktree add -q --detach "$WORKTREE" HEAD
# CRA reads client/.env* at build time; they are gitignored, so copy them in.
for f in client/.env client/.env.production; do
  [ -f "$f" ] && cp "$f" "$WORKTREE/$f"
done

echo "==> [2/5] Building images $TAG (prerender=$PRERENDER)"
docker build -q -t "$DOCKER_USERNAME/ecomm-backend:$TAG" "$WORKTREE" > /tmp/build-backend.log 2>&1 &
B=$!
docker build -q --build-arg PRERENDER="$PRERENDER" -t "$DOCKER_USERNAME/ecomm-frontend:$TAG" "$WORKTREE/client" > /tmp/build-frontend.log 2>&1 &
F=$!
wait $B || { echo "!! Backend build failed:"; cat /tmp/build-backend.log; exit 1; }
wait $F || { echo "!! Frontend build failed:"; cat /tmp/build-frontend.log; exit 1; }

echo "==> [3/5] Pushing $TAG and latest"
for img in ecomm-backend ecomm-frontend; do
  docker tag "$DOCKER_USERNAME/$img:$TAG" "$DOCKER_USERNAME/$img:latest"
  docker push -q "$DOCKER_USERNAME/$img:$TAG"
  docker push -q "$DOCKER_USERNAME/$img:latest"
done

echo "==> [4/5] Deploying on server (/root/ecomm/deploy.sh)"
ssh "$SERVER" 'cd /root/ecomm && ./deploy.sh'

echo "==> [5/5] Smoke check"
code=$(curl -s -o /dev/null -w '%{http_code}' "$SITE/api/settings/public")
echo "    $SITE/api/settings/public -> HTTP $code"
[ "$code" = "200" ] || { echo "!! Site check failed" >&2; exit 1; }

echo "Deployed $SHA as image tag $TAG."
echo "Rollback: see .claude/skills/deploy-production/SKILL.md (re-point latest to an older tag)."
