# Feature status and verification

Latest verification: 2026-09-26, Node 24.20.0 and pnpm 12.4.2. Both apps build and run locally; existing PostgreSQL passed 28 read-only checks across all three roles. No public deployment is claimed.

## 2026-09-26 hardening and readiness

- `pnpm verify` passed: both apps' lint/typechecks/builds, 33 API unit tests, 7 web session tests, 8 mocked API end-to-end tests, and 74 authorization/operator tests (122 total).
- A source copy without local environment files passed a frozen dependency install, Prisma generation, and the verification pipeline. The installed package manager selected the pinned 12.4.2 successfully. Final small health/operator/mobile changes additionally passed verification in the working checkout.
- Added per-IP sign-in/registration throttling, bcrypt byte-limit validation for new passwords, and conflict responses for duplicate registration/application races.
- Administrator management now prevents self-demotion/self-deletion and protects the last administrator through serializable transactions with current-role rechecks. Transaction conflict handling and protections were tested with mocked persistence; PostgreSQL concurrency stress testing remains unverified.
- Added a first-administrator operator command, read-only unless the exact target email is confirmed. Tested with mocked persistence only; no account was promoted.
- Added production startup checks, optional explicit proxy-hop configuration, security headers, graceful shutdown, and a health check that exposes no account counts and returns a sanitized 503 if the database is unavailable.
- Added database-free GitHub Actions verification. The workflow file is prepared; an actual hosted CI run has not been observed.
- `pnpm audit --prod` reports zero advisories after scoped overrides for Prisma tooling dependencies (`deepmerge-ts` 8.0.0 and `mysql2` 3.23.1). Prisma generation/schema validation passed with the overrides. Obsolete test-path plugin removed; `pnpm peers check` reports no issues.
- Browser checks confirmed anonymous redirects, registration form switching, and the corrected 390px sign-in heading. Live HTTP checks passed for health/database connection, CORS allow/deny behavior, API/web security headers, anonymous 401, and web HTTP 200.
- Docker/PostgreSQL was initially stopped; after Docker started, the existing `placementos-postgres` container was reused. No database was recreated, migrated, seeded, or written to; no test users were created during this work. Full real-database write workflows were not rerun under the no-write restriction.

Dependency references: [deepmerge-ts advisory](https://github.com/advisories/GHSA-ggr8-5vv4-36mx), [MySQL2 authentication advisory](https://github.com/advisories/GHSA-3f6p-5ww8-9rcr), [MySQL2 decompression advisory](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3).

## Implemented workflows

- Student: login/register, role-aware overview, academic profile create/edit, job search/detail, explainable eligibility, application submission, and tracking including closed jobs.
- Recruiter: overview, company-linked profile display/contact edits, own-job management, create/edit/close/delete jobs, applicant profile/resume review, and all backend-supported statuses.
- Admin: global overview/jobs/applications, user role changes with UI self-role protection, companies CRUD, recruiter onboarding and management.
- Shared: route repair, navigation, accessible labels, responsive layout, real-data summaries, loading/retry/empty/error/success states, safe external link protocols, and consistent 401 sign-out.

## Historical MVP checks (2026-09-24)

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
- Add email verification, password recovery, audit logs, and production monitoring/backups. The current sign-in limiter is process-local; a multi-replica deployment needs a shared gateway limiter.
- Add pagination/server-side search for large collections and a generated API contract to prevent frontend enum/type drift.
- Consider soft deletion; current destructive domain operations retain the existing cascade policy. Administrator account protections are now enforced server-side.
- Define application transition rules and a student withdrawal policy if needed. Current UI intentionally follows the existing allowed statuses.
- Duplicate submission races now return 409. Atomic eligibility enforcement against concurrent job/profile changes still needs a dedicated transaction design and real-database concurrency tests.
- Verify fresh-database migrations, Linux hosting/CI, public deployment, TLS, CSP, monitoring and backups before release. Clean local installation, basic security headers, and the production dependency audit are verified; they do not establish these remaining results.
