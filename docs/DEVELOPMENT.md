# Local development

## Prerequisites

- Node.js compatible with Next.js/NestJS; the verification run used Node 24.20.0.
- pnpm is required. The existing manifest pins 12.4.2; this machine actually ran pnpm 11.19.0 successfully. No package-manager migration or dependency upgrade was performed in this MVP change.
- PostgreSQL, already running locally for the verification. The supplied Docker Compose service is an option for a new local setup.

## Initial setup

```sh
pnpm install --frozen-lockfile
docker compose up -d postgres
```

Configure `apps/api/.env` using the existing example as a starting point:

- `DATABASE_URL`: your PostgreSQL connection string.
- `JWT_SECRET`: a strong random signing secret, kept only in the ignored local environment or deployment secret manager.
- `PORT`: optional; defaults to 4000.
- `CORS_ORIGINS`: optional comma-separated exact frontend origins; defaults to `http://localhost:3000`.

For a different API address, put `NEXT_PUBLIC_API_URL` in `apps/web/.env.local`. It defaults to `http://localhost:4000`; it is a public address, never a secret. Rebuild the web app when changing it for production.

From `apps/api`:

```sh
pnpm exec prisma generate --config prisma7.config.ts
pnpm exec prisma migrate deploy --config prisma7.config.ts
```

Do not run reset, force-push schema, truncate, or seed commands on a database containing existing records. Inspect migration errors before proceeding. Fresh-database migration was not part of the 2026-09-24 verification.

## Start

From the repository root, in separate terminals:

```sh
pnpm dev:api
pnpm dev:web
```

API: `http://localhost:4000`. Website: `http://localhost:3000`.

Production build/start commands (hosting and TLS setup are separate):

```sh
pnpm build
pnpm --filter api start:prod
pnpm --filter web start
```

## Accounts and onboarding

Registration creates a STUDENT account only. Use the existing administrator account locally; credentials are intentionally omitted from documentation. A new deployment needs an administrator provisioned by its operator through a trusted administrative process.

For a recruiter: register an account, have an administrator assign the RECRUITER role under Users, create the company, then onboard the recruiter by linking the account and company under Recruiters. The recruiter can then post opportunities.

Do not use `POST /users` as a substitute for registration: that management endpoint does not establish a login password.

## Checks

```sh
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm test:authorization
pnpm --filter api test:authorization:db
pnpm test:smoke
```

`test:authorization:db` reads existing local records without mutations. `test:smoke` uses a temporary signing key and isolated local HTTP listener, registers generated accounts, exercises workflow writes, and cleans up only its generated IDs. Neither test needs existing users' passwords or prints tokens.

## Troubleshooting

- Missing generated Prisma client: run generation before building the API.
- Missing environment values: run API commands from `apps/api` or use the root pnpm scripts.
- Expired JWT: the next authenticated request clears cached session data and redirects to login. Sessions last 15 minutes; refresh tokens are not implemented.
- Network failure: retry without losing the session; API errors appear on the page.
- CORS: configure the exact web origin, including its port.
- Port in use: reuse your existing local services or choose consistent API/web ports and CORS origins.
