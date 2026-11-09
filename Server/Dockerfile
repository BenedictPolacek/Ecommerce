# syntax=docker/dockerfile:1

# API image: Node.js + production dependencies + src/. Same Node major version as .nvmrc
FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production

# Dependencies first: this layer stays cached until package*.json changes
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src

# The commit of this image: GET /api/health reports it, the deployment checks it
ARG GIT_SHA=dev
ENV GIT_SHA=$GIT_SHA

# The files belong to root and the app runs as the unprivileged "node" user:
# a compromised process can neither change the code nor act as root
USER node

EXPOSE 5000

# Docker marks the container healthy only while the database answers too (readiness)
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 5000) + '/api/health/ready').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"

# Pending migrations run before the server starts (node-pg-migrate locks the table, so parallel
# starts wait for each other). "exec" makes node PID 1, so it receives SIGTERM directly and
# shuts down gracefully; behind "npm start" the signal would not reach it.
CMD ["sh", "-c", "node src/db/migrate.js up && exec node src/server.js"]
