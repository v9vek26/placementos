# API map

Base URL: `http://localhost:4000`, with no `/api` prefix. Protected routes require `Authorization: Bearer <token>`. JSON bodies must match the module DTOs; unknown properties are rejected.

| Resource           | Routes                                                                 | Authorization                                                                                                     |
| ------------------ | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Auth               | POST `/auth/register`, POST `/auth/login`                              | Public; registration always creates STUDENT                                                                       |
| Current identity   | GET `/auth/me`                                                         | Authenticated; current database role                                                                              |
| Users              | GET/POST `/users`; GET/PATCH/DELETE `/users/:id`                       | ADMIN                                                                                                             |
| Student profiles   | GET/POST `/student-profiles`; GET/PATCH/DELETE `/student-profiles/:id` | STUDENT own profile; ADMIN global                                                                                 |
| Companies          | GET/POST `/companies`; GET/PATCH/DELETE `/companies/:id`               | Authenticated reads; ADMIN writes                                                                                 |
| Recruiters         | GET/POST `/recruiters`; GET/PATCH/DELETE `/recruiters/:id`             | ADMIN global; RECRUITER own reads/contact edits; company reassignment/admin creation/deletion restricted to ADMIN |
| Jobs               | GET/POST `/jobs`; GET/PATCH/DELETE `/jobs/:id`                         | STUDENT reads OPEN; RECRUITER reads own + OPEN and writes own; ADMIN global                                       |
| Eligibility        | POST `/eligibility/check`                                              | STUDENT own profile; RECRUITER only applicants to own job; ADMIN global                                           |
| Applications       | GET/POST `/applications`; GET `/applications/:id`                      | STUDENT creates own after eligibility check; role-scoped reads                                                    |
| Application status | PATCH `/applications/:id/status`                                       | RECRUITER own job applications; ADMIN global                                                                      |

Eligibility body: `{studentProfileId, jobId}`. Response: `{eligible, student, job, checks, reasons}`.

Application creation body: `{studentProfileId, jobId}`. Status update body: `{status}`.

Enums from Prisma:

- Roles: STUDENT, RECRUITER, ADMIN.
- Job type: JOB, INTERNSHIP.
- Work mode: ONSITE, HYBRID, REMOTE.
- Job status: DRAFT, OPEN, CLOSED.
- Compensation period: MONTHLY, ANNUAL.
- Application status: APPLIED, UNDER_REVIEW, SHORTLISTED, REJECTED, SELECTED, WITHDRAWN.

The current backend allows recruiters/admins to set any listed application status; no transition graph or student withdrawal endpoint exists. The UI follows that contract.

Job creation requires recruiterId, title, description, and type. Company ID is derived by the service. For exact optional fields, consult `src/jobs/dto/create-job.dto.ts`. Job updates accept null to clear nullable location, compensation bounds/period, academic thresholds, and deadline.

Collections are currently unpaginated. No versioned API or generated OpenAPI contract is provided. Password recovery and email verification are not implemented.
