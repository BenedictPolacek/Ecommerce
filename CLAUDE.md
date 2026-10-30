# Ecommerce Project

Learning project (Codecademy portfolio) built like a real company project.
Backend first, then a frontend (framework not chosen yet), DevOps (CI/CD, Docker, deployment).
it is up to you to show me best practices and ways to create this project as real as possible.

## Working with me
- I am learning. Explain every step in **German**: what you are doing and *why*. Code, comments and commit messages stay in English.
- Introduce real-world industry practices along the way and explain them.
- Ask before big decisions (new libraries, architecture changes, choice of tools).

## Layout
- `Server/` – REST API (Node.js, Express 5, PostgreSQL via `pg`, ES modules)
- (later) `Client/` – frontend

## Git workflow
- `main` is protected: no direct pushes. Every change goes through a pull request and needs the `Server tests` CI check to pass.
- Branch names: `feature/…`, `fix/…`, `docs/…`, `chore/…`. Push the branch, then the user opens/merges the PR on GitHub.
- Commit messages and PR titles: Conventional Commits (`feat(cart): …`, `fix(orders): …`), see `CONTRIBUTING.md`.
- After a merge: `git switch main`, `git pull`, delete the merged branch (local + remote).
- CI: GitHub Actions in `.github/workflows/ci.yml` (Node version from `.nvmrc`): `Server lint` (ESLint + Prettier check) and `Server tests` jobs in `Server/`; the test job has a Postgres service container and runs migrations first.

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
- Auth: short-lived access JWT (cookie `token` or `Authorization: Bearer`, carries session id `sid`; `authenticate` checks the session is active) + rotating single-use refresh token (cookie `refresh_token` on `/api/auth` or body; only its SHA-256 hash is stored, reuse revokes the session). `authorize()` reads the live role from the DB.
- Email links (verification 24 h, password reset 1 h): single-use tokens in `user_tokens` (hash only), sent via `src/mail/` (Nodemailer; locally Mailpit from docker-compose, http://localhost:8025; under Jest collected in `outbox`). Links point to the frontend (`APP_URL`), which posts the token to the API. Checkout requires `email_verified_at` (`requireVerifiedEmail`). `createUser()` in tests verifies by default.
- Security: CORS only for `CORS_ORIGINS` (default `APP_URL`). Rate limiting per IP in `src/middleware/rateLimit.js` (`apiLimiter` on `/api`, strict `authLimiter` on login/register/email-link routes; off in `.env.test`). Behind a proxy set `TRUST_PROXY`.
- Multi-step writes (register, checkout) use a transaction: `pool.connect()` → `BEGIN`/`COMMIT`/`ROLLBACK`.
- Products are soft-deleted (`is_active = false`).
- Users (GDPR): really deleted without orders/audit rows, otherwise anonymized (`deleted_at`, fake email, CHECK `chk_users_deleted_anonymized`); `userRepository.findById`/`findByEmail` never return deleted users.
