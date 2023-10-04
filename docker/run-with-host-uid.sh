#!/bin/sh

set -eu

host_uid="$(stat -c '%u' "$DOCKER_HOST_UID_SOURCE_DIR")"
host_gid="$(stat -c '%g' "$DOCKER_HOST_UID_SOURCE_DIR")"

# If the host UID is root, just run the command. We are already root
if test "$host_uid" -eq 0; then
	exec "$@"
fi

# If the host UID exists in the image, run gosu with that user
if id "$host_uid" >/dev/null 2>&1; then
	exec gosu "$host_uid" "$@"
fi

# Otherwise, make a new user with the host UID and GID
groupadd -og "$host_gid" project-loved
useradd -g "$host_gid" -u "$host_uid" project-loved
exec gosu project-loved "$@"
