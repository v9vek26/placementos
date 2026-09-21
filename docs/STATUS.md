# Feature status

Reviewed against source on 2026-09-21. Update this file in the same change that adds or removes a capability.

| Capability | Status | Evidence / next verification |
| --- | --- | --- |
| Domain CRUD | Implemented in source | Controllers/services for users, profiles, companies, recruiters, jobs; database integration unverified in this audit |
| Academic eligibility | Implemented in source | eligibility.service.ts; add threshold, missing-value, deadline and branch tests |
| Schema and migrations | Present | prisma/schema.prisma and five migration directories; clean-database migration unverified |
| Input validation | Present | DTOs and global ValidationPipe; negative-case tests needed |
| Authentication and authorization | Not implemented | No authentication guards/session flow; roles are data fields |
| Placement UI | Scaffold only | apps/web/app/page.tsx is the Next.js starter |
| Applications / selection workflow | Planned | No application model or routes |
| Automated test confidence | Incomplete | Scaffold tests have stale expectations and missing dependency setup |
| CI and production deployment | Not established in repository | No passing workflow or deployment claimed |

## Priority backlog

1. Authenticate callers and enforce role, ownership, and company boundaries on every route.
2. Repair scaffold tests and add service/database tests, especially eligibility edge cases and authorization failures.
3. Review DTO completeness, update consistency, pagination, and cascading deletes.
4. Build connected student/recruiter interfaces; define application workflow requirements.
5. Establish CI and deployment checks after the local baseline is reproducible.

Do not turn planned items into README claims until source and relevant verification support them. Record command, result, date, and environment when reporting a successful check.
