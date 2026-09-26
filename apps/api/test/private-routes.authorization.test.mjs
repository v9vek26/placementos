import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { after, before, beforeEach, test } from 'node:test';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../dist/app.module.js';
import { PrismaService } from '../dist/prisma/prisma.service.js';

// Exercise the complete API, including real auth/password handling. The only
// replacement is Prisma persistence; no real user or database record is touched.
const id = () => randomUUID();
const ids = Object.fromEntries(
  [
    'student',
    'otherStudent',
    'recruiter',
    'otherRecruiter',
    'admin',
    'profile',
    'otherProfile',
    'recruiterProfile',
    'otherRecruiterProfile',
    'company',
    'otherCompany',
    'job',
    'otherJob',
    'draft',
    'ownDraft',
    'application',
  ].map((key) => [key, id()]),
);
let db;
let writes;
let app;
const secret = randomBytes(32).toString('hex');
const jwt = new JwtService({ secret });
const roles = {
  student: 'STUDENT',
  otherStudent: 'STUDENT',
  recruiter: 'RECRUITER',
  otherRecruiter: 'RECRUITER',
  admin: 'ADMIN',
};
const tokens = Object.fromEntries(
  Object.entries(roles).map(([name, role]) => [
    name,
    jwt.sign(
      { sub: ids[name], email: `${name}@example.com`, role },
      { expiresIn: '5m' },
    ),
  ]),
);
const relations = {
  studentProfile: { user: ['user', 'userId'] },
  recruiterProfile: {
    user: ['user', 'userId'],
    company: ['company', 'companyId'],
  },
  job: {
    recruiter: ['recruiterProfile', 'recruiterId'],
    company: ['company', 'companyId'],
  },
  application: {
    studentProfile: ['studentProfile', 'studentProfileId'],
    job: ['job', 'jobId'],
  },
};
const expand = (model, row) => {
  if (!row) return null;
  return {
    ...row,
    ...Object.fromEntries(
      Object.entries(relations[model] ?? {}).map(
        ([key, [target, foreignKey]]) => [
          key,
          expand(
            target,
            db[target].find((value) => value.id === row[foreignKey]),
          ),
        ],
      ),
    ),
  };
};
const matches = (row, where = {}) =>
  row &&
  Object.entries(where).every(([key, value]) => {
    if (key === 'OR') return value.some((part) => matches(row, part));
    if (key === 'AND') return value.every((part) => matches(row, part));
    if (key === 'studentProfileId_jobId') return matches(row, value);
    return value && typeof value === 'object'
      ? matches(row[key], value)
      : row[key] === value;
  });
const project = (model, row, args = {}) => {
  if (!row) return null;
  if (args.select)
    return Object.fromEntries(
      Object.entries(args.select)
        .filter(([, flag]) => flag)
        .map(([key]) => [key, row[key]]),
    );
  const result = { ...row };
  for (const [key, nested] of Object.entries(args.include ?? {})) {
    const [target, foreignKey] = relations[model][key];
    result[key] = project(
      target,
      db[target].find((value) => value.id === row[foreignKey]),
      nested === true ? {} : nested,
    );
  }
  return result;
};
const prisma = {};
prisma.$transaction = async (callback) => callback(prisma);
for (const model of [
  'user',
  'studentProfile',
  'recruiterProfile',
  'company',
  'job',
  'application',
]) {
  const find = (args) =>
    db[model].find((row) => matches(expand(model, row), args.where));
  prisma[model] = {
    count: async (args = {}) =>
      db[model].filter((row) => matches(expand(model, row), args.where)).length,
    findUnique: async (args) => project(model, find(args), args),
    findFirst: async (args) => project(model, find(args), args),
    findMany: async (args = {}) =>
      db[model]
        .filter((row) => matches(expand(model, row), args.where))
        .map((row) => project(model, row, args)),
    create: async (args) => {
      const row = {
        id: id(),
        ...(model === 'user' ? { role: 'STUDENT' } : {}),
        ...args.data,
      };
      db[model].push(row);
      writes++;
      return project(model, row, args);
    },
    update: async (args) => {
      const row = find(args);
      assert.ok(row, 'write must retain an authorized scope');
      Object.assign(row, args.data);
      writes++;
      return project(model, row, args);
    },
    delete: async (args) => {
      const row = find(args);
      assert.ok(row, 'delete must retain an authorized scope');
      db[model] = db[model].filter((value) => value !== row);
      writes++;
      return project(model, row, args);
    },
  };
}
before(async () => {
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ConfigService)
    .useValue(new ConfigService({ JWT_SECRET: secret }))
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .compile();
  app = module.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
});
after(async () => {
  if (app) await app.close();
});
beforeEach(() => {
  writes = 0;
  const profile = {
    fullName: 'Fixture Student',
    branch: 'CS',
    cgpa: 9,
    activeBacklogs: 0,
    tenthPercentage: 90,
    twelfthPercentage: 90,
    graduationYear: 2027,
    skills: [],
  };
  const job = {
    title: 'Fixture Job',
    description: 'Fixture opportunity',
    status: 'OPEN',
    type: 'JOB',
    workMode: 'REMOTE',
    compensationMin: null,
    compensationMax: null,
    applicationDeadline: null,
    minCgpa: null,
    maxActiveBacklogs: null,
    minTenthPercentage: null,
    minTwelfthPercentage: null,
    eligibleBranches: [],
    graduationYears: [],
  };
  db = {
    user: Object.entries(roles).map(([key, role]) => ({
      id: ids[key],
      email: `${key}@example.com`,
      role,
      passwordHash: 'fixture-private-field',
    })),
    studentProfile: [
      { ...profile, id: ids.profile, userId: ids.student },
      { ...profile, id: ids.otherProfile, userId: ids.otherStudent },
    ],
    recruiterProfile: [
      {
        id: ids.recruiterProfile,
        userId: ids.recruiter,
        companyId: ids.company,
        fullName: 'Fixture Recruiter',
      },
      {
        id: ids.otherRecruiterProfile,
        userId: ids.otherRecruiter,
        companyId: ids.otherCompany,
        fullName: 'Other Recruiter',
      },
    ],
    company: [
      { id: ids.company, name: 'Fixture Company' },
      { id: ids.otherCompany, name: 'Other Company' },
    ],
    job: [
      {
        ...job,
        id: ids.job,
        recruiterId: ids.recruiterProfile,
        companyId: ids.company,
      },
      {
        ...job,
        id: ids.otherJob,
        recruiterId: ids.otherRecruiterProfile,
        companyId: ids.otherCompany,
      },
      {
        ...job,
        id: ids.draft,
        status: 'DRAFT',
        recruiterId: ids.otherRecruiterProfile,
        companyId: ids.otherCompany,
      },
      {
        ...job,
        id: ids.ownDraft,
        status: 'DRAFT',
        recruiterId: ids.recruiterProfile,
        companyId: ids.company,
      },
    ],
    application: [
      {
        id: ids.application,
        studentProfileId: ids.profile,
        jobId: ids.job,
        status: 'APPLIED',
      },
    ],
  };
});
const call = (method, url, actor, body) => {
  let req = request(app.getHttpServer())[method](url);
  if (actor) req = req.auth(tokens[actor] ?? actor, { type: 'bearer' });
  if (body) req = req.send(body);
  return req;
};
const safe = (body) =>
  assert.ok(
    !JSON.stringify(body).includes('passwordHash') &&
      !JSON.stringify(body).includes('fixture-private-field'),
  );
for (const route of [
  'users',
  'student-profiles',
  'recruiters',
  'jobs',
  'companies',
]) {
  for (const method of ['get', 'post', 'patch', 'delete']) {
    void test(`anonymous ${method.toUpperCase()} /${route} is rejected`, async () => {
      await call(
        method,
        `/${route}${['patch', 'delete'].includes(method) ? '/' + ids.student : ''}`,
        null,
        method === 'get' ? undefined : {},
      ).expect(401);
      assert.equal(writes, 0);
    });
  }
}
void test('anonymous eligibility check is rejected', async () => {
  await call('post', '/eligibility/check', null, {}).expect(401);
});
for (const actor of ['student', 'recruiter']) {
  void test(`${actor} cannot list users, create privileged users, promote themselves or delete users`, async () => {
    await call('get', '/users', actor).expect(403);
    await call('post', '/users', actor, {
      email: 'unauthorized@example.com',
      role: 'ADMIN',
    }).expect(403);
    await call('patch', `/users/${ids[actor]}`, actor, {
      role: 'ADMIN',
    }).expect(403);
    await call('delete', `/users/${ids.otherStudent}`, actor).expect(403);
    assert.equal(writes, 0);
  });
}
void test('admin can list safe users and change a role', async () => {
  const { body } = await call('get', '/users', 'admin').expect(200);
  safe(body);
  await call('patch', `/users/${ids.student}`, 'admin', {
    role: 'RECRUITER',
  }).expect(200);
  assert.equal(db.user.find((row) => row.id === ids.student).role, 'RECRUITER');
});
void test('database role takes precedence over an old signed ADMIN claim', async () => {
  db.user.find((row) => row.id === ids.admin).role = 'STUDENT';
  await call('get', '/users', 'admin').expect(403);
  const { body } = await call('get', '/auth/me', 'admin').expect(200);
  assert.equal(body.role, 'STUDENT');
});
void test('admin cannot demote or delete their own account through direct HTTP requests', async () => {
  await call('patch', `/users/${ids.admin}`, 'admin', {
    role: 'STUDENT',
  }).expect(403);
  await call('delete', `/users/${ids.admin}`, 'admin').expect(403);
  assert.equal(writes, 0);
});
void test('a deleted account immediately loses access with its existing token', async () => {
  db.user = db.user.filter((row) => row.id !== ids.student);
  await call('get', '/applications', 'student').expect(401);
});
void test('student lists only their own safe profile', async () => {
  const { body } = await call('get', '/student-profiles', 'student').expect(
    200,
  );
  assert.deepEqual(
    body.map((row) => row.id),
    [ids.profile],
  );
  safe(body);
});
void test('student can update their profile but cannot access or mutate another profile', async () => {
  const own = await call(
    'patch',
    `/student-profiles/${ids.profile}`,
    'student',
    { fullName: 'Updated Name' },
  ).expect(200);
  safe(own.body);
  for (const method of ['get', 'patch', 'delete'])
    await call(
      method,
      `/student-profiles/${ids.otherProfile}`,
      'student',
      method === 'patch' ? { fullName: 'Not Allowed' } : undefined,
    ).expect(404);
  assert.equal(writes, 1);
});
void test('student cannot create a profile on behalf of another account or reassign a profile', async () => {
  await call('post', '/student-profiles', 'student', {
    userId: ids.otherStudent,
    fullName: 'Fixture',
    collegeRollNumber: 'R1',
    branch: 'CS',
    graduationYear: 2027,
  }).expect(403);
  await call('patch', `/student-profiles/${ids.profile}`, 'student', {
    userId: ids.otherStudent,
  }).expect(400);
  assert.equal(writes, 0);
});
void test('recruiter cannot enumerate private student profiles', async () => {
  await call('get', '/student-profiles', 'recruiter').expect(403);
});
void test('recruiter sees only their own safe profile', async () => {
  const { body } = await call('get', '/recruiters', 'recruiter').expect(200);
  assert.deepEqual(
    body.map((row) => row.id),
    [ids.recruiterProfile],
  );
  safe(body);
  await call(
    'get',
    `/recruiters/${ids.otherRecruiterProfile}`,
    'recruiter',
  ).expect(404);
});
void test('recruiter can edit contact information but cannot self-assign company membership', async () => {
  const { body } = await call(
    'patch',
    `/recruiters/${ids.recruiterProfile}`,
    'recruiter',
    { jobTitle: 'Hiring Lead' },
  ).expect(200);
  safe(body);
  await call('patch', `/recruiters/${ids.recruiterProfile}`, 'recruiter', {
    companyId: ids.otherCompany,
  }).expect(403);
  await call('post', '/recruiters', 'recruiter', {
    userId: ids.recruiter,
    companyId: ids.company,
    fullName: 'Recruiter',
  }).expect(403);
  await call(
    'delete',
    `/recruiters/${ids.recruiterProfile}`,
    'recruiter',
  ).expect(403);
  assert.equal(writes, 1);
});
void test('students see only open jobs, without nested password hashes', async () => {
  const { body } = await call('get', '/jobs', 'student').expect(200);
  assert.deepEqual(
    body.map((row) => row.id),
    [ids.job, ids.otherJob],
  );
  safe(body);
  await call('get', `/jobs/${ids.draft}`, 'student').expect(404);
});
void test('recruiters see their drafts and open jobs but not other drafts', async () => {
  const { body } = await call('get', '/jobs', 'recruiter').expect(200);
  assert.deepEqual(
    body.map((row) => row.id),
    [ids.job, ids.otherJob, ids.ownDraft],
  );
  safe(body);
  await call('get', `/jobs/${ids.draft}`, 'recruiter').expect(404);
});
const jobCreation = {
  recruiterId: ids.recruiterProfile,
  title: 'New Job',
  description: 'A fixture opportunity',
  type: 'JOB',
};
void test('recruiter can post only as themselves and can change only their own jobs', async () => {
  safe(
    (await call('post', '/jobs', 'recruiter', jobCreation).expect(201)).body,
  );
  await call('post', '/jobs', 'recruiter', {
    ...jobCreation,
    recruiterId: ids.otherRecruiterProfile,
  }).expect(403);
  safe(
    (
      await call('patch', `/jobs/${ids.job}`, 'recruiter', {
        title: 'Updated Title',
      }).expect(200)
    ).body,
  );
  await call('patch', `/jobs/${ids.otherJob}`, 'recruiter', {
    title: 'Not Allowed',
  }).expect(404);
  await call('delete', `/jobs/${ids.otherJob}`, 'recruiter').expect(404);
  assert.equal(writes, 2);
});
void test('students cannot create, modify or delete jobs', async () => {
  await call('post', '/jobs', 'student', jobCreation).expect(403);
  await call('patch', `/jobs/${ids.job}`, 'student', {
    title: 'Not Allowed',
  }).expect(403);
  await call('delete', `/jobs/${ids.job}`, 'student').expect(403);
  assert.equal(writes, 0);
});
void test('admin can view draft jobs and edit another recruiter job', async () => {
  await call('get', `/jobs/${ids.draft}`, 'admin').expect(200);
  await call('patch', `/jobs/${ids.otherJob}`, 'admin', {
    status: 'CLOSED',
  }).expect(200);
});
void test('company administration is admin-only while authenticated reads work', async () => {
  for (const actor of ['student', 'recruiter']) {
    await call('get', '/companies', actor).expect(200);
    await call('post', '/companies', actor, { name: 'Not Allowed' }).expect(
      403,
    );
    await call('patch', `/companies/${ids.company}`, actor, {
      name: 'Not Allowed',
    }).expect(403);
    await call('delete', `/companies/${ids.company}`, actor).expect(403);
  }
  assert.equal(writes, 0);
  await call('patch', `/companies/${ids.company}`, 'admin', {
    name: 'Updated Company',
  }).expect(200);
});
void test('students may check only their own eligibility', async () => {
  await call('post', '/eligibility/check', 'student', {
    studentProfileId: ids.profile,
    jobId: ids.job,
  }).expect(201);
  await call('post', '/eligibility/check', 'student', {
    studentProfileId: ids.otherProfile,
    jobId: ids.job,
  }).expect(404);
});
void test('recruiter eligibility checks require an application to their posted job', async () => {
  await call('post', '/eligibility/check', 'recruiter', {
    studentProfileId: ids.profile,
    jobId: ids.job,
  }).expect(201);
  await call('post', '/eligibility/check', 'recruiter', {
    studentProfileId: ids.otherProfile,
    jobId: ids.job,
  }).expect(404);
  await call('post', '/eligibility/check', 'otherRecruiter', {
    studentProfileId: ids.profile,
    jobId: ids.job,
  }).expect(404);
});
void test('register, login and /auth/me work and registration cannot set a role', async () => {
  const credentials = {
    email: 'new-fixture@example.com',
    password: randomBytes(24).toString('hex'),
  };
  await call('post', '/auth/register', null, {
    ...credentials,
    role: 'ADMIN',
  }).expect(400);
  assert.equal(writes, 0);
  const registered = await call(
    'post',
    '/auth/register',
    null,
    credentials,
  ).expect(201);
  safe(registered.body);
  assert.equal(registered.body.user.role, 'STUDENT');
  const loggedIn = await call('post', '/auth/login', null, credentials).expect(
    201,
  );
  safe(loggedIn.body);
  const me = await call('get', '/auth/me', loggedIn.body.accessToken).expect(
    200,
  );
  assert.equal(me.body.role, 'STUDENT');
  await call('get', '/users', loggedIn.body.accessToken).expect(403);
});

void test('eligibility does not disclose a draft job to a student', async () => {
  await call('post', '/eligibility/check', 'student', {
    studentProfileId: ids.profile,
    jobId: ids.draft,
  }).expect(404);
});

void test('repeated login attempts return 429 with Retry-After, while session reads still work', async () => {
  let limited;
  for (let attempt = 0; attempt <= 20; attempt++) {
    const response = await call('post', '/auth/login', null, {
      email: 'missing@example.invalid',
      password: 'unused-test-input',
    });
    if (response.status === 429) {
      limited = response;
      break;
    }
    assert.equal(response.status, 401);
  }
  assert.ok(limited, 'login must be rate-limited');
  assert.ok(Number(limited.headers['retry-after']) > 0);
  await call('get', '/auth/me', 'admin').expect(200);
  assert.equal(writes, 0);
});
