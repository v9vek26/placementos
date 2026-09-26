import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service.js';
import { EligibilityService } from '../eligibility/eligibility.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { Role } from '../generated/prisma/enums.js';

describe('application submission transaction', () => {
  const actor = {
    userId: 'student',
    role: Role.STUDENT,
    email: 'fixture@example.invalid',
  };
  const data = { studentProfileId: 'profile', jobId: 'job' };
  function setup() {
    const events: string[] = [];
    const database = {
      $queryRaw: vi.fn().mockImplementation((query: TemplateStringsArray) => {
        const profile = query.join('').includes('StudentProfile');
        events.push(profile ? 'profile-lock' : 'job-lock');
        return Promise.resolve([{ id: profile ? 'profile' : 'job' }]);
      }),
      studentProfile: {
        findFirst: vi.fn().mockImplementation(() => {
          events.push('profile-read');
          return Promise.resolve({
            id: 'profile',
            fullName: 'Fixture',
            branch: 'CSE',
            cgpa: 8,
            activeBacklogs: 0,
            tenthPercentage: 80,
            twelfthPercentage: 80,
            graduationYear: 2027,
          });
        }),
      },
      job: {
        findUnique: vi.fn().mockImplementation(() => {
          events.push('job-read');
          return Promise.resolve({
            id: 'job',
            title: 'Fixture',
            company: { name: 'Fixture' },
            status: 'OPEN',
            applicationDeadline: null,
            minCgpa: 7,
            maxActiveBacklogs: 0,
            minTenthPercentage: null,
            minTwelfthPercentage: null,
            eligibleBranches: [],
            graduationYears: [],
          });
        }),
      },
      application: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(() => {
          events.push('insert');
          return Promise.resolve({ id: 'application', ...data });
        }),
      },
    };
    // Root client deliberately has no model delegates. Any read outside the
    // transaction will fail this test instead of silently using the fixture.
    const prisma = {
      $transaction: vi.fn().mockImplementation(async (callback) => {
        const result: unknown = await callback(database);
        events.push('commit');
        return result;
      }),
    };
    const client = prisma as unknown as PrismaService;
    return {
      database,
      prisma,
      events,
      service: new ApplicationsService(client, new EligibilityService(client)),
    };
  }
  it('locks both inputs before checking eligibility and inserting on the same connection', async () => {
    const { service, events, database, prisma } = setup();
    await expect(service.create(data, actor)).resolves.toMatchObject({
      id: 'application',
    });
    expect(events).toEqual([
      'profile-lock',
      'job-lock',
      'profile-read',
      'job-read',
      'insert',
      'commit',
    ]);
    expect(database.$queryRaw.mock.calls[0].slice(1)).toEqual([
      'profile',
      'student',
    ]);
    expect(database.$queryRaw.mock.calls[1].slice(1)).toEqual(['job']);
    for (const [query] of database.$queryRaw.mock.calls)
      expect(query.join('')).toContain('FOR SHARE');
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'ReadCommitted',
      maxWait: 5000,
      timeout: 10000,
    });
  });
  it('does not lock a job or write when the profile is absent or belongs to someone else', async () => {
    const { service, database } = setup();
    database.$queryRaw.mockResolvedValueOnce([]);
    await expect(service.create(data, actor)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(database.$queryRaw).toHaveBeenCalledTimes(1);
    expect(database.application.create).not.toHaveBeenCalled();
  });
  it.each(['CLOSED', 'DRAFT'])(
    'does not insert when the locked job is %s',
    async (status) => {
      const { service, database, events } = setup();
      const job = await database.job.findUnique();
      database.job.findUnique.mockResolvedValueOnce({ ...job, status });
      await expect(service.create(data, actor)).rejects.toThrow();
      expect(database.application.create).not.toHaveBeenCalled();
      expect(events).not.toContain('commit');
    },
  );
  it('uses the latest locked academic record and rejects newly ineligible students', async () => {
    const { service, database } = setup();
    const profile = await database.studentProfile.findFirst();
    database.studentProfile.findFirst.mockResolvedValueOnce({
      ...profile,
      cgpa: 4,
    });
    await expect(service.create(data, actor)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(database.application.create).not.toHaveBeenCalled();
  });
  it('retains duplicate protection inside the transaction', async () => {
    const { service, database } = setup();
    database.application.findUnique.mockResolvedValueOnce({ id: 'existing' });
    await expect(service.create(data, actor)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(database.application.create).not.toHaveBeenCalled();
  });
  it.each(['P2002', 'P2034', 'P2028'])(
    'returns a recoverable conflict for %s',
    async (code) => {
      const { service, prisma } = setup();
      prisma.$transaction.mockRejectedValueOnce({ code });
      await expect(service.create(data, actor)).rejects.toBeInstanceOf(
        ConflictException,
      );
    },
  );
  it('preserves unexpected errors and denies non-students before a transaction', async () => {
    const { service, prisma } = setup();
    await expect(
      service.create(data, { ...actor, role: Role.ADMIN }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    const error = new Error('Unexpected failure');
    prisma.$transaction.mockRejectedValueOnce(error);
    await expect(service.create(data, actor)).rejects.toBe(error);
  });
});
