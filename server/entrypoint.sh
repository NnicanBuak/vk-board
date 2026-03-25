#!/bin/sh
set -e
echo "Normalizing legacy board role values..."
node prisma/normalize-board-role-enum.mjs
echo "Running prisma db push..."
npx prisma db push --accept-data-loss
echo "Starting server..."
exec npm run dev
