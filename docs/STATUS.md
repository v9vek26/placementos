# Feature status and verification

Verified locally on 2026-09-24 using the existing PostgreSQL database, Node 24.20.0, and installed pnpm 11.19.0. The manifest still pins pnpm 12.4.2. No public deployment is claimed.

## Implemented workflows

- Student: login/register, role-aware overview, academic profile create/edit, job search/detail, explainable eligibility, application submission, and tracking including closed jobs.
- Recruiter: overview, company-linked profile display/contact edits, own-job management, create/edit/close/delete jobs, applicant profile/resume review, and all backend-supported statuses.
- Admin: global overview/jobs/applications, user role changes with UI self-role protection, companies CRUD, recruiter onboarding and management.
- Shared: route repair, navigation, accessible labels, responsive layout, real-data summaries, loading/retry/empty/error/success states, safe external link protocols, and consistent 401 sign-out.

## Passed checks

| Check                                  | Result                                      |
| -------------------------------------- | ------------------------------------------- |
| API and web production builds          | Passed                                      |
| API and web lint                       | Passed                                      |
| API and web typecheck                  | Passed                                      |
| API unit tests                         | 9 passed                                    |
| API end-to-end tests                   | 8 passed                                    |
| Web session/API helper tests           | 7 passed                                    |
| Authorization tests                    | 67 passed                                   |
| Read-only HTTP/database checks         | 28 passed across all three roles            |
| Temporary-fixture HTTP workflow checks | 51 passed; generated fixture IDs cleaned up |

Browser verification exercised recruiter login and job creation; student login, profile creation, eligibility, applying, tracking and admin-route denial; recruiter status/profile updates; admin company/recruiter edits, user controls, and job closure; student visibility of shortlisted applications after job closure; session expiration redirect; and the 390px mobile overview. Browser-created fixtures were removed. Company/recruiter creation and deletion, role changes, and status variants additionally passed HTTP verification.

Existing uncommitted work was preserved. Existing records were not reset, reseeded, or edited by verification. Replaced source files were backed up outside the repository in the task workspace before edits.

## Remaining hardening

- JWTs remain in localStorage and expire after 15 minutes. Move to secure HttpOnly cookies/BFF with CSRF protection and a carefully designed refresh/revocation flow before broader public use.
- Add login/registration rate limiting, email verification, password recovery, audit logs, and production monitoring/backups.
- Add pagination/server-side search for large collections and a generated API contract to prevent frontend enum/type drift.
- Consider soft deletion and stronger server-side last-admin/self-demotion protection. The current self-role protection is UI-only; backend administrative authority is unchanged.
- Define application transition rules and a student withdrawal policy if needed. Current UI intentionally follows the existing allowed statuses.
- Harden concurrent application submission/race behavior around the database unique constraint and eligibility changes; sequential duplicate prevention is verified.
- Verify fresh-database migrations, pinned pnpm installation, deployment, TLS, security headers/CSP, and dependency security as part of release preparation. Existing local builds/tests do not establish those results.
