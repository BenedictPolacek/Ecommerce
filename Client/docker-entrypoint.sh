#!/bin/sh
# Works out where /wake-api redirects to, then runs Caddy as PID 1 (gets SIGTERM directly).
#
# On Render's free plan the API sleeps, and only requests from the internet wake it: requests
# from another Render service (our /api proxy, or a wget from here) get an immediate 502.
# So the browser wakes it: the client loads /wake-api, which redirects to the API's public URL.
set -eu

case "${API_UPSTREAM:-}" in
  # Public URL (Render): the browser calls the API directly
  http://* | https://*) API_WAKE_URL="${API_UPSTREAM%/}/api/health" ;;
  # Host name inside docker compose: unreachable for the browser, and nothing sleeps there
  *) API_WAKE_URL="/api/health" ;;
esac
export API_WAKE_URL

exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
