#!/bin/sh

for migration in /migrations/*; do
  mysql -u project_loved project_loved < "$migration"
done
