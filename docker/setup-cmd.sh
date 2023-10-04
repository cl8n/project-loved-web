#!/bin/sh

set -eu

if test ! -d /app/bridge/node_modules; then
	cd /app/bridge
	npm install
	npm run build-no-lint
fi

if test ! -d /app/client/node_modules; then
	cd /app/client
	npm install
	npm run extract-translations
	npm run compile-translations
fi

if test ! -d /app/server/node_modules; then
	cd /app/server
	npm install
fi

cp -n /app/.env.example /app/.env
cp -n /app/server/.env.example /app/server/.env
