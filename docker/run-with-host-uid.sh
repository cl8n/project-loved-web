#!/bin/sh

set -eu

user_name=project-loved

groupadd -f "$user_name" >/dev/null
id "$user_name" >/dev/null 2>&1 || useradd -g "$user_name" "$user_name" >/dev/null

uid="$(stat -c '%u' "$DOCKER_HOST_UID_SOURCE_DIR")"
gid="$(stat -c '%g' "$DOCKER_HOST_UID_SOURCE_DIR")"

if test "$uid" -ne 0; then
	usermod -ou "$uid" "$user_name" >/dev/null
	groupmod -og "$gid" "$user_name" >/dev/null
fi

exec gosu "$user_name" "$@"
