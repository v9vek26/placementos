# Feature status and verification

Latest implementation verification: 2026-10-06. VIV-40 local verification is complete; production release verification remains a separate gate described below. Earlier entries are historical evidence.

## VIV-40 continuation — 2026-10-06

- Release commit `58260a5` deployed successfully to Vercel Production. Its GitHub workflow passed `pnpm verify`, then failed the dependency audit. The only dependency change in the follow-up is a `source-map-js` override/lockfile patch from 1.2.1 to 1.2.2 for [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q). Local production audit now reports no known vulnerabilities; final hosted CI/deployment evidence is tracked on VIV-40.

- Resumed the existing uncommitted redesign from main at `6ab4bc7`; preserved existing backend, schema, authorization, API contracts, and hosting settings.
- Finished mobile heading wrapping and recruiter job/candidate tables. Job rows retain job type and compensation; candidate status controls identify the candidate, disable unchanged saves, and report server-confirmed results. Removed unreachable duplicate candidate-card markup.
- `pnpm verify` passed after final code edits: lint/typecheck for both apps, API and web production builds, 5 deployment-checker tests, 51 API unit tests, 17 web tests, 8 mocked API end-to-end tests, and 84 authorization/operator tests: **165 passed**.
- Browser layout checks covered **110 route/role/width combinations** at 1440, 1024, 768, 390, and 320 pixels without page overflow. Coverage includes role overviews, jobs, applications, profiles, job detail, manager new/edit forms, and all three admin directories. Screenshots use isolated synthetic fixtures, not production records.
- Interactive local checks confirmed candidate status saving and its live confirmation, disabled unchanged save, candidate profile disclosure, mobile menu Escape/focus restoration, labeled controls with 44px minimum primary form targets, and API error/retry presentation. This is browser/DOM review, not a screen-reader certification.
- The existing production baseline passed **21/21 anonymous GET/OPTIONS checks** after an initial API timeout. This does not certify the new deployed revision or authenticated production flows.
- No production test accounts, database writes, migrations, or fixture cleanup were performed by this continuation. Local fixtures are in-memory only. Real PostgreSQL concurrency/write smoke tests remain separate and require the guarded dedicated test database.
- Release gates remaining at commit time: push/CI, Vercel revision verification, post-deploy 21/21, authenticated Student/Recruiter/Admin sanity checks, and final Linear completion. Do not mark VIV-40 Done until these are evidenced.

## Historical continuation — 2026-09-26

- `pnpm verify` passed again after application transaction changes: 43 API unit, 7 web session, 8 mocked end-to-end, 84 authorization/operator/target-safety and 5 deployment-checker tests (147 total). Both apps passed lint, typecheck and production builds.
- Application submission now locks the owned student profile and target job with PostgreSQL `FOR SHARE`, then checks eligibility and inserts using the same transaction. This prevents those records changing between the decision and insertion. Regression tests cover transaction scope, changed eligibility, closed/draft jobs, ownership, duplicates and conflicts. Real PostgreSQL write/concurrency tests remain unrun.
- Database-write smoke testing now requires a separately confirmed `TEST_DATABASE_URL` with a database name ending in `_test`; it refuses ordinary `DATABASE_URL` fallback and production mode. The no-write verification pipeline covers these guards.
- Added `pnpm check:deployment`, an anonymous GET/OPTIONS-only health/CORS/access/header checker; all 16 checks passed against the running local API and web. Repeated all 28 read-only database checks successfully. The existing PostgreSQL container was reused; no data/schema changes were made.
- Docker is installed at a user-specific location on this host. Its earlier apparent absence was sandbox/PATH visibility, not a missing installation. API and web were restarted from their built outputs for these checks.
- Added the [manual release checklist](MANUAL_RELEASE.md). Production deployment, hosted CI, migrations on a fresh database and authenticated write workflows remain operator steps. The non-failing Node module-format warning in web tests remains.

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
- Duplicate submission races return 409. Eligibility checks and insertion now share a transaction with profile/job row locks; real-database concurrency validation is still required before release.
- Verify fresh-database migrations, Linux hosting/CI, public deployment, TLS, CSP, monitoring and backups before release. Clean local installation, basic security headers, and the production dependency audit are verified; they do not establish these remaining results.

## 2026-09-27 security continuation

- Full pnpm verify passed: 43 API unit, 12 web, 8 mocked e2e, 84 authorization/operator and 5 deployment checker tests (152 total); both apps lint, typecheck and production build passed.
- Hosted Linux CI passed for faeba06: https://github.com/v9vek26/placementos/actions/runs/36263159349 . This supersedes earlier statements that no hosted result had been observed. New local changes need their own run after pushing.
- Added nonce-based script CSP, restricted browser connections, blocked plugins/base tags/framing, and private/no-store HTML. Pages now render dynamically; inline styles remain permitted for framework compatibility.
- Added validated public API-origin configuration; local defaults retained.
- Production HTTP checks confirmed distinct nonces across requests and matching nonces on all 12 scripts; browser login/register switching hydrated without console errors. No forms were submitted.
- Deployment checker expanded to 21 checks. Unit fixtures pass; a full live 21-check run remains pending. Previous 16 live checks and 28 read-only database checks were not rerun this session.
- No backend, dependency, schema or data changes, and no public deployment. Temporary preview processes ended during continuation; restart using the manual guide if needed.
