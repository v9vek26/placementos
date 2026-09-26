import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { after, before, beforeEach, test } from 'node:test';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { ApplicationsModule } from '../dist/applications/applications.module.js';
import { PrismaModule } from '../dist/prisma/prisma.module.js';
import { PrismaService } from '../dist/prisma/prisma.service.js';
import { EligibilityService } from '../dist/eligibility/eligibility.service.js';
import { Roles } from '../dist/auth/roles.decorator.js';
import { RolesGuard } from '../dist/auth/roles.guard.js';

// Real module wiring, controller, guards, JWT strategy and application service.
// Only persistence and eligibility are fixtures. Never loads .env or real data.
const ids = {
  application: '10000000-0000-4000-8000-000000000001',
  other: '10000000-0000-4000-8000-000000000002',
  profile: '20000000-0000-4000-8000-000000000001',
  otherProfile: '20000000-0000-4000-8000-000000000002',
  job: '30000000-0000-4000-8000-000000000001',
};
let app;
let rows;
let duplicate;
let concurrentDuplicate;
let eligible;
let noProfile;
let writes;
const secret = randomBytes(32).toString('hex');
const jwt = new JwtService({ secret });
const sign = (role, sub = role.toLowerCase(), options = {}) =>
  jwt.sign(
    { sub, email: 'fixture@example.com', role },
    { expiresIn: '1m', ...options },
  );
const tokens = Object.fromEntries(
  ['STUDENT', 'RECRUITER', 'ADMIN'].map((role) => [role, sign(role)]),
);
const matches = (row, where) =>
  (!where.id || row.id === where.id) &&
  (!where.studentProfile ||
    row.studentProfile.userId === where.studentProfile.userId) &&
  (!where.job || row.job.recruiter.userId === where.job.recruiter.userId);
const prisma = {
  $transaction: async (callback) => callback(prisma),
  $queryRaw: async (query, ...values) => {
    if (query.join('').includes('StudentProfile')) {
      return !noProfile && values[0] === ids.profile && values[1] === 'student'
        ? [{ id: ids.profile }]
        : [];
    }
    return [{ id: ids.job }];
  },
  user: {
    findUnique: async ({ where }) => {
      const role = {
        student: 'STUDENT',
        recruiter: 'RECRUITER',
        admin: 'ADMIN',
      }[where.id];
      return role ? { id: where.id, email: 'fixture@example.com', role } : null;
    },
  },
  studentProfile: {
    findUnique: async ({ where }) =>
      noProfile
        ? null
        : { id: where.userId === 'student' ? ids.profile : ids.otherProfile },
  },
  application: {
    findMany: async ({ where }) => rows.filter((row) => matches(row, where)),
    findFirst: async ({ where }) =>
      rows.find((row) => matches(row, where)) ?? null,
    findUnique: async () => (duplicate ? rows[0] : null),
    create: async ({ data }) => {
      if (concurrentDuplicate) throw { code: 'P2002' };
      writes++;
      return { id: ids.application, ...data };
    },
    update: async ({ where, data }) => {
      assert.deepEqual(where, {
        job: { recruiter: { userId: 'recruiter' } },
        id: ids.application,
      });
      writes++;
      return { ...rows.find((row) => matches(row, where)), ...data };
    },
  },
};
before(async () => {
  const fixture = await Test.createTestingModule({
    imports: [PrismaModule, ApplicationsModule],
  })
    .overrideProvider(ConfigService)
    .useValue(new ConfigService({ JWT_SECRET: secret }))
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .overrideProvider(EligibilityService)
    .useValue({
      check: async () => ({ eligible, reasons: ['fixture eligibility'] }),
    })
    .compile();
  app = fixture.createNestApplication();
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
  duplicate = false;
  concurrentDuplicate = false;
  eligible = true;
  noProfile = false;
  rows = [
    {
      id: ids.application,
      studentProfile: { userId: 'student' },
      job: { recruiter: { userId: 'recruiter' } },
      status: 'APPLIED',
    },
    {
      id: ids.other,
      studentProfile: { userId: 'other-student' },
      job: { recruiter: { userId: 'other-recruiter' } },
      status: 'APPLIED',
    },
  ];
});
const call = (method, path, role, body) => {
  let req = request(app.getHttpServer())[method](path);
  if (role) req = req.auth(tokens[role] ?? role, { type: 'bearer' });
  if (body) req = req.send(body);
  return req;
};
const creation = { studentProfileId: ids.profile, jobId: ids.job };
void test('a duplicate inserted after the precheck returns 409, not 500', async () => {
  concurrentDuplicate = true;
  await call('post', '/applications', 'STUDENT', creation).expect(409);
  assert.equal(writes, 0);
});
/** @type {Array<[string, string, object?]>} */
const routes = [
  ['post', '/applications', creation],
  ['get', '/applications'],
  ['get', `/applications/${ids.application}`],
  [
    'patch',
    `/applications/${ids.application}/status`,
    { status: 'SHORTLISTED' },
  ],
];
for (const [method, path, body] of routes) {
  void test(`${method.toUpperCase()} ${path}: anonymous returns 401`, async () => {
    await call(method, path, null, body).expect(401);
    assert.equal(writes, 0);
  });
}
void test('malformed, expired and wrong-signature tokens return 401', async () => {
  for (const token of [
    'invalid',
    sign('STUDENT', 'student', { expiresIn: -1 }),
    new JwtService({ secret: randomBytes(32).toString('hex') }).sign({
      role: 'ADMIN',
      sub: 'admin',
    }),
  ]) {
    await call('get', '/applications', token).expect(401);
  }
});
void test('unknown and missing roles cannot access applications', async () => {
  await call('get', '/applications', sign('UNKNOWN')).expect(401);
  await call(
    'get',
    '/applications',
    jwt.sign({ sub: 'student', email: 'fixture@example.com' }),
  ).expect(401);
});
for (const role of ['STUDENT', 'RECRUITER', 'ADMIN']) {
  void test(`${role} can list visible applications`, async () => {
    const { body } = await call('get', '/applications', role).expect(200);
    assert.deepEqual(
      body.map((row) => row.id),
      role === 'ADMIN' ? [ids.application, ids.other] : [ids.application],
    );
  });
  void test(`${role} can read an accessible application`, async () => {
    await call('get', `/applications/${ids.application}`, role).expect(200);
  });
}
for (const role of ['STUDENT', 'RECRUITER']) {
  void test(`${role} cannot read someone else's application`, async () => {
    await call('get', `/applications/${ids.other}`, role).expect(404);
  });
}
void test('student creates an application for their own profile', async () => {
  const { body } = await call(
    'post',
    '/applications',
    'STUDENT',
    creation,
  ).expect(201);
  assert.equal(body.studentProfileId, ids.profile);
  assert.equal(writes, 1);
});
void test('student cannot supply another profile or apply without a profile', async () => {
  await call('post', '/applications', 'STUDENT', {
    ...creation,
    studentProfileId: ids.otherProfile,
  }).expect(403);
  noProfile = true;
  await call('post', '/applications', 'STUDENT', creation).expect(403);
  assert.equal(writes, 0);
});
for (const role of ['RECRUITER', 'ADMIN']) {
  void test(`${role} cannot create student applications`, async () => {
    await call('post', '/applications', role, creation).expect(403);
    assert.equal(writes, 0);
  });
}
void test('student cannot change status', async () => {
  await call('patch', `/applications/${ids.application}/status`, 'STUDENT', {
    status: 'SELECTED',
  }).expect(403);
  assert.equal(writes, 0);
});
void test('recruiter can change status for their posted job', async () => {
  await call('patch', `/applications/${ids.application}/status`, 'RECRUITER', {
    status: 'SHORTLISTED',
  }).expect(200);
  assert.equal(writes, 1);
});
void test('recruiter cannot change another recruiter application', async () => {
  await call('patch', `/applications/${ids.other}/status`, 'RECRUITER', {
    status: 'SELECTED',
  }).expect(404);
  assert.equal(writes, 0);
});
void test('admin can change status across ownership boundaries', async () => {
  const previous = prisma.application.update;
  prisma.application.update = async ({ where, data }) => {
    assert.deepEqual(where, { id: ids.other });
    writes++;
    return { ...rows[1], ...data };
  };
  try {
    await call('patch', `/applications/${ids.other}/status`, 'ADMIN', {
      status: 'SELECTED',
    }).expect(200);
    assert.equal(writes, 1);
  } finally {
    prisma.application.update = previous;
  }
});
void test('validation, eligibility and duplicate behavior are preserved', async () => {
  await call('get', '/applications/not-a-uuid', 'ADMIN').expect(400);
  await call('post', '/applications', 'STUDENT', {
    ...creation,
    role: 'ADMIN',
  }).expect(400);
  await call('patch', `/applications/${ids.application}/status`, 'ADMIN', {
    status: 'INVALID',
  }).expect(400);
  eligible = false;
  await call('post', '/applications', 'STUDENT', creation).expect(400);
  eligible = true;
  duplicate = true;
  await call('post', '/applications', 'STUDENT', creation).expect(409);
  assert.equal(writes, 0);
});
void test('reusable guard: default, class metadata, method override and missing identity', () => {
  const guard = new RolesGuard(new Reflector());
  class Controller {}
  const handler = () => {};
  let user = { role: 'STUDENT' };
  const context = {
    getHandler: () => handler,
    getClass: () => Controller,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  };
  assert.equal(guard.canActivate(context), true);
  Roles('ADMIN')(Controller);
  assert.equal(guard.canActivate(context), false);
  Roles('STUDENT')(handler);
  assert.equal(guard.canActivate(context), true);
  user = undefined;
  assert.equal(guard.canActivate(context), false);
  Roles()(handler);
  user = { role: 'STUDENT' };
  assert.equal(guard.canActivate(context), false);
});

void test('a signed token without a subject cannot broaden ownership queries', async () => {
  const token = jwt.sign({ email: 'fixture@example.com', role: 'STUDENT' });
  await call('get', '/applications', token).expect(401);
  await call('post', '/applications', token, creation).expect(401);
  assert.equal(writes, 0);
});
