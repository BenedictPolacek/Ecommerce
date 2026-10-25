# Ecommerce Project

Learning project (Codecademy portfolio) built like a real company project.
Backend first, then a frontend (framework not chosen yet), DevOps (CI/CD, Docker, deployment).
it is up to you to show me best practices and ways to create this project as real as possible.

## Working with me
- I am learning. Explain every step in **German**: what you are doing and *why*. Code, comments and commit messages stay in English.
- Introduce real-world industry practices along the way and explain them.
- Ask before big decisions (new libraries, architecture changes, choice of tools).

## Layout
- `Server/` – REST API (Node.js, Express 4, PostgreSQL via `pg`, ES modules)
- (later) `Client/` – frontend

## Git workflow
- `main` is protected: no direct pushes. Every change goes through a pull request and needs the `Server tests` CI check to pass.
- Branch names: `feature/…`, `fix/…`, `docs/…`, `chore/…`. Push the branch, then the user opens/merges the PR on GitHub.
- Commit messages and PR titles: Conventional Commits (`feat(cart): …`, `fix(orders): …`), see `CONTRIBUTING.md`.
- After a merge: `git switch main`, `git pull`, delete the merged branch (local + remote).
- CI: GitHub Actions in `.github/workflows/ci.yml` (Node 20): `Server lint` (ESLint + Prettier check) and `Server tests` jobs in `Server/`; the test job has a Postgres service container and runs migrations first.

## Server commands (run inside `Server/`)
- `npm run dev` – start with nodemon (port from `.env`, default 5000)
- `npm test` – Jest + Supertest; `test:unit` (`tests/unit/`, no DB) / `test:integration` (`tests/integration/`, real DB `ecommerce_db_test` from `.env.test`, tables truncated before each test, helpers in `tests/integration/helpers/`)
- `npm run lint` / `npm run lint:fix` – ESLint (flat config `eslint.config.js`)
- `npm run format` / `npm run format:check` – Prettier (`.prettierrc.json`); CI runs lint + format:check
- `npm run db:migrate` – creates the DB if missing and runs pending migrations (node-pg-migrate, SQL files in `src/db/migrations/`)
- `npm run db:seed` – idempotent sample data (categories, products, admin from `SEED_ADMIN_*`); refuses in production
- `npm run db:rollback` – reverts the last migration; `npm run db:migration:create <name>` – new SQL migration
- Schema changes = new migration file, never edit merged migrations
- API docs: `http://localhost:5000/api/docs` (Swagger)

Setup: local PostgreSQL, copy `.env.example` to `.env`. Never commit `.env`.

## Architecture (Server/src)
Feature modules in `src/modules/<feature>/`, each with the same layers:
`*.routes.js` → `*.controller.js` → `*.service.js` → `*.repository.js` (+ `*.validation.js`)

- **routes**: URL + middleware chain: `authenticate`, `authorize('admin')`, `validateIdParam`, `validate(schema)`
- **controller**: wrapped in `catchAsync`; responds `{ success: true, data }`
- **service**: business logic; throws `new AppError(message, statusCode)`
- **repository**: raw parameterized SQL only (`$1, $2`), never string-concatenate user input
- **validation**: Zod 4 schemas; required fields via `requiredString`/`requiredNumber` from `src/utils/zod.js`, formats via `z.uuid()`/`z.email()`
- New modules must be registered in `src/routes/index.js` and documented in `src/docs/swagger.js`.

Conventions:
- Errors go through `src/middleware/errorHandler.js` → `{ success: false, message, errors? }`. Postgres error codes are mapped there.
- IDs are UUIDs; DB columns are snake_case.
- Auth: JWT in httpOnly cookie `token` or `Authorization: Bearer`. `authorize()` reads the live role from the DB.
- Multi-step writes (register, checkout) use a transaction: `pool.connect()` → `BEGIN`/`COMMIT`/`ROLLBACK`.
- Products are soft-deleted (`is_active = false`).
