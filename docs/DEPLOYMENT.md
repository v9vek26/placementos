# Deployment preparation

Deploy in this order: **PostgreSQL -> API -> web**. No deployment or database changes were performed as part of this preparation. Existing local defaults remain unchanged.

Use the [manual release checklist](MANUAL_RELEASE.md) for review/push, isolated database validation, administrator onboarding, smoke tests, backups and rollback instructions.

## Environment

| App | Variable | Requirement |
| --- | --- | --- |
| API | `DATABASE_URL` | Required PostgreSQL connection string. Use the provider's connection and TLS settings; keep it secret. Needed by Prisma generation/migrations and API runtime. |
| API | `JWT_SECRET` | Required at runtime: a unique, randomly generated signing secret supplied through the host's secret manager. Production requires at least 32 characters and rejects example placeholders. No built-in fallback. |
| API | `CORS_ORIGINS` | Required in production: exact HTTPS web origin(s), comma-separated, without paths or trailing slashes. Development defaults to `http://localhost:3000`. |
| API | `PORT` | Optional; defaults to `4000`. Honor the host-supplied port. |
| API | `TRUST_PROXY_HOPS` | Optional, defaults to `0`. Set only to the verified number of trusted reverse-proxy hops (0–10). This controls client IP detection for sign-in throttling; do not guess or blindly trust forwarded headers. |
| Web | `NEXT_PUBLIC_API_URL` | Set for production to the public HTTPS API origin, without an added `/api` prefix. Required **before building**; changing it requires rebuilding. Defaults to `http://localhost:4000`. This value is public. |

Set `NODE_ENV=production` for the hosted API runtime. Never give the web app `DATABASE_URL` or `JWT_SECRET`. Safe templates: `apps/api/.env.example` and `apps/web/.env.example`; local copies belong in `apps/api/.env` and `apps/web/.env.local`.

## Build and release

Use Node.js 24 (`.nvmrc`) and pnpm 12.4.2 with the committed root workspace/lockfile. The pinned pnpm version was verified by a clean-source install and build. An older launcher initially reported 11.19.0 but installation selected 12.4.2 correctly.

Run these commands from the **repository root**. Install build-time dependencies as well as runtime dependencies.

```sh
pnpm install --frozen-lockfile
pnpm --filter api exec prisma generate --config prisma7.config.ts
pnpm --filter api build
```

1. Provision PostgreSQL and set API environment values. Reserve the intended web URL for `CORS_ORIGINS`.
2. Review the committed migrations. As an explicit operator release step, run `pnpm --filter api exec prisma migrate deploy --config prisma7.config.ts` against the intended database. Back up any existing database first; do not reset or seed it. This command changes the schema and was not run during preparation.
3. Start the API with `pnpm --filter api start:prod`. The build emits `apps/api/dist/main.js`. Use `GET /` for a read-only database-connected health check; it returns only `status` and `database`, without account counts.
4. Set the web host's `NEXT_PUBLIC_API_URL` to that API's HTTPS origin, then build with `pnpm --filter web build`. For a Node server, start with `pnpm --filter web start`; a managed Next.js host handles serving the build. No custom platform configuration is required by the current application.
5. Confirm the final web origin is in API `CORS_ORIGINS`; restart the API after changing it. Verify HTTPS, browser-to-API requests, sign-in and role access using operator-approved accounts. Unauthenticated protected routes should return 401. On a fresh database, use the operator-only `admin:bootstrap` command described in [local setup](DEVELOPMENT.md) after registering the intended administrator account; it is read-only unless that exact email is explicitly confirmed.

Local builds do not prove a Linux hosting install, fresh-database migrations, or production workflows. Complete those checks before treating the deployment as verified. See [existing limitations and hardening](STATUS.md).

After deployment, run `pnpm check:deployment --api-url https://YOUR_API_HOST --web-url https://YOUR_WEB_HOST`. This performs 16 anonymous GET/OPTIONS checks and exits nonzero on failure; it never creates accounts or sends application writes. A pass must be followed by the approved role/workflow checks in the manual checklist.

## Suggested hosting setup (not provisioned)

Use Render PostgreSQL and a Render Node web service for the API, with Vercel for the Next.js frontend. This keeps API/database networking together and uses a Next.js-aware web host. Select plans and regions yourself before creating billable resources.

**Render database/API:** choose the same region and use the database's internal connection URL in the API secret manager. Leave the API service's Root Directory at the repository root so the workspace lockfile is available. Set `NODE_VERSION=24`, the API values above, and `NODE_ENV=production`. Build command:

```sh
pnpm install --frozen-lockfile --prod=false && pnpm --filter api exec prisma generate --config prisma7.config.ts && pnpm --filter api build
```

Start command: `pnpm --filter api start:prod`. Health path: `/`. Run the reviewed migration command from step 2 separately as the release step. Do not put migrations or seeds in the build command. Verify proxy topology before setting `TRUST_PROXY_HOPS`.

**Vercel web:** select Next.js, Node 24, and Root Directory `apps/web`; include source files outside that directory. Install command: `cd ../.. && pnpm install --frozen-lockfile --prod=false`. Build command: `pnpm build`. Keep the framework's default output directory. Set `NEXT_PUBLIC_API_URL` for the deployment environment before building. Add only intended web origins to API CORS; do not wildcard all preview domains.

The built-in limiter permits 20 combined login/registration attempts per IP per minute per API process. Use a shared gateway limiter before running multiple API replicas. CI (`pnpm verify`) uses mocked persistence and does not deploy or write to any database.

Provider references: [Render monorepos](https://render.com/docs/monorepo-support), [Render PostgreSQL](https://render.com/docs/postgresql-creating-connecting), [Render Node versions](https://render.com/docs/node-version), [Vercel monorepos](https://vercel.com/docs/monorepos).
