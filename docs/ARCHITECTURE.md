# Architecture

## Current request path

HTTP request → NestJS controller → DTO validation → domain service → Prisma PostgreSQL adapter → PostgreSQL.

`apps/api/src/main.ts` installs a global validation pipe with whitelisting, rejection of unknown properties, and transformation. Controllers delegate to services. Prisma is exposed through `PrismaModule`; the client is generated from `apps/api/prisma/schema.prisma` into ignored source output.

## Domain

- User: unique email and STUDENT / RECRUITER / ADMIN role.
- StudentProfile: one per user; academic criteria, skills, and optional resume URL.
- Company: recruiter and job parent.
- RecruiterProfile: one per user, associated with a company.
- Job: job/internship, status, work mode, compensation, academic rules, deadline.

Relations include cascading deletes. CRUD operations therefore require careful authorization and deletion semantics before production use.

## Eligibility

`EligibilityService.check` loads a student profile and a job, computes eight checks, and returns their combined result plus explanations. Empty branch/year lists impose no restriction; an absent academic threshold imposes no threshold; missing student academic data fails a configured threshold. Branch comparison trims whitespace and ignores case. A deadline equal to or earlier than the current time fails.

Eligibility is calculated on demand. It does not submit or persist an application. Authentication and permission to inspect a student's data remain separate, unimplemented requirements.

## Frontend boundary

`apps/web` contains the generated Next.js starter, React, and Tailwind setup. No student dashboard, recruiter dashboard, admin portal, or API integration is implemented there yet.
