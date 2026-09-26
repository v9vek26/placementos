import { Test } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { PrismaService } from './prisma/prisma.service.js';
import { ServiceUnavailableException } from '@nestjs/common';
describe('AppController', () => {
  it('returns a sanitized unavailable error when PostgreSQL is down', async () => {
    const prisma = {
      $queryRaw: vi
        .fn()
        .mockRejectedValue(new Error('internal connection details')),
    };
    const controller = new AppController(prisma as unknown as PrismaService);
    await expect(controller.getHealth()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(controller.getHealth()).rejects.toThrow(
      'Database is unavailable.',
    );
  });
  it('checks database connectivity without exposing account counts', async () => {
    const query = vi.fn().mockResolvedValue([{ '?column?': 1 }]);
    const module = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: PrismaService, useValue: { $queryRaw: query } }],
    }).compile();
    await expect(module.get(AppController).getHealth()).resolves.toEqual({
      status: 'ok',
      database: 'connected',
    });
    expect(query).toHaveBeenCalledOnce();
    await module.close();
  });
});
