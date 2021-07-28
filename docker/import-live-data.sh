#!/bin/sh

if [ "$#" -gt 1 ]; then
  echo "Usage: $0 [export URL]" >&2
  exit 1
fi

curl "${1:-https://loved.sh/exports/latest-project_loved.sql.gz}" \
  | gunzip | mysql -u project_loved project_loved
