#!/bin/sh

set -eu

usage() {
  printf 'Usage: \033[4m%s\033[m <target>\n\n' "$(basename "$0")" >&2
  cat >&2 <<-EOF
		Targets:
		  all
		  bridge
		  client [no-deps]
		  publish [maintenance]
		  server [no-deps]
	EOF
  exit 1
}

test $# -lt 1 && usage

keep_maintenance=
mode="$1"
no_deps=
shift

for argument in "$@"; do
  case "$argument" in
    maintenance)
      keep_maintenance=1
      ;;
    no-deps)
      no_deps=1
      ;;
    *)
      usage
      ;;
  esac
done

dirname="$(dirname "$0")"

case "$mode" in
  publish)
    if test ! -f "$dirname/build-env"; then
      cat >"$dirname/build-env" <<-EOF
				#!/bin/sh

				# Command to restart the API server
				REMOTE_API_RESTART=''

				# Command to stop the API server
				REMOTE_API_STOP=''

				# Hostname for SSH/rsync
				REMOTE_HOSTNAME=''

				# Directory containing "bridge" and "server"
				REMOTE_LOVED_DIRECTORY=''

				# Directory containing client index.html
				REMOTE_LOVED_DIRECTORY_WWW=''

				# Command to set maintenance mode, appended with an "on" or "off" argument
				REMOTE_SET_MAINTENANCE=''
			EOF
      printf 'Configure build environment in the "build-env" file first\n' >&2
      exit 1
    fi

    . "$dirname/build-env"
    "$0" all
    ssh "$REMOTE_HOSTNAME" "$REMOTE_SET_MAINTENANCE on"
    rsync -aP --del --no-group --no-owner \
      "$dirname/bridge/build" \
      "$dirname/bridge/package.json" \
      "$dirname/bridge/package-lock.json" \
      "$REMOTE_HOSTNAME:$REMOTE_LOVED_DIRECTORY/bridge"
    rsync -aP --del --no-group --no-owner \
      "$dirname/client/build/" \
      "$REMOTE_HOSTNAME:$REMOTE_LOVED_DIRECTORY_WWW"
    rsync -aP --del --no-group --no-owner \
      "$dirname/server/build" \
      "$dirname/server/migrations" \
      "$dirname/server/package.json" \
      "$dirname/server/package-lock.json" \
      "$REMOTE_HOSTNAME:$REMOTE_LOVED_DIRECTORY/server"
    ssh "$REMOTE_HOSTNAME" "cd $REMOTE_LOVED_DIRECTORY/server && rm -rf node_modules/loved-bridge && npm i --omit dev"

    if test "$keep_maintenance"; then
      ssh "$REMOTE_HOSTNAME" "$REMOTE_API_STOP"
    else
      ssh "$REMOTE_HOSTNAME" "$REMOTE_API_RESTART && $REMOTE_SET_MAINTENANCE off"
    fi
    ;;
  all)
    "$0" bridge
    "$0" client no-deps
    "$0" server no-deps
    ;;
  bridge)
    rm -rf "$dirname/client/node_modules/loved-bridge" "$dirname/server/node_modules/loved-bridge"
    cd "$dirname/bridge"
    npm install
    npm run build
    ;;
  client)
    test "$no_deps" || "$0" bridge
    cd "$dirname/client"
    npm install
    npm run build
    ;;
  server)
    test "$no_deps" || "$0" bridge
    cd "$dirname/server"
    npm install
    npm run build
    ;;
  *)
    usage
    ;;
esac
