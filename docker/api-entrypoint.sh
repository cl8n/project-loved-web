#!/bin/sh

while true; do
  if nc -z database 3306; then
    break;
  fi

  sleep 1
done

nodemon -w package.json -x 'npm install' & \
nodemon ./index.js
