#!/bin/sh
set -e
echo "Running prisma db push..."
npx prisma db push
echo "Starting server..."
exec node dist/index.js
