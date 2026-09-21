# API map

Local base URL: `http://localhost:4000`. No global `/api` prefix is configured. JSON request bodies are validated by the DTOs. These routes currently lack authentication and authorization; use only synthetic local development data.

| Resource | Collection routes | Item routes |
| --- | --- | --- |
| Users | GET /users, POST /users | GET, PATCH, DELETE /users/:id |
| Student profiles | GET /student-profiles, POST /student-profiles | GET, PATCH, DELETE /student-profiles/:id |
| Companies | GET /companies, POST /companies | GET, PATCH, DELETE /companies/:id |
| Recruiters | GET /recruiters, POST /recruiters | GET, PATCH, DELETE /recruiters/:id |
| Jobs | GET /jobs, POST /jobs | GET, PATCH, DELETE /jobs/:id |

- `GET /`: database-backed status plus user count.
- `POST /eligibility/check`: body contains `studentProfileId` and `jobId`; returns `eligible`, `student`, `job`, `checks`, and `reasons`.

## Data creation order

1. Create a user with email and STUDENT role, then create a student profile referencing its ID.
2. Create a company and a user with RECRUITER role, then create a recruiter profile referencing both.
3. Create a job using the recruiter profile ID. The create service derives company ID from that recruiter.
4. Check eligibility using the student profile ID and job ID.

Consult the `dto/` directory under each module for exact required fields and enums. A user record is not a login account: there is no password/session flow. Client-selected roles must not be treated as trusted identities.

The collection endpoints are currently unpaginated. There is no application-submission endpoint, OpenAPI contract, or versioned API prefix in this revision.
