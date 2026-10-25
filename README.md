# Ecommerce

![CI](https://github.com/BenedictPolacek/Ecommerce/actions/workflows/ci.yml/badge.svg)

Full-stack ecommerce portfolio project, built step by step like a real company project.

## Tech stack

- **Backend:** Node.js, Express, PostgreSQL (`pg`), Zod, JWT auth
- **Testing:** Jest, Supertest
- **CI:** GitHub Actions
- **Local dev:** Docker Compose (PostgreSQL)
- **Frontend:** coming soon

## Features (API)

- User registration and login (JWT in httpOnly cookie)
- Products and categories (admin-managed)
- Shopping cart and checkout
- Orders and addresses
- Interactive API docs via Swagger

## Project structure

| Folder | Description |
| --- | --- |
| [`Server/`](Server/) | REST API ([details](Server/README.md)) |
| `Client/` | Frontend (planned) |

## Getting started

Requirements: Node.js 24 (see [`.nvmrc`](.nvmrc), run `nvm use`), Docker (or a local PostgreSQL instance).

```bash
docker compose up -d   # starts PostgreSQL on localhost:5433
cd Server
cp .env.example .env   # then adjust the values
npm install
npm run db:migrate     # creates the database and runs all pending migrations
npm run dev            # starts the API on http://localhost:5000
```

API docs: http://localhost:5000/api/docs

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

## Running tests

```bash
cd Server
npm test                  # all tests (needs the database from docker compose)
npm run test:unit         # only tests without a database
npm run test:integration  # only tests against the database
```

- `tests/unit/` – no database needed.
- `tests/integration/` – real HTTP requests against a real PostgreSQL. They use a separate database `ecommerce_db_test` (set in [`Server/.env.test`](Server/.env.test)), which is created and migrated automatically. All tables are emptied before each test, so the setup refuses to run unless the database name ends with `_test`.

Tests also run automatically on every push and pull request via GitHub Actions, with a PostgreSQL service container.
