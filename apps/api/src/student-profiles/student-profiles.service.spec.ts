import { Test } from '@nestjs/testing';
import { StudentProfilesService } from './student-profiles.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '../generated/prisma/enums.js';
import { safeUserSelect } from '../prisma/safe-user.select.js';
describe('StudentProfilesService', () => {
  const prisma = {
    studentProfile: { findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn() },
  };
  const student = {
    userId: 'student',
    email: 'fixture@example.com',
    role: Role.STUDENT,
  };
  let service: StudentProfilesService;
  beforeEach(async () => {
    vi.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        StudentProfilesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(StudentProfilesService);
  });
  it('filters students to their own profile and excludes password hashes', async () => {
    prisma.studentProfile.findMany.mockResolvedValue([]);
    await service.findAll(student);
    expect(prisma.studentProfile.findMany).toHaveBeenCalledWith({
      where: { userId: 'student' },
      include: { user: { select: safeUserSelect } },
      orderBy: { createdAt: 'desc' },
    });
  });
  it('does not update a profile outside the student scope', async () => {
    prisma.studentProfile.findFirst.mockResolvedValue(null);
    await expect(
      service.update('other', { fullName: 'Changed' }, student),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.studentProfile.update).not.toHaveBeenCalled();
  });
  it('rejects creation on behalf of another user before any database lookup', async () => {
    await expect(
      service.create(
        {
          userId: 'other',
          fullName: 'Other',
          collegeRollNumber: 'R1',
          branch: 'CS',
          graduationYear: 2027,
        },
        student,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
