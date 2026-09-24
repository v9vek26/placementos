# Deployment preparation

Deploy in this order: **PostgreSQL -> API -> web**. No deployment or database changes were performed as part of this preparation. Existing local defaults remain unchanged.

## Environment

| App | Variable | Requirement |
| --- | --- | --- |
| API | `DATABASE_URL` | Required PostgreSQL connection string. Use the provider's connection and TLS settings; keep it secret. Needed by Prisma generation/migrations and API runtime. |
| API | `JWT_SECRET` | Required at runtime: a long, randomly generated signing secret supplied through the host's secret manager. No built-in fallback. |
| API | `CORS_ORIGINS` | Set for production to the exact HTTPS web origin(s), comma-separated, without paths or trailing slashes. If omitted, only `http://localhost:3000` is allowed. |
| API | `PORT` | Optional; defaults to `4000`. Honor the host-supplied port. |
| Web | `NEXT_PUBLIC_API_URL` | Set for production to the public HTTPS API origin, without an added `/api` prefix. Required **before building**; changing it requires rebuilding. Defaults to `http://localhost:4000`. This value is public. |

Set `NODE_ENV=production` for the hosted API runtime. Never give the web app `DATABASE_URL` or `JWT_SECRET`. Safe templates: `apps/api/.env.example` and `apps/web/.env.example`; local copies belong in `apps/api/.env` and `apps/web/.env.local`.

## Build and release

Use Node.js 24 and pnpm with the committed root workspace/lockfile. The manifest requests pnpm 12.4.2; this machine uses 11.19.0. Verify the host can install the declared version and complete a frozen install before release; this preparation does not change package-manager versions.

Run these commands from the **repository root**. Install build-time dependencies as well as runtime dependencies.

```sh
pnpm install --frozen-lockfile
pnpm --filter api exec prisma generate --config prisma7.config.ts
pnpm --filter api build
```

1. Provision PostgreSQL and set API environment values. Reserve the intended web URL for `CORS_ORIGINS`.
2. Review the committed migrations. As an explicit operator release step, run `pnpm --filter api exec prisma migrate deploy --config prisma7.config.ts` against the intended database. Back up any existing database first; do not reset or seed it. This command changes the schema and was not run during preparation.
3. Start the API with `pnpm --filter api start:prod`. The build emits `apps/api/dist/main.js`. Use `GET /` for a read-only database-connected health check (the existing response also includes a user count).
4. Set the web host's `NEXT_PUBLIC_API_URL` to that API's HTTPS origin, then build with `pnpm --filter web build`. For a Node server, start with `pnpm --filter web start`; a managed Next.js host handles serving the build. No custom platform configuration is required by the current application.
5. Confirm the final web origin is in API `CORS_ORIGINS`; restart the API after changing it. Verify HTTPS, browser-to-API requests, sign-in and role access using operator-approved accounts. Unauthenticated protected routes should return 401. Provision the initial administrator through a trusted operator process on a fresh database.

Local builds do not prove a clean hosting install, fresh-database migrations, or production workflows. Complete those checks before treating the deployment as verified. See [existing limitations and hardening](STATUS.md).
