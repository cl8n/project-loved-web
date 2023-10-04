#!/bin/sh

set -eu

cd /app/bridge
npm install
npm run build-no-lint

cd /app/client
npm install

cd /app/server
npm install

cp -n /app/.env.example /app/.env
cp -n /app/server/.env.example /app/server/.env
