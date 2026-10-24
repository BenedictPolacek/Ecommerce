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

Requirements: Node.js 20+, Docker (or a local PostgreSQL instance).

```bash
docker compose up -d   # starts PostgreSQL on localhost:5433
cd Server
cp .env.example .env   # then adjust the values
npm install
npm run db:migrate     # creates the database and tables
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

## Running tests

```bash
cd Server
npm test
```

Tests also run automatically on every push and pull request via GitHub Actions.
