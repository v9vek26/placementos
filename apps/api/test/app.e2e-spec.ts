import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import request from 'supertest';
import type { Server } from 'node:http';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
describe('AppModule (e2e)', () => {
  let app: INestApplication<Server>;
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({ user: { count: async () => 0 } })
      .overrideProvider(ConfigService)
      .useValue(
        new ConfigService({ JWT_SECRET: randomBytes(32).toString('hex') }),
      )
      .compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    if (app) await app.close();
  });
  it('returns the current health JSON contract', async () => {
    await request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect({ status: 'ok', database: 'connected', users: 0 });
  });
  it.each([
    '/users',
    '/student-profiles',
    '/recruiters',
    '/jobs',
    '/companies',
    '/applications',
    '/auth/me',
  ])('protects %s from anonymous reads', async (url) => {
    await request(app.getHttpServer()).get(url).expect(401);
  });
});
