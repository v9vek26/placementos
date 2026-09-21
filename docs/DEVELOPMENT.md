# Local development

## Prerequisites

- Node.js compatible with the committed NestJS/Next.js dependencies.
- pnpm 12.4.2, as pinned in the root package manifest. A different locally installed pnpm version is not evidence that this lockfile has been verified.
- Docker Compose for the supplied PostgreSQL 17 service, or your own local PostgreSQL instance.

## Setup

From the repository root:

```sh
pnpm install --frozen-lockfile
docker compose up -d postgres
```

Copy `apps/api/.env.example` to `apps/api/.env`. Set `DATABASE_URL` for your local database. The Compose username, password, and database name are development-only defaults visible in `docker-compose.yml`; they are not production secrets. Never reuse them for hosted data. The supplied Compose port mapping is not restricted to loopback; run only on a trusted development machine with appropriate network controls.

Run the Prisma commands from the API directory. The custom config filename must be supplied explicitly:

```sh
cd apps/api
pnpm exec prisma generate --config prisma7.config.ts
pnpm exec prisma migrate deploy --config prisma7.config.ts
pnpm run start:dev
```

In another terminal, from the repository root:

```sh
pnpm --filter web dev
```

The web app is a starter screen, not an API client. `GET http://localhost:4000/` queries the database and returns a status object and user count; it is not a database-independent liveness check.

## Checks

```sh
pnpm --filter api build
pnpm --filter api lint
pnpm --filter api test
pnpm --filter api test:e2e
pnpm --filter web lint
pnpm --filter web build
```

The root `test` script is a placeholder that intentionally exits with an error. Existing API tests contain scaffold assumptions: some lack Prisma dependency providers, and the end-to-end root test expects `Hello World!` although the controller now returns database status. Treat these as known maintenance work, not a passing test suite.

Use a disposable local database for integration testing. Do not run destructive API requests against a deployed database. Dependency installation, migrations, API startup and end-to-end workflows were not executed during the documentation audit on 2026-09-21.

## Troubleshooting

- Missing generated client: run Prisma generation before the API build.
- Missing `DATABASE_URL`: check `apps/api/.env` and run API/Prisma commands from `apps/api`.
- Database connection failure: check that PostgreSQL is running and the URI matches its credentials and port.
- Migration failure: inspect the error and existing schema; do not reset a database containing data to bypass it.
- Web/API calls: CORS and an authenticated frontend integration are not configured in the current bootstrap.
