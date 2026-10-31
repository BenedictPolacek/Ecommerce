# Ecommerce

![CI](https://github.com/BenedictPolacek/Ecommerce/actions/workflows/ci.yml/badge.svg)

Full-stack ecommerce portfolio project, built step by step like a real company project.

## Tech stack

- **Backend:** Node.js, Express, PostgreSQL (`pg`), Zod, JWT auth
- **Frontend:** React, Vite, TypeScript, Tailwind CSS, shadcn/ui
- **Testing:** Jest, Supertest (server); Vitest, React Testing Library (client)
- **CI:** GitHub Actions
- **Local dev:** Docker Compose (PostgreSQL, Mailpit for emails)

## Features (API)

- Registration and login with short-lived access tokens and rotating refresh tokens (httpOnly cookies), session management
- Email verification, password reset and password change (emails via Nodemailer)
- Products and categories (admin-managed)
- Shopping cart and checkout
- Orders and addresses
- GDPR account deletion (anonymization when orders must be kept)
- Interactive API docs via Swagger

## Project structure

| Folder | Description |
| --- | --- |
| [`Server/`](Server/) | REST API ([details](Server/README.md)) |
| [`Client/`](Client/) | React single-page app (in progress) |

## Getting started

Requirements: Node.js 24 (see [`.nvmrc`](.nvmrc), run `nvm use`), Docker (or a local PostgreSQL instance).

```bash
docker compose up -d   # starts PostgreSQL on localhost:5433 and Mailpit
cd Server
cp .env.example .env   # then adjust the values
npm install
npm run db:migrate     # creates the database and runs all pending migrations
npm run db:seed        # optional: sample categories, products and an admin user
npm run dev            # starts the API on http://localhost:5000
```

API docs: http://localhost:5000/api/docs

Frontend (in a second terminal, the API must be running):

```bash
cd Client
npm install
npm run dev            # starts the shop on http://localhost:3000
```

The client calls the API through the same origin (`/api`): Vite proxies `/api` to `http://localhost:5000` (override with `VITE_API_PROXY_TARGET`). This keeps the `sameSite=strict` auth cookies working. Port 3000 matches `APP_URL` in `Server/.env`, so email links open the frontend.

Emails (verification, password reset) are caught by Mailpit: http://localhost:8025. Nothing is sent to real inboxes.

Without Docker: point `PGPORT` in `Server/.env` to your local PostgreSQL (usually `5432`).

Useful Docker commands:

```bash
docker compose ps        # status (should show "healthy")
docker compose logs db   # database logs
docker compose down      # stop (data is kept in the volume)
docker compose down -v   # stop and delete all data
```

## Database migrations

Schema changes are versioned SQL files in [`Server/src/db/migrations/`](Server/src/db/migrations/), managed with [node-pg-migrate](https://salsita.github.io/node-pg-migrate/). Applied migrations are tracked in the `pgmigrations` table.

```bash
npm run db:migration:create add-wishlist   # new file with "-- Up Migration" / "-- Down Migration"
npm run db:migrate                         # apply all pending migrations
npm run db:rollback                        # revert the last migration (db:rollback -- 3 for three)
```

Rules: never edit a migration that is already merged; write a new one instead. Every migration needs a working down section.

## Seed data

`npm run db:seed` fills the database with sample categories, products and an admin user (data in [`Server/src/db/seeders/data.js`](Server/src/db/seeders/data.js)). Admin login: `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.env` (default `admin@example.com` / `admin12345`).

- Idempotent: existing rows (same slug, SKU or email) are skipped, so it is safe to run again.
- Refuses to run when `NODE_ENV=production`.
- Start from scratch: `docker compose down -v`, then `db:migrate` and `db:seed`.

## Running tests

```bash
cd Server
npm test                  # all tests (needs the database from docker compose)
npm run test:unit         # only tests without a database
npm run test:integration  # only tests against the database
```

- `tests/unit/` – no database needed.
- `tests/integration/` – real HTTP requests against a real PostgreSQL. They use a separate database `ecommerce_db_test` (set in [`Server/.env.test`](Server/.env.test)), which is created and migrated automatically. All tables are emptied before each test, so the setup refuses to run unless the database name ends with `_test`.

Client:

```bash
cd Client
npm test                  # Vitest + React Testing Library (jsdom, no browser needed)
npm run test:watch        # re-run on file changes
npm run lint              # ESLint
npm run typecheck         # TypeScript
```

Tests also run automatically on every push and pull request via GitHub Actions (server tests with a PostgreSQL service container).
