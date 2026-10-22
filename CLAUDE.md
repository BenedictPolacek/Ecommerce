# Ecommerce Project

Learning project (Codecademy portfolio) built like a real company project.
Backend first, then a frontend (framework not chosen yet), later DevOps (CI/CD, Docker, deployment).

## Working with me
- I am learning. Explain every step in **German**: what you are doing and *why*. Code, comments and commit messages stay in English.
- Introduce real-world industry practices along the way and explain them.
- Ask before big decisions (new libraries, architecture changes, choice of tools).

## Layout
- `Server/` – REST API (Node.js, Express 4, PostgreSQL via `pg`, ES modules)
- (later) `Client/` – frontend

## Server commands (run inside `Server/`)
- `npm run dev` – start with nodemon (port from `.env`, default 5000)
- `npm test` – Jest + Supertest (`tests/`)
- `npm run db:migrate` – creates the DB if missing and runs `drawSQL-pgsql-export-2026-08-16.sql`
- API docs: `http://localhost:5000/api/docs` (Swagger)

Setup: local PostgreSQL, copy `.env.example` to `.env`. Never commit `.env`.

## Architecture (Server/src)
Feature modules in `src/modules/<feature>/`, each with the same layers:
`*.routes.js` → `*.controller.js` → `*.service.js` → `*.repository.js` (+ `*.validation.js`)

- **routes**: URL + middleware chain: `authenticate`, `authorize('admin')`, `validateIdParam`, `validate(schema)`
- **controller**: wrapped in `catchAsync`; responds `{ success: true, data }`
- **service**: business logic; throws `new AppError(message, statusCode)`
- **repository**: raw parameterized SQL only (`$1, $2`), never string-concatenate user input
- **validation**: Zod schemas
- New modules must be registered in `src/routes/index.js` and documented in `src/docs/swagger.js`.

Conventions:
- Errors go through `src/middleware/errorHandler.js` → `{ success: false, message, errors? }`. Postgres error codes are mapped there.
- IDs are UUIDs; DB columns are snake_case.
- Auth: JWT in httpOnly cookie `token` or `Authorization: Bearer`. `authorize()` reads the live role from the DB.
- Multi-step writes (register, checkout) use a transaction: `pool.connect()` → `BEGIN`/`COMMIT`/`ROLLBACK`.
- Products are soft-deleted (`is_active = false`).
