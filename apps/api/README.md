# PlacementOS API

NestJS + Prisma + PostgreSQL backend for the PlacementOS domain and eligibility checks.

- [Local setup and verification](../../docs/DEVELOPMENT.md)
- [API map](../../docs/API.md)
- [Architecture](../../docs/ARCHITECTURE.md)
- [Feature status](../../docs/STATUS.md)

Default port: 4000. Prisma config: `prisma7.config.ts`; pass `--config prisma7.config.ts` when running Prisma from this directory. Generate the client before building.

Authentication and authorization are not implemented. Do not expose this API to real student/recruiter data.
