import { ConflictException, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { Role } from '../generated/prisma/enums.js';

describe('administrator safety', () => {
  const actor = {
    userId: 'actor',
    role: Role.ADMIN,
    email: 'actor@example.invalid',
  };
  function setup(adminCount = 2, actorRole: Role = Role.ADMIN) {
    const tx = {
      user: {
        findUnique: vi.fn().mockImplementation(({ where }) =>
          Promise.resolve({
            role: where.id === 'actor' ? actorRole : Role.ADMIN,
          }),
        ),
        count: vi.fn().mockResolvedValue(adminCount),
        update: vi.fn().mockResolvedValue({ id: 'target', role: Role.STUDENT }),
        delete: vi.fn().mockResolvedValue({ id: 'target' }),
      },
    };
    const prisma = {
      $transaction: vi.fn().mockImplementation((callback) => callback(tx)),
    };
    return {
      tx,
      prisma,
      service: new UsersService(prisma as unknown as PrismaService),
    };
  }
  it('rejects self-demotion and self-deletion before database writes', async () => {
    const { service, prisma } = setup();
    await expect(
      service.update('actor', { role: Role.STUDENT }, actor),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.remove('actor', actor)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('checks the current actor role again within the transaction', async () => {
    const { service, tx } = setup(2, Role.STUDENT);
    await expect(
      service.update('target', { role: Role.STUDENT }, actor),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.user.update).not.toHaveBeenCalled();
  });
  it('protects the last administrator from removal and demotion', async () => {
    const { service, tx } = setup(1);
    await expect(
      service.update('target', { role: Role.STUDENT }, actor),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(service.remove('target', actor)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.user.delete).not.toHaveBeenCalled();
  });
  it('allows another administrator to manage users within a serializable transaction', async () => {
    const { service, prisma, tx } = setup();
    await service.update('target', { role: Role.STUDENT }, actor);
    await service.remove('target', actor);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
    expect(tx.user.count).toHaveBeenCalledWith({ where: { role: Role.ADMIN } });
    expect(tx.user.delete).toHaveBeenCalled();
  });
  it('reports concurrent access changes as a recoverable conflict', async () => {
    const { service, prisma } = setup();
    prisma.$transaction.mockRejectedValue({ code: 'P2034' });
    await expect(
      service.update('target', { role: Role.STUDENT }, actor),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
