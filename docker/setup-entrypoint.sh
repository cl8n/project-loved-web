#!/bin/sh

set -eu

cd /app/bridge
npm install
npm run build-no-lint

cd /app/client
npm install

cd /app/server
npm install
if test ! -f .env; then
  cp .env.example .env
fi
