#!/bin/bash
set -e

echo "==> Pulling latest code..."
git pull origin master

echo "==> Building and restarting containers..."
docker compose -f docker-compose.prod.yml --env-file .env.production down
docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

echo "==> Waiting for services to start..."
sleep 5

echo "==> Container status:"
docker compose -f docker-compose.prod.yml ps

echo "==> Done! App is running."
