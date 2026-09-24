import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';

// Read-only integration check. Uses only GET requests and Prisma findFirst.
// A temporary signing key is scoped to this isolated process; no existing
// credentials or tokens are used or printed, and no records are written.
process.env.JWT_SECRET = randomBytes(32).toString('hex');
const { AppModule } = await import('../dist/app.module.js');
const { PrismaService } = await import('../dist/prisma/prisma.service.js');
const module = await Test.createTestingModule({
  imports: [AppModule],
}).compile();
const app = module.createNestApplication();
await app.init();
let checked = 0;
const rolesChecked = [];
try {
  const prisma = module.get(PrismaService);
  const jwt = module.get(JwtService);
  const paths = [
    '/users',
    '/student-profiles',
    '/recruiters',
    '/jobs',
    '/companies',
    '/applications',
  ];
  for (const route of paths) {
    await request(app.getHttpServer()).get(route).expect(401);
    checked++;
  }
  const missing = await jwt.signAsync(
    { sub: randomUUID(), email: 'missing@example.com', role: 'STUDENT' },
    { expiresIn: '1m' },
  );
  await request(app.getHttpServer())
    .get('/auth/me')
    .auth(missing, { type: 'bearer' })
    .expect(401);
  checked++;
  for (const role of ['STUDENT', 'RECRUITER', 'ADMIN']) {
    const user = await prisma.user.findFirst({
      where: { role },
      select: { id: true },
    });
    if (!user) continue;
    rolesChecked.push(role);
    const token = await jwt.signAsync(
      { sub: user.id, email: 'isolated-check@example.com', role },
      { expiresIn: '1m' },
    );
    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .auth(token, { type: 'bearer' })
      .expect(200);
    assert.equal(me.body.role, role);
    checked++;
    for (const route of paths) {
      const forbidden =
        (route === '/users' && role !== 'ADMIN') ||
        (route === '/student-profiles' && role === 'RECRUITER') ||
        (route === '/recruiters' && role === 'STUDENT');
      const response = await request(app.getHttpServer())
        .get(route)
        .auth(token, { type: 'bearer' })
        .expect(forbidden ? 403 : 200);
      assert.ok(
        !JSON.stringify(response.body).includes('passwordHash'),
        'Responses must not contain passwordHash',
      );
      checked++;
    }
  }
  console.log(
    `PASS: ${checked} read-only HTTP/database checks. Existing roles exercised: ${rolesChecked.join(', ') || 'none'}. No database writes or credential output.`,
  );
} finally {
  await app.close();
}
