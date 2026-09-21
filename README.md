# PlacementOS

**A placement and internship platform in development, starting with the backend domain and eligibility rules.**

PlacementOS models students, recruiters, companies, and opportunities, with an explainable eligibility check for each student–job pairing. This is my flagship engineering project: the current focus is turning the API foundation into a tested, authenticated product.

**Status:** backend implementation + frontend scaffold. Not ready for public deployment or real student data. Authentication and authorization are not implemented.

[Getting started](docs/DEVELOPMENT.md) · [Architecture](docs/ARCHITECTURE.md) · [API reference](docs/API.md) · [Feature status and roadmap](docs/STATUS.md) · [Security](SECURITY.md)

## What is implemented

| Area | Current implementation |
| --- | --- |
| Users and profiles | CRUD endpoints for users, student profiles, and recruiter profiles; role checks when creating profiles |
| Companies and opportunities | Company and job/internship CRUD; compensation-range validation; jobs linked to a recruiter's company |
| Eligibility | Checks job status, deadline, CGPA, backlogs, school percentages, branch, and graduation year; returns individual checks and reasons |
| Persistence | PostgreSQL schema, Prisma models, and committed migrations |
| Input validation | Global NestJS validation pipe and DTO validation |
| Web application | Next.js starter page only; no placement workflows or API integration yet |

These are source-reviewed capabilities, not a claim that every flow has passed integration testing. Role fields and profile checks do not provide access control. See the [status record](docs/STATUS.md) for test gaps.

## Stack and layout

TypeScript · NestJS · Prisma · PostgreSQL · Next.js · React · pnpm workspaces

```text
apps/api/       NestJS controllers, services, DTOs, Prisma schema and migrations
apps/web/       Next.js App Router scaffold
docs/           Setup, architecture, endpoint map, and feature status
docker-compose.yml  Local PostgreSQL service
```

## Run locally

Use the pinned pnpm version in `package.json` and a compatible Node.js installation. Start with the complete [development guide](docs/DEVELOPMENT.md), including environment configuration and Prisma generation. API default: `http://localhost:4000`; web default: `http://localhost:3000`.

## Next milestones

1. Authentication, role authorization, and ownership checks.
2. Meaningful service and database integration tests, including eligibility boundaries.
3. Student/recruiter interfaces connected to the API.
4. Application submission and placement workflows.

The roadmap is planned work. No production deployment, usage metrics, or completed placement workflow is claimed.

## Contributing and license

See [CONTRIBUTING.md](CONTRIBUTING.md). No repository-level license is currently provided; package metadata is inconsistent and does not establish a clear project-wide license.
