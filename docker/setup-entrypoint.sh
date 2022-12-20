#!/bin/sh

set -eu

cd /app/bridge
npm install
npm run build-no-lint

cd /app/client
rm -rf node_modules/loved-bridge
npm install

cd /app/server
rm -rf node_modules/loved-bridge
npm install
if test ! -f .env; then
  cp .env.example .env
fi
