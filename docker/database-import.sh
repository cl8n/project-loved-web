#!/bin/sh

set -eu

if test $# -gt 1; then
  printf 'Usage: \033[4m%s\033[m [<export URL>]\n' "$(basename "$0")" >&2
  exit 1
fi

curl "${1:-https://archive.loved.sh/latest-project_loved.sql.gz}" \
  | gunzip | mysql -u project_loved project_loved
