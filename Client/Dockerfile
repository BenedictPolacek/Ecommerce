# syntax=docker/dockerfile:1

# Stage 1: build the static files. Node and node_modules stay in this stage only
FROM node:24-alpine AS build

WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .
# Baked into the bundle at build time. Without a DSN (local builds) Sentry stays off
ARG VITE_SENTRY_DSN=
ARG GIT_SHA=dev
# Type checks run in CI; the image only needs the bundle
RUN VITE_GIT_SHA="$GIT_SHA" npx vite build

# Stage 2: Caddy serves dist/ and forwards /api to the API container (same origin for the
# sameSite=strict cookies). The final image contains no Node.js and no source code.
FROM caddy:2-alpine

COPY Caddyfile /etc/caddy/Caddyfile
COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
COPY --from=build /app/dist /srv

# The commit of this image: the deployment checks /version.txt
ARG GIT_SHA=dev
RUN echo "$GIT_SHA" > /srv/version.txt

# Unprivileged user; it only needs to write Caddy's own state directories
RUN addgroup -S web && adduser -S -G web web && chown -R web:web /data /config
USER web

EXPOSE 8080

# Wakes the API in the background, then runs Caddy as PID 1 (gets SIGTERM directly)
CMD ["docker-entrypoint.sh"]
