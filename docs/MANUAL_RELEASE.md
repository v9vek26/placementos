# Manual completion and release checklist

This is an operator handoff, not evidence that deployment has happened. The local MVP is implemented. Public hosting, real database concurrency validation, email/recovery features, and production operations remain separate work. No commands below were used to modify your existing database during this task.

## 1. Review and preserve your work

Open PowerShell in the repository:

```powershell
Set-Location C:\Dev\portfolio-projects\placementos
git status --short --branch
git diff --check
git diff
```

Review the files, especially transaction changes and test-database protections. Commit the reviewed changes with named file paths or a reviewed staging selection. Do not stage `.env` files, database dumps, tokens or credentials. Push `main` only when you intend to publish the code. A clean local tree does not mean the latest commit has been pushed.

## 2. Run the local application

Use Node 24 and the pinned pnpm 12.4.2. Keep the existing ignored environment files. If missing, copy the `.env.example` templates and fill them privately; templates are not working credentials.

```powershell
pnpm install --frozen-lockfile
pnpm --filter api exec prisma generate --config prisma7.config.ts
pnpm verify
```

Start Docker Desktop, then inspect `docker ps -a`. Reuse the existing `placementos-postgres` container and its volume. If it exists but is stopped, `docker start placementos-postgres` starts it. Use `docker compose up -d postgres` only if intentionally setting up the documented local Compose installation. Never use `down -v`, reset or seed to fix a connection problem. Compose credentials are development-only and must not be reused for hosting.

Open two separate PowerShell terminals at the repository root:

```powershell
pnpm dev:api
```

```powershell
pnpm dev:web
```

Open `http://localhost:3000`. Run the new read-only check from a third terminal:

```powershell
pnpm check:deployment --api-url http://localhost:4000 --web-url http://localhost:3000 --allow-local
```

Expected: all 16 checks pass and exit code 0. It checks health, database connectivity, anonymous 401, CORS and response headers. It does not test authenticated writes, browser behavior or the frontend's built-in API address. A failure is reported without printing secrets or response bodies.

## 3. Validate migrations and write workflows on a separate database

Create an empty disposable PostgreSQL database whose name ends in `_test`, for example `placementos_release_test`. Use a dedicated database user with access to that database only. The existing application database must not be the target. Do this in a new terminal and close it afterward so test settings do not carry into deployment.

Set these privately through your shell or secret manager:

```powershell
$env:TEST_DATABASE_URL = 'REPLACE_WITH_THE_DISPOSABLE_POSTGRESQL_CONNECTION_STRING'
$env:TEST_DATABASE_CONFIRM = 'placementos_release_test'
$env:DATABASE_URL = $env:TEST_DATABASE_URL
pnpm --filter api exec prisma migrate deploy --config prisma7.config.ts
pnpm test:smoke
```

Replace the placeholder before running. Migration deployment changes the explicitly selected test database schema. The smoke suite writes and cleans up generated fixtures. It refuses ordinary `DATABASE_URL` as a fallback, refuses a database name without `_test`, refuses mismatched confirmation, and refuses `NODE_ENV=production`. These guards reduce operator mistakes; the operator must still verify the actual destination and permissions.

Confirm zero pending migrations and all workflow checks pass. Record failures before changing anything. If cleanup is interrupted, identify only the generated test fixture IDs; do not reset a shared database.

The new application transaction also requires a real PostgreSQL concurrency check before release:

- Start two simultaneous applications for one eligible student/job. Expect one application row and a duplicate conflict for the other request.
- Hold an uncommitted job closure in one connection, then submit in another. After closure commits, submission must reject the closed job without creating a row.
- Repeat with a profile update that makes the student ineligible. Submission must use the committed academic record.
- Hold submission after it obtains its locks, then attempt job/profile edits. Edits must wait until the transaction ends; no partially created application should remain on failure.
- Exercise the last-administrator protections concurrently on fixtures. Mocked tests do not establish PostgreSQL concurrency behavior.

These real database checks were not performed under the task's no-database-write restriction.

## 4. Complete CI

After the code is reviewed and pushed, open the GitHub Actions **Verify PlacementOS** workflow. It should pass on Linux with Node 24, frozen dependencies, generated Prisma client, all checks and the production dependency audit. A prepared workflow file is not a successful hosted run. Do not add real database credentials to this workflow.

## 5. Choose hosting and set production configuration

Choose accounts, plans, region, billing limits and your final web/API domains. Detailed host commands are in [DEPLOYMENT.md](DEPLOYMENT.md). Deployment order: **PostgreSQL -> API -> web**.

| API variable | Set privately on API host |
| --- | --- |
| `DATABASE_URL` | Production PostgreSQL URL with provider-required TLS |
| `JWT_SECRET` | Independently generated random secret of at least 32 characters |
| `NODE_ENV` | `production` |
| `CORS_ORIGINS` | Exact HTTPS web origin(s), comma-separated; no paths/trailing slash/wildcards |
| `PORT` | Host-provided value, or omit for default 4000 |
| `TRUST_PROXY_HOPS` | Default 0; change only after verifying proxy topology |

For the web host set only `NEXT_PUBLIC_API_URL` to the HTTPS API origin, with no `/api` suffix. Set it **before building**. Changing it requires a rebuild. Never supply database credentials or the JWT signing secret to the web host.

Review migrations and take a backup of any existing target database before the explicit release migration step. Deploy the API and check its `/` health response before building/deploying the web. Set exact final CORS origins and restart API after changing them.

## 6. Administrator and recruiter setup

Existing installations: keep using their administrator. Do not bootstrap another one.

Fresh installation: register the intended operator account, then check without writes:

```powershell
pnpm --filter api admin:bootstrap --email YOUR_REGISTERED_EMAIL
```

After verifying the exact target and intended database, the operator can explicitly promote that account:

```powershell
pnpm --filter api admin:bootstrap --email YOUR_REGISTERED_EMAIL --confirm-email YOUR_REGISTERED_EMAIL
```

This is a database write. It refuses an installation that already has an administrator. No actual account was promoted during this task.

For recruiters: register a normal account, assign RECRUITER as administrator, create the company, then link that account and company in recruiter onboarding. Direct user-management creation does not set a login password.

## 7. Production smoke test and operations

Run the read-only check with your actual deployed URLs:

```powershell
pnpm check:deployment --api-url https://YOUR_API_HOST --web-url https://YOUR_WEB_HOST
```

Then manually check with explicitly approved accounts and data:

| Role | Check |
| --- | --- |
| Student | Register/login, profile, job eligibility, one application, duplicate rejection and tracking |
| Recruiter | Own-job creation/edit/closure, applicant review/status, denied access to another recruiter’s resources |
| Admin | Company/recruiter management, role changes, self-demotion and self-deletion denied |
| Shared | Session expiry, invalid login, mobile layout, HTTPS, no mixed content, correct API destination |

Choose a backup schedule and retention; test a restore into a separate database. Configure uptime/error alerts for API, database and web. Keep logs free of tokens, passwords and connection strings. Record the deployed commit and environment owner.

Rollback: stop rollout if health checks fail; retain logs without secrets. Redeploy the previous known-good application artifact only if it is compatible with the current database schema. Do not assume reverting Git reverses a migration. For schema failures, inspect the failed migration and use a reviewed repair or backup/restore plan; never blindly reset production.

## 8. Features still outside the completed MVP

- HttpOnly-cookie/BFF sessions with CSRF protection, refresh and revocation; current sessions use short-lived JWTs in localStorage.
- Email verification and password recovery, including a configured email provider.
- Persistent administrator audit logs.
- Shared rate limiting for multiple API replicas; current limiter is per process.
- Strict Content Security Policy, pagination/server-side search and generated API types.
- Explicit application transition/withdrawal rules and a soft-deletion policy.

Implement and test these as individual changes. None is implied complete by a passing local build or deployment smoke check.
