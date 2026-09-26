import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ValidationPipe } from '@nestjs/common';
import { testDatabaseTarget } from './test-database-target.mjs';

// Isolated HTTP server and explicitly confirmed test database; only fixtures mutated.
// No real account password or production signing key is read or printed.
process.env.JWT_SECRET = randomBytes(48).toString('hex');
process.env.DATABASE_URL = testDatabaseTarget();
const { AppModule } = await import('../dist/app.module.js');
const { PrismaService } = await import('../dist/prisma/prisma.service.js');
const module = await Test.createTestingModule({
  imports: [AppModule],
}).compile();
const app = module.createNestApplication({ logger: false });
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
);
await app.listen(0, '127.0.0.1');
const base = await app.getUrl();
const prisma = module.get(PrismaService);
const jwt = module.get(JwtService);
const marker = `mvp-${randomUUID()}`;
const users = [];
let companyId;
let checks = 0;
async function call(path, token, method = 'GET', body, expected = 200) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  assert.equal(
    response.status,
    expected,
    `${method} ${path}: expected ${expected}, got ${response.status}`,
  );
  assert.ok(
    !JSON.stringify(data).includes('passwordHash'),
    'Response must not expose password hashes',
  );
  checks++;
  return data;
}
async function register(name, role = 'STUDENT') {
  const email = `${marker}-${name}@example.invalid`;
  const password = randomBytes(24).toString('base64url');
  const data = await call(
    '/auth/register',
    null,
    'POST',
    { email, password },
    201,
  );
  users.push(data.user.id);
  if (role !== 'STUDENT')
    await prisma.user.update({ where: { id: data.user.id }, data: { role } });
  const login = await call(
    '/auth/login',
    null,
    'POST',
    { email, password },
    201,
  );
  assert.equal((await call('/auth/me', login.accessToken)).role, role);
  return { id: data.user.id, token: login.accessToken };
}
try {
  const admin = await register('admin', 'ADMIN');
  const recruiter = await register('recruiter', 'RECRUITER');
  const student = await register('student');
  const other = await register('other');
  await call('/jobs', null, 'GET', undefined, 401);
  await call('/users', student.token, 'GET', undefined, 403);
  await call('/users', recruiter.token, 'GET', undefined, 403);
  await call('/users', admin.token);
  await call(
    `/users/${student.id}`,
    student.token,
    'PATCH',
    { role: 'ADMIN' },
    403,
  );
  const company = await call(
    '/companies',
    admin.token,
    'POST',
    { name: marker, industry: 'Testing' },
    201,
  );
  companyId = company.id;
  await call(`/companies/${company.id}`, admin.token, 'PATCH', {
    description: 'Temporary workflow fixture',
  });
  const rp = await call(
    '/recruiters',
    admin.token,
    'POST',
    {
      userId: recruiter.id,
      companyId: company.id,
      fullName: 'Fixture Recruiter',
    },
    201,
  );
  await call(`/recruiters/${rp.id}`, recruiter.token, 'PATCH', {
    jobTitle: 'Hiring manager',
    phone: null,
  });
  await call(
    `/recruiters/${rp.id}`,
    recruiter.token,
    'PATCH',
    { companyId: company.id },
    403,
  );
  const profile = await call(
    '/student-profiles',
    student.token,
    'POST',
    {
      userId: student.id,
      fullName: 'Fixture Student',
      collegeRollNumber: marker,
      branch: 'CSE',
      graduationYear: 2029,
      cgpa: 8,
      activeBacklogs: 0,
      tenthPercentage: 85,
      twelfthPercentage: 85,
      skills: ['TypeScript'],
    },
    201,
  );
  await call(`/student-profiles/${profile.id}`, student.token, 'PATCH', {
    resumeUrl: null,
  });
  await call(
    `/student-profiles/${profile.id}`,
    other.token,
    'GET',
    undefined,
    404,
  );
  const job = await call(
    '/jobs',
    recruiter.token,
    'POST',
    {
      recruiterId: rp.id,
      title: 'Fixture Internship',
      description: 'Temporary smoke test',
      type: 'INTERNSHIP',
      workMode: 'REMOTE',
      status: 'DRAFT',
      minCgpa: 7,
      eligibleBranches: ['CSE'],
      graduationYears: [2029],
      compensationMin: 100,
      compensationMax: 200,
      applicationDeadline: new Date(Date.now() + 86400000).toISOString(),
    },
    201,
  );
  await call(`/jobs/${job.id}`, student.token, 'GET', undefined, 404);
  await call(`/jobs/${job.id}`, recruiter.token, 'PATCH', { status: 'OPEN' });
  const cleared = await call(`/jobs/${job.id}`, recruiter.token, 'PATCH', {
    applicationDeadline: null,
    compensationMin: null,
    compensationMax: null,
  });
  assert.equal(cleared.applicationDeadline, null);
  assert.equal(cleared.compensationMin, null);
  assert.equal(cleared.compensationMax, null);
  await call(
    `/jobs/${job.id}`,
    recruiter.token,
    'PATCH',
    { compensationMin: 500, compensationMax: 100 },
    400,
  );
  const eligibility = await call(
    '/eligibility/check',
    student.token,
    'POST',
    { studentProfileId: profile.id, jobId: job.id },
    201,
  );
  assert.equal(eligibility.eligible, true);
  const application = await call(
    '/applications',
    student.token,
    'POST',
    { studentProfileId: profile.id, jobId: job.id },
    201,
  );
  await call(
    '/applications',
    student.token,
    'POST',
    { studentProfileId: profile.id, jobId: job.id },
    409,
  );
  assert.ok(
    (await call('/applications', other.token)).every(
      (a) => a.id !== application.id,
    ),
  );
  assert.ok(
    (await call('/applications', recruiter.token)).some(
      (a) => a.id === application.id,
    ),
  );
  await call(
    `/applications/${application.id}/status`,
    student.token,
    'PATCH',
    { status: 'SELECTED' },
    403,
  );
  for (const status of [
    'UNDER_REVIEW',
    'SHORTLISTED',
    'SELECTED',
    'REJECTED',
    'WITHDRAWN',
    'APPLIED',
  ]) {
    assert.equal(
      (
        await call(
          `/applications/${application.id}/status`,
          recruiter.token,
          'PATCH',
          { status },
        )
      ).status,
      status,
    );
  }
  await call(
    `/applications/${application.id}/status`,
    recruiter.token,
    'PATCH',
    { status: 'INVALID' },
    400,
  );
  await call(`/jobs/${job.id}`, recruiter.token, 'PATCH', { status: 'CLOSED' });
  assert.ok(
    (await call('/applications', student.token)).some(
      (a) => a.id === application.id,
    ),
  );
  const expired = await jwt.signAsync(
    { sub: student.id, role: 'STUDENT' },
    { expiresIn: -1 },
  );
  await call('/auth/me', expired, 'GET', undefined, 401);
  await call(`/users/${recruiter.id}`, admin.token, 'PATCH', {
    role: 'STUDENT',
  });
  await call(
    `/applications/${application.id}/status`,
    recruiter.token,
    'PATCH',
    { status: 'SELECTED' },
    403,
  );
  await call(`/jobs/${job.id}`, admin.token, 'DELETE');
  assert.equal(
    await prisma.application.count({ where: { id: application.id } }),
    0,
  );
  await call(`/recruiters/${rp.id}`, admin.token, 'DELETE');
  await call(`/companies/${company.id}`, admin.token, 'DELETE');
  companyId = undefined;
  console.log(
    `PASS: ${checks} HTTP workflow and authorization checks; optional fields clear correctly.`,
  );
} finally {
  // Narrow cleanup by generated IDs only; never reset, truncate, or reseed.
  if (companyId) await prisma.company.deleteMany({ where: { id: companyId } });
  if (users.length)
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  assert.equal(await prisma.user.count({ where: { id: { in: users } } }), 0);
  console.log('Temporary fixtures removed. Existing records preserved.');
  await app.close();
}
