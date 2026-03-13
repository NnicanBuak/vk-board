#!/bin/bash
# Zero-downtime deploy using docker compose + nginx graceful reload
# Usage: ./scripts/deploy.sh [IMAGE_TAG]
#   IMAGE_TAG defaults to "latest"
set -euo pipefail

IMAGE_TAG="${1:-latest}"
COMPOSE="docker compose -f docker-compose.prod.yml"

echo "==> Deploying tag: $IMAGE_TAG"

# Pull new images
export IMAGE_TAG
$COMPOSE pull backend frontend

# Rolling restart backend:
# Docker sends SIGTERM → backend drains existing connections (stop_grace_period: 30s)
# nginx proxy_next_upstream retries during the brief gap
$COMPOSE up -d --no-deps backend
echo "==> Waiting for backend to be healthy..."
for i in $(seq 1 30); do
  if $COMPOSE exec -T backend curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "==> Backend healthy"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "ERROR: Backend did not become healthy in time"
    exit 1
  fi
  sleep 2
done

# Update frontend and reload nginx gracefully (no connection drop)
$COMPOSE up -d --no-deps frontend
$COMPOSE exec -T frontend nginx -s reload 2>/dev/null || true

echo "==> Deploy complete: tag=$IMAGE_TAG"
