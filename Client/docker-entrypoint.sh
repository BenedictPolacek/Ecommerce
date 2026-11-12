#!/bin/sh
# Starts Caddy and, in the background, wakes the API. On Render's free plan both services
# sleep and wake up separately: without this, the API would only start once the first /api
# request reaches it, after the web service itself has woken up (twice the waiting time).
set -eu

upstream="${API_UPSTREAM:-api:5000}"
case "$upstream" in
  http://* | https://*) ;;
  *) upstream="http://$upstream" ;;
esac

wake_api() {
  for _ in 1 2 3 4 5 6; do
    if wget -q -O /dev/null -T 30 "$upstream/api/health"; then
      echo "API is awake"
      return 0
    fi
    sleep 10
  done
  echo "Could not reach the API at $upstream; it wakes up with the first /api request"
}

wake_api &

exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
