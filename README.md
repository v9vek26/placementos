# PlacementOS

A local placement and internship MVP for students, recruiters, and campus administrators.

Students maintain an academic profile, browse real opportunities, check eligibility, apply, and track progress. Recruiters manage their own jobs and applicants. Administrators manage roles, companies, and recruiter onboarding.

**Status:** MVP implemented, with local hardening and verification updated on 2026-09-26: 147 database-free tests, 28 read-only database checks and 16 deployment smoke checks passed locally. Public deployment and production operations have not been verified. The browser currently stores short-lived JWTs in localStorage; see [security and hardening](docs/STATUS.md).

[Development guide](docs/DEVELOPMENT.md) · [Deployment guide](docs/DEPLOYMENT.md) · [Architecture](docs/ARCHITECTURE.md) · [API map](docs/API.md) · [Verification and backlog](docs/STATUS.md) · [Security](SECURITY.md)

For step-by-step operator instructions, use the [manual release checklist](docs/MANUAL_RELEASE.md).

## Implemented

- Registration, login, current-session verification, database-backed RBAC, and ownership enforcement.
- Distinct student, recruiter, and admin dashboards with role-aware navigation.
- Student profile, job search, explainable eligibility checks, applications, and status tracking.
- Recruiter profile edits, create/edit/close/delete jobs, applicant review, and status updates.
- Admin user role management, company CRUD, recruiter onboarding/management, and global jobs/applications views.
- Shared API/session handling, expired-session redirects, accessible form labels, responsive layouts, and loading/error/empty states.

## Stack

NestJS + Prisma/PostgreSQL API; Next.js 16 App Router + React 19 + Tailwind 4 web app; pnpm workspace.

## Start locally

With dependencies, database, Prisma client, migrations, and local environment configured as described in the [development guide](docs/DEVELOPMENT.md), open two terminals in the repository root:

```sh
pnpm dev:api
```

```sh
pnpm dev:web
```

Open [PlacementOS](http://localhost:3000). The API defaults to port 4000.

## Verify

Run `pnpm verify` for the complete database-free verification pipeline (generate the Prisma client first). GitHub Actions uses the same checks. Database-write smoke tests below are separate and require an explicitly designated test database.

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

The write smoke test requires `TEST_DATABASE_URL` for a separate database ending in `_test`, plus `TEST_DATABASE_CONFIRM` matching its name. It never falls back to the ordinary `DATABASE_URL`. It creates generated fixtures and removes only their IDs in a `finally` block. Follow the [manual release checklist](docs/MANUAL_RELEASE.md) before running it; never reset or reseed existing data.

For anonymous, read-only checks of a running deployment, use `pnpm check:deployment --api-url https://YOUR_API_HOST --web-url https://YOUR_WEB_HOST`. Local HTTP loopback URLs require `--allow-local`.

See [CONTRIBUTING.md](CONTRIBUTING.md). A repository-wide license has not been established.
