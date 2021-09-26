#!/bin/sh

while true; do
  if nc -z database 3306; then
    break;
  fi

  sleep 1
done

exec npm run start
