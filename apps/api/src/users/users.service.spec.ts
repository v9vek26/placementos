import { Test } from '@nestjs/testing';
import { UsersService } from './users.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { safeUserSelect } from '../prisma/safe-user.select.js';
import { ConflictException, NotFoundException } from '@nestjs/common';
describe('UsersService', () => {
  const prisma = {
    user: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  };
  let service: UsersService;
  beforeEach(async () => {
    vi.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(UsersService);
  });
  it('only selects safe identity fields when listing users', async () => {
    prisma.user.findMany.mockResolvedValue([]);
    await expect(service.findAll()).resolves.toEqual([]);
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      select: safeUserSelect,
      orderBy: { createdAt: 'desc' },
    });
    expect(safeUserSelect).not.toHaveProperty('passwordHash');
  });
  it('returns 404 for an absent user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
  it('reports a duplicate email as a conflict', async () => {
    prisma.user.create.mockRejectedValue({ code: 'P2002' });
    await expect(
      service.create({ email: 'fixture@example.com' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
