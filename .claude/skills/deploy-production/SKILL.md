---
name: deploy-production
description: Commit, push and deploy the ecomm app (backend + web frontend) to production at chardeevari.in. Use when asked to ship, release, push to production or deploy on the server ("dio").
---

# Deploy to production (chardeevari.in)

## How production works
- Server: `root@143.110.181.250` (shell alias `dio`). No git checkout there.
- `/root/ecomm/docker-compose.yml` runs `ayushmishra9/ecomm-backend:latest`,
  `ayushmishra9/ecomm-frontend:latest`, `mongo:7`, `minio`. Secrets live in `/root/ecomm/.env`.
- `/root/ecomm/deploy.sh` pulls the `latest` images, runs `docker compose up -d`, waits for
  `127.0.0.1:5000/api/settings/public` to return 200 and checks the port mapping.
  Never use `docker run`/`docker start` directly — it drops the port mapping and `.env`.
- So a deploy = build images locally → push to Docker Hub → run `deploy.sh` on the server.
- The mobile app is NOT part of this; it ships through EAS/expo-updates.

## Steps
1. **Test** what you changed: `npm test -- tests/<area>.test.js` (backend) and
   `cd client && CI=false npx react-scripts build` (frontend compiles).
2. **Commit only the intended files.** The working tree often has unrelated WIP:
   `git status`, then `git add <files>` explicitly (never `git add -A`). For a file with mixed
   changes, stage only your hunks. Many files use CRLF line endings — keep them.
3. **Push** the current branch: `git push origin <branch>` (production is built from whatever
   commit you deploy; it is currently `redesign/chardeevari-ui`).
4. **Deploy**: `scripts/deploy-production.sh` (add `--no-prerender` when no public/SEO page
   changed — much faster frontend build). The script:
   - refuses if HEAD isn't pushed or Docker Hub login (`ayushmishra9`) is missing;
   - builds both images from a clean `git worktree` of HEAD (uncommitted files are excluded;
     `client/.env*` are copied in because CRA bakes them in at build time);
   - tags `YYYYMMDD-<sha>` and `latest`, pushes both, runs `ssh dio /root/ecomm/deploy.sh`,
     then checks `https://chardeevari.in/api/settings/public`.
5. **Verify** the changed feature on https://chardeevari.in (log in as admin, exercise it).
   Logs: `ssh dio 'cd /root/ecomm && docker compose logs --tail=100 backend'`.

## Rollback
Every deploy leaves a dated tag on Docker Hub. Re-point `latest` to the previous tag on the server:
```bash
ssh dio
docker pull ayushmishra9/ecomm-backend:<old-tag>
docker tag ayushmishra9/ecomm-backend:<old-tag> ayushmishra9/ecomm-backend:latest
# same for ecomm-frontend if needed
cd /root/ecomm && docker compose up -d
```
Do not run `./deploy.sh` after that — it would pull the newer `latest` from Docker Hub again.

## Gotchas
- `docker-push.sh` / `docker-push-parallel.sh` (repo root) build from the working tree and
  would ship uncommitted WIP; prefer `scripts/deploy-production.sh`.
- Schema changes need no migration step (Mongoose), but data fixes do — run them against the
  server Mongo deliberately, never as a side effect of deploy.
- The backend container shows `unhealthy` because its HEALTHCHECK calls `localhost:5000`,
  which resolves to IPv6 `::1` while the server listens on IPv4. The site still works;
  trust `deploy.sh`'s check instead.
