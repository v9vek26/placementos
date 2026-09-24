# Architecture

## Request path

Next.js client page → shared API helper → bearer JWT → NestJS JWT guard → current database identity/role → role guard → DTO validation → ownership-scoped service → Prisma/PostgreSQL.

The API rejects unknown input properties through its global validation pipe. User response selections omit password hashes. Current database roles take precedence over JWT role claims, so role revocation applies to existing tokens.

## Frontend

`components/workspace.tsx` verifies `/auth/me`, provides session context, and renders role-aware navigation for dashboard/admin layouts. Admin pages are gated before mounting their data components. The server remains the authority for authorization.

`lib/api.ts` attaches tokens, formats API errors, disables caching, and clears both localStorage session keys on authenticated 401 responses. Network errors and 403 responses do not clear valid sessions. The workspace revalidates on route changes/window focus and responds to cross-tab token changes.

`components/ui.tsx` contains reusable fields, notices, loading/error states, and cancellable resource fetching. `components/job-form.tsx` shares create/edit behavior. `lib/types.ts` reflects the current Prisma enums and API response shapes; it is not an automatically generated API contract.

Routes preserve the existing `/dashboard`, `/dashboard/jobs`, `/dashboard/jobs/[id]`, `/dashboard/profile`, `/dashboard/applications`, and `/admin/users` URLs. New routes add job creation/editing, companies, and recruiters.

## Domain and eligibility

Users have one optional student profile and one optional recruiter profile. Recruiters belong to companies; jobs derive their company from the posting recruiter. Applications link students and jobs with a unique student/job constraint.

Eligibility checks job status, deadline, CGPA, backlogs, school percentages, branch, and graduation year. Empty branch/year lists impose no restriction. Missing student scores fail configured thresholds. Application creation rechecks eligibility on the backend and blocks duplicates.

Students see OPEN jobs and their own applications. Recruiters see their own jobs plus other OPEN jobs, but can modify only their own jobs and associated applications. Administrators can manage all records. Closed-job application history remains available to students through Applications.

## Data lifecycle

Company/recruiter/job relations have cascading deletes. The UI explains the cascade and requires confirmation before deletion. Closing a job preserves application history. Changing a recruiter's company affects future jobs; existing jobs retain their original company association.

Clearing nullable job fields sends explicit nulls; clearing the application deadline removes it rather than assigning an epoch date. No schema migration was required by this MVP change.
